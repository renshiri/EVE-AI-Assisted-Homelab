#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import time
from typing import Optional, Any
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import httpx
from neo4j import GraphDatabase

load_dotenv(dotenv_path="/home/renshiri/services/eve_server/.env", override=True)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

# ── WAHA Config ────────────────────────────────────────────────────────────────
GATEWAY_URL  = os.getenv("WAHA_GATEWAY_URL", "http://100.81.234.37:3000/api")
SESSION_NAME = os.getenv("WAHA_SESSION",     "default")
API_KEY      = os.getenv("WAHA_API_KEY",     "")
HEADERS      = {"X-Api-Key": API_KEY} if API_KEY else {}

# ── Neo4j Config ───────────────────────────────────────────────────────────────
NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

try:
    neo4j_driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
        max_connection_lifetime=300,
        max_connection_pool_size=10
    )
    print("[WhatsApp] Neo4j-Verbindung hergestellt.", flush=True)
except Exception as e:
    print(f"[WhatsApp] Neo4j-Verbindung fehlgeschlagen: {e}", flush=True)
    neo4j_driver = None


# ── Neo4j Helpers ──────────────────────────────────────────────────────────────

def init_whatsapp_indexes():
    """Erstellt Neo4j-Indizes für WhatsApp-Nodes beim Start."""
    if not neo4j_driver:
        return
    queries = [
        "CREATE INDEX wa_chat_id_idx IF NOT EXISTS FOR (c:WhatsAppChat) ON (c.chat_id);",
        "CREATE INDEX wa_msg_id_idx  IF NOT EXISTS FOR (m:WhatsAppMessage) ON (m.msg_id);",
        "CREATE INDEX wa_contact_idx IF NOT EXISTS FOR (ct:WhatsAppContact) ON (ct.phone_id);",
    ]
    try:
        with neo4j_driver.session() as session:
            for q in queries:
                session.run(q)
        print("[WhatsApp] Neo4j-Indizes verifiziert.", flush=True)
    except Exception as e:
        print(f"[WhatsApp] Index-Fehler: {e}", flush=True)


def save_message_to_neo4j(
    chat_id:   str,
    chat_name: str,
    msg_id:    str,
    body:      str,
    from_me:   bool,
    timestamp: int,
    sender_id: str = "",
    msg_type:  str = "text",
    media_url: str = "",
):
    """Speichert eine Nachricht als Graph-Node in Neo4j."""
    if not neo4j_driver:
        return

    query = """
    MERGE (chat:WhatsAppChat {chat_id: $chat_id})
      ON CREATE SET chat.name = $chat_name, chat.created_at = datetime()
      ON MATCH  SET chat.name = CASE WHEN $chat_name <> '' THEN $chat_name ELSE chat.name END

    MERGE (msg:WhatsAppMessage {msg_id: $msg_id})
      ON CREATE SET
        msg.body      = $body,
        msg.from_me   = $from_me,
        msg.timestamp = $timestamp,
        msg.type      = $msg_type,
        msg.sender_id = $sender_id,
        msg.media_url = $media_url,
        msg.saved_at  = datetime()

    MERGE (msg)-[:IN_CHAT]->(chat)
    """
    try:
        with neo4j_driver.session() as session:
            session.run(query,
                chat_id=chat_id, chat_name=chat_name,
                msg_id=msg_id, body=body, from_me=from_me,
                timestamp=timestamp, msg_type=msg_type, 
                sender_id=sender_id, media_url=media_url
            )
    except Exception as e:
        print(f"[WhatsApp Neo4j] Fehler beim Speichern der Nachricht: {e}", flush=True)


def get_chats_from_neo4j() -> list:
    """Gibt alle bekannten Chats zurück und gleicht sie mit der Kontaktliste ab."""
    if not neo4j_driver:
        return []
        
    # Bessere Query: Verhindert Abstürze bei neu erstellten, noch leeren Chats
    query = """
    MATCH (chat:WhatsAppChat)
    OPTIONAL MATCH (msg:WhatsAppMessage)-[:IN_CHAT]->(chat)
    WITH chat, msg ORDER BY msg.timestamp DESC
    WITH chat, collect(msg)[0] AS last_msg
    OPTIONAL MATCH (c:Contact)
    WHERE c.phone = chat.chat_id 
       OR replace(c.phone, '@c.us', '') = replace(chat.chat_id, '@c.us', '')
    RETURN
        chat.chat_id  AS id,
        coalesce(c.name, chat.name, chat.chat_id) AS name,
        coalesce(last_msg.body, '') AS last_body,
        coalesce(last_msg.timestamp, 0) AS last_ts
    ORDER BY last_ts DESC
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query)
            chats = []
            for r in records:
                chats.append({
                    "id":   r["id"],
                    "name": r["name"] or r["id"],
                    "lastMessage": {
                        "body":      r["last_body"],
                        "timestamp": r["last_ts"],
                    }
                })
            return chats
    except Exception as e:
        print(f"[WhatsApp Neo4j] Fehler beim Laden der Chats: {e}", flush=True)
        return []


def get_messages_from_neo4j(chat_id: str, limit: int = 50) -> list:
    """Gibt die letzten N Nachrichten eines Chats zurück."""
    if not neo4j_driver:
        return []
    query = """
    MATCH (msg:WhatsAppMessage)-[:IN_CHAT]->(chat:WhatsAppChat {chat_id: $chat_id})
    RETURN
        msg.msg_id    AS id,
        msg.body      AS body,
        msg.from_me   AS fromMe,
        msg.timestamp AS timestamp,
        msg.type      AS type,
        msg.sender_id AS sender_id,
        msg.media_url AS mediaUrl
    ORDER BY msg.timestamp ASC
    LIMIT $limit
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query, chat_id=chat_id, limit=limit)
            return [dict(r) for r in records]
    except Exception as e:
        print(f"[WhatsApp Neo4j] Fehler beim Laden der Nachrichten: {e}", flush=True)
        return []


# ── Pydantic Models ────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    chatId: str
    text: str

class SendMediaRequest(BaseModel):
    chatId: str
    fileUrl: str
    caption: Optional[str] = ""
    filename: Optional[str] = "file"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.on_event("startup")
async def startup():
    init_whatsapp_indexes()


@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    """
    Empfängt eingehende WAHA-Events und speichert Nachrichten in Neo4j.
    """
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored", "reason": "invalid json"}

    event = payload.get("event", "")

    # Nur Nachrichten-Events verarbeiten
    if event not in ("message", "message.any"):
        return {"status": "ignored", "event": event}

    data    = payload.get("payload", {})
    msg_id  = data.get("id", "")
    body    = data.get("body", "") or data.get("text", "")
    from_me = data.get("fromMe", False)
    ts      = data.get("timestamp", 0)
    m_type  = data.get("type", "text")

    # Medien-URL extrahieren
    has_media = data.get("hasMedia", False)
    media_url = ""
    if has_media or m_type in ["image", "video", "document"]:
        media_url = data.get("mediaUrl", data.get("media", {}).get("url", body if body.startswith("http") else ""))

    # Chat-ID und Name extrahieren
    raw_chat = data.get("chatId") or data.get("from", "")
    if isinstance(raw_chat, dict):
        chat_id = raw_chat.get("_serialized", "") or raw_chat.get("id", "")
    else:
        chat_id = str(raw_chat)

    chat_name = data.get("_data", {}).get("notifyName", "") or chat_id.split("@")[0]

    sender_id = ""
    raw_sender = data.get("sender") or data.get("from", "")
    if isinstance(raw_sender, dict):
        sender_id = raw_sender.get("id", "") or raw_sender.get("_serialized", "")
    else:
        sender_id = str(raw_sender)

    if not chat_id or not msg_id:
        return {"status": "ignored", "reason": "missing chat_id or msg_id"}

    save_message_to_neo4j(
        chat_id=chat_id, chat_name=chat_name,
        msg_id=msg_id, body=body, from_me=from_me,
        timestamp=ts, sender_id=sender_id, msg_type=m_type,
        media_url=media_url
    )

    print(f"[WhatsApp Webhook] Nachricht gespeichert: {chat_id} | Type: {m_type}", flush=True)
    return {"status": "ok"}


@router.get("/status")
async def get_session_status():
    """Prüft den Live-Status der WAHA-Session."""
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            res = await client.get(f"{GATEWAY_URL}/sessions/{SESSION_NAME}", timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                return {"status": "success", "sessionState": data.get("status", "UNKNOWN")}
    except Exception as e:
        print(f"[WhatsApp Status] Fehler: {e}", flush=True)
    return {"status": "error", "sessionState": "UNREACHABLE"}


@router.get("/chats")
async def get_chats():
    """Gibt alle Chats aus Neo4j zurück + aktuellen Session-Status."""
    session_state = "UNKNOWN"
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            res = await client.get(f"{GATEWAY_URL}/sessions/{SESSION_NAME}", timeout=5.0)
            if res.status_code == 200:
                session_state = res.json().get("status", "UNKNOWN")
    except Exception as e:
        print(f"[WhatsApp] Status-Check Fehler: {e}", flush=True)
        session_state = "UNREACHABLE"

    chats = get_chats_from_neo4j()
    return {"chats": chats, "sessionState": session_state}


@router.get("/messages/{chat_id:path}")
async def get_messages(chat_id: str):
    """Gibt Nachrichten eines Chats aus Neo4j zurück."""
    messages = get_messages_from_neo4j(chat_id, limit=50)
    return {"messages": messages}


@router.post("/send")
async def send_message(req: SendMessageRequest):
    """Sendet eine Textnachricht über WAHA und speichert sie in Neo4j."""
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            res = await client.post(
                f"{GATEWAY_URL}/sendText",
                json={"session": SESSION_NAME, "chatId": req.chatId, "text": req.text},
                timeout=10.0
            )
            if res.status_code in [200, 201]:
                data = res.json()
                msg_id = data.get("id", f"sent_{req.chatId}_{int(time.time())}")
                if isinstance(msg_id, dict):
                    msg_id = msg_id.get("_serialized", str(msg_id))

                save_message_to_neo4j(
                    chat_id=req.chatId, chat_name="",
                    msg_id=str(msg_id), body=req.text, from_me=True,
                    timestamp=int(time.time())
                )
                return {"status": "success", "data": data}
            print(f"[WhatsApp Send] HTTP {res.status_code}: {res.text}", flush=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "failed"}


@router.post("/send-image")
async def send_image(req: SendMediaRequest):
    """Sendet ein Bild über WAHA und speichert es sofort lokal."""
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            res = await client.post(
                f"{GATEWAY_URL}/sendImage",
                json={
                    "session": SESSION_NAME,
                    "chatId": req.chatId,
                    "file": {"url": req.fileUrl},
                    "caption": req.caption or ""
                },
                timeout=15.0
            )
            if res.status_code in [200, 201]:
                data = res.json()
                msg_id = data.get("id", f"sent_img_{req.chatId}_{int(time.time())}")
                if isinstance(msg_id, dict):
                    msg_id = msg_id.get("_serialized", str(msg_id))

                # NEU: Das gesendete Bild sofort ins Neo4j speichern!
                save_message_to_neo4j(
                    chat_id=req.chatId, chat_name="",
                    msg_id=str(msg_id), body=req.caption or "🖼️ Bild gesendet", from_me=True,
                    timestamp=int(time.time()),
                    msg_type="image",
                    media_url=req.fileUrl
                )
                return {"status": "success", "data": data}
            print(f"[WhatsApp Image] HTTP {res.status_code}: {res.text}", flush=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "failed"}


@router.post("/send-file")
async def send_file(req: SendMediaRequest):
    """Sendet eine Datei über WAHA und speichert sie sofort lokal."""
    try:
        async with httpx.AsyncClient(headers=HEADERS) as client:
            res = await client.post(
                f"{GATEWAY_URL}/sendFile",
                json={
                    "session": SESSION_NAME,
                    "chatId": req.chatId,
                    "file": {"url": req.fileUrl, "filename": req.filename or "file"},
                    "caption": req.caption or ""
                },
                timeout=20.0
            )
            if res.status_code in [200, 201]:
                data = res.json()
                msg_id = data.get("id", f"sent_file_{req.chatId}_{int(time.time())}")
                if isinstance(msg_id, dict):
                    msg_id = msg_id.get("_serialized", str(msg_id))

                # NEU: Die gesendete Datei sofort ins Neo4j speichern!
                save_message_to_neo4j(
                    chat_id=req.chatId, chat_name="",
                    msg_id=str(msg_id), body=req.filename or "📄 Datei gesendet", from_me=True,
                    timestamp=int(time.time()),
                    msg_type="document",
                    media_url=req.fileUrl
                )
                return {"status": "success", "data": data}
            print(f"[WhatsApp File] HTTP {res.status_code}: {res.text}", flush=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "failed"}