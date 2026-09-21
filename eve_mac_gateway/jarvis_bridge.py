#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
=============================================================================
         EVE CLIENT: JARVIS_BRIDGE.PY (DYNAMIC GRAPH-DRIVEN VOICE BRIDGE)
=============================================================================
"""

import os
import sys
import time
import json
import queue
import threading
import requests
import re
import traceback
import subprocess
from typing import Optional, Dict, List, Any, Tuple
from neo4j import GraphDatabase

print("=== SYSTEM-CHECK STARTET, SIR ===")
print("[System] Verwende native macOS 'say' Engine für minimale Latenz.")

# ==========================================
# 1. KONFIGURATION & SCHNITTSTELLEN
# ==========================================
TAILSCALE_NODE_IP = os.getenv("EVE_NODE_IP", "127.0.0.1")

OLLAMA_LOCAL = os.getenv("OLLAMA_URL", "http://localhost:11434")
NODE_SERVER = os.getenv("NODE_SERVER_URL", f"http://{TAILSCALE_NODE_IP}:5000")

NEO4J_URI = os.getenv("NEO4J_URI", f"bolt://{TAILSCALE_NODE_IP}:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "your-secure-password")

SPEECH_RATE = os.getenv("SPEECH_RATE", "165")

# Connection Pooling für HTTP-Anfragen (Keep-Alive)
http_session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=20)
http_session.mount("http://", adapter)
http_session.mount("https://", adapter)

# Neo4j Driver
try:
    neo4j_driver = GraphDatabase.driver(
        NEO4J_URI, 
        auth=(NEO4J_USER, NEO4J_PASSWORD),
        max_connection_lifetime=300,
        max_connection_pool_size=10
    )
    neo4j_driver.verify_connectivity()
    print("[System] Verbindung zu Neo4j hergestellt.")
except Exception as e:
    print(f"[Neo4j-Warning] Driver konnte nicht verifiziert werden: {e}")
    neo4j_driver = None

# ==========================================
# SDUI TRIGGER HELPER (DASHBOARD-STEUERUNG)
# ==========================================
def trigger_sdui_scene_switch(scene_name: str) -> None:
    # Deaktiviert: Jedes Gerät bleibt auf seiner eigenen lokalen UI-Szene
    return

# ==========================================
# 2. DYNAMIC GRAPH CONFIGURATION (IN-MEMORY CACHE)
# ==========================================
class DynamicGraphBrain:
    """
    Lädt alle Intents, Persona-Regeln, Trigger-Keywords, Füllwörter, Prompts
    und Phonetik-Regeln einmalig beim Start aus Neo4j in den RAM für 0ms Overhead.
    """
    def __init__(self, driver):
        self.driver = driver
        self.intents: Dict[str, Dict[str, Any]] = {}
        self.prompts: Dict[str, str] = {}
        self.persona: Dict[str, Any] = {}
        self.phonetics: Dict[str, str] = {}
        self.reload_config()

    def reload_config(self) -> None:
        """Synchronisiert den Arbeitsspeicher mit den Knoten aus Neo4j."""
        if not self.driver:
            print("[Config-Warning] Neo4j-Treiber offline. Fahre mit leeren Caches fort.")
            return

        try:
            with self.driver.session() as session:
                # 1. Lädt alle aktiven Intents inklusive Keywords, Filler-Words, Endpoints & UI-Scenes
                intent_query = """
                MATCH (i:Intent)
                OPTIONAL MATCH (i)-[:TRIGGERS_SCENE]->(sc:Scene)
                RETURN i.key AS key, 
                       i.keywords AS keywords, 
                       i.filler_words AS filler_words, 
                       i.target_endpoint AS endpoint,
                       sc.key AS scene_key
                """
                intent_res = session.run(intent_query)
                self.intents.clear()
                for record in intent_res:
                    fillers = sorted(record["filler_words"] or [], key=len, reverse=True)
                    self.intents[record["key"]] = {
                        "keywords": record["keywords"] or [],
                        "filler_words": fillers,
                        "endpoint": record["endpoint"],
                        "scene": record["scene_key"]
                    }

                # 2. Lädt alle aktiven Prompts
                prompt_query = """
                MATCH (p:Prompt {active: true})
                RETURN p.key AS key, p.text AS text
                """
                prompt_res = session.run(prompt_query)
                self.prompts.clear()
                for record in prompt_res:
                    self.prompts[record["key"]] = record["text"]

                # 3. Lädt Persona & Voice-Profil aus Neo4j
                persona_query = """
                MATCH (p:Persona {name: 'EVE_CORE'})
                OPTIONAL MATCH (p)-[:HAS_STYLE]->(s:Style)
                RETURN p.identity AS identity, p.default_tone AS tone, p.address_user AS title,
                       collect(s.key) AS styles
                """
                persona_res = session.run(persona_query).single()
                if persona_res:
                    self.persona = {
                        "identity": persona_res["identity"] or "EVE",
                        "tone": persona_res["tone"] or "professionell, präzise, loyal",
                        "title": persona_res["title"] or "Sir",
                        "styles": persona_res["styles"] or []
                    }
                else:
                    self.persona = {"identity": "EVE", "tone": "professionell", "title": "Sir", "styles": []}

                # 4. Lädt alle Phonetik- & Anglizismen-Regeln aus Neo4j
                phonetics_query = """
                MATCH (r:PhoneticRule)
                RETURN r.from AS eng, r.to AS phon
                """
                phonetics_res = session.run(phonetics_query)
                self.phonetics.clear()
                for record in phonetics_res:
                    if record["eng"] and record["phon"]:
                        self.phonetics[record["eng"]] = record["phon"]

            print(f"[Graph-Brain] Synchronisiert: {len(self.intents)} Intents, {len(self.prompts)} Prompts, {len(self.phonetics)} Phonetik-Regeln im RAM.")

        except Exception as e:
            print(f"[Graph-Brain-Error] Fehler beim Synchronisieren: {e}")

    def get_prompt(self, prompt_key: str, fallback: str = "") -> str:
        """Liefert den Prompt-Text direkt aus dem RAM-Cache."""
        return self.prompts.get(prompt_key, fallback)

    def match_intent(self, user_input: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """Holt das gewichtete Intent-Matching direkt vom Node 1 Server."""
        try:
            res = http_session.get(f"{NODE_SERVER}/api/intent/match", params={"q": user_input}, timeout=3)
            if res.status_code == 200:
                data = res.json()
                intent_key = data.get("matched_intent")
                scene_key = data.get("scene")
                score = data.get("score", 0)
                
                if intent_key and score > 0:
                    print(f"[Server-Routing] Match: '{intent_key}' (Scene: '{scene_key}', Score: {score})")
                    return intent_key, {"scene": scene_key}
        except Exception as e:
            print(f"[Routing-Warning] Fallback auf lokalen Cache: {e}")

        # Fallback auf lokalen RAM-Cache, falls der Server nicht antwortet
        user_input_lower = user_input.lower()
        for intent_key, data in self.intents.items():
            keywords = data.get("keywords", [])
            if any(kw.lower() in user_input_lower for kw in keywords):
                return intent_key, data

        return None, None

    def clean_topic(self, intent_key: str, user_input: str) -> str:
        """Streift dynamisch Füllwörter ab, die im Graphen definiert sind."""
        intent_data = self.intents.get(intent_key, {})
        user_input_lower = user_input.lower()
        
        for filler in intent_data.get("filler_words", []):
            if filler in user_input_lower:
                idx = user_input_lower.find(filler) + len(filler)
                cleaned = user_input[idx:].strip(" :,.-")
                if cleaned:
                    return cleaned
        return user_input.strip()

# Initialisiere das In-Memory-Gehirn
graph_brain = DynamicGraphBrain(neo4j_driver)

# ==========================================
# 3. SPEECH QUEUE & MACOS WORKER
# ==========================================
speech_queue: "queue.Queue[Optional[str]]" = queue.Queue()

def sanitize_voice_text(text: str) -> str:
    """Bereinigt Text vor der Sprachausgabe via Neo4j RAM-Cache, Suffix-Regeln & Zahlen-Fix."""
    text = re.sub(r'(\d+)[.,](\d+)', r'\1\2', text)
    
    for eng_word, phon_word in graph_brain.phonetics.items():
        text = text.replace(eng_word, phon_word)

    text = re.sub(r'tion\b', 'zohn', text)
    text = re.sub(r'ing\b', 'ing', text)
        
    return text

def speech_worker() -> None:
    """Gibt Sprache direkt über das native macOS 'say'-Tool aus."""
    while True:
        text = speech_queue.get()
        if text is None:
            speech_queue.task_done()
            break

        try:
            text = sanitize_voice_text(text)

            sentences = [
                s.strip()
                for s in re.split(r'(?<!\d)[.!?](?!\d)\s+|\n+', text)
                if s.strip()
            ]

            for sentence in sentences:
                clean_sentence = re.sub(r'https?://\S+', '', sentence)
                clean_sentence = re.sub(r'[-–—]{2,}', '', clean_sentence)
                clean_sentence = re.sub(r'[#*>`~_]', ' ', clean_sentence)
                clean_sentence = re.sub(r'^\s*[-–—]\s*', '', clean_sentence).strip()

                if not clean_sentence or len(clean_sentence) < 2:
                    continue

                print("\n[Eve spricht via macOS Engine...]")
                start_time = time.time()

                cmd = ["say", "-r", SPEECH_RATE, clean_sentence]
                subprocess.run(cmd, check=True)

                elapsed = time.time() - start_time
                print(f"[System] Ausgabe beendet (Reaktionszeit: {elapsed:.4f}s)")

        except Exception as e:
            print(f"[TTS-Fehler] {e}")

        speech_queue.task_done()

threading.Thread(target=speech_worker, daemon=True).start()

# ==========================================
# 4. STREAMING & INTENT LOGIK
# ==========================================

def stream_ollama_to_speech(prompt: str) -> str:
    """
    Streamt Tokens live von Ollama und übergibt fertige Sätze
    sofort an die Speech Queue für minimale Sprach-Latenz.
    """
    full_text = ""
    sentence_buffer = ""
    
    try:
        response = http_session.post(
            f"{OLLAMA_LOCAL}/api/generate",
            json={
                "model": "qwen2.5:7b",
                "prompt": prompt,
                "stream": True,
                "keep_alive": "24h"
            },
            stream=True,
            timeout=60
        )

        if response.status_code == 200:
            print("\n[Eve generiert & spricht live...]")
            
            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode('utf-8'))
                    token = data.get("response", "")
                    
                    full_text += token
                    sentence_buffer += token
                    
                    if any(p in token for p in [".", "!", "?", "\n"]):
                        clean_sentence = sentence_buffer.strip()
                        if clean_sentence:
                            speech_queue.put(clean_sentence)
                        sentence_buffer = ""

            if sentence_buffer.strip():
                speech_queue.put(sentence_buffer.strip())

            return full_text.strip()

    except Exception as e:
        print(f"[Streaming-Fehler] {e}")
        return "Fehler beim Streaming des Satzes."

    return "Keine Antwort erhalten."

def query_local_brain(user_input: str) -> str:
    """
    Verarbeitet Eingaben dynamisch über das In-Memory Neo4j Brain.
    Unterstützt Self-Awareness, Live Bazaar Data, Multidomain-Routing, SDUI UI-Switches & Voice.
    """
    user_input_lower = user_input.lower()
    title = graph_brain.persona.get("title", "Sir")
    
    # --- REFRESH-BEFEHL FÜR DEN GRAPHEN ---
    if "reload config" in user_input_lower or "gehirn aktualisieren" in user_input_lower:
        graph_brain.reload_config()
        title = graph_brain.persona.get("title", "Sir")
        return f"Konfiguration und Gedächtnis erfolgreich aus Neo4j neu geladen, {title}."

    # --- DYNAMISCHES INTENT MATCHING ---
    matched_intent_key, intent_data = graph_brain.match_intent(user_input)
    target_scene = intent_data.get("scene") if intent_data else None

    # --- INTENT 1: SELF-AWARENESS / SYSTEM-TOPOLOGIE ---
    if matched_intent_key == "system_self_awareness_intent":
        print("[Intent] Self-Awareness / Systemtopologie Abfrage erkannt...")
        trigger_sdui_scene_switch(target_scene or "ambient")
        try:
            response = http_session.get(f"{NODE_SERVER}/api/system/topology", timeout=5)
            if response.status_code == 200 and response.text.strip():
                live_topology = response.text
                
                prompt_template = graph_brain.get_prompt(
                    "system_self_awareness_writer",
                    fallback="Du bist EVE, ein hochentwickeltes KI-System. Hier ist dein echter Systembauplan:\n{system_topology}\n\nBeantworte die Frage präzise: {user_input}"
                )
                
                safe_input = user_input.replace("{", "{{").replace("}", "}}")
                try:
                    formatted_prompt = prompt_template.format(
                        system_topology=live_topology,
                        thema=safe_input,
                        user_input=safe_input,
                        raw_data=live_topology
                    )
                except KeyError:
                    formatted_prompt = f"Du bist EVE. Hier ist dein Live-Systembauplan:\n{live_topology}\n\nBeantworte kurz die Frage '{safe_input}'."

                return stream_ollama_to_speech(formatted_prompt)
            else:
                err_msg = f"Konnte die Live-Topologie nicht vom Server abrufen, {title}."
                speech_queue.put(err_msg)
                return err_msg

        except Exception as e:
            print(f"[System-Fehler] Topologie-Verbindung fehlgeschlagen: {e}")
            err_msg = f"Fehler bei der Verbindung zum Topologie-Dienst: {e}"
            speech_queue.put(err_msg)
            return err_msg

    # --- INTENT 2: HYPIXEL BAZAAR LIVE FLIPS ---
    elif matched_intent_key == "hypixel_bazaar_intent":
        print("[Intent] Hypixel Bazaar Live-Marktdaten Abfrage erkannt...")
        trigger_sdui_scene_switch(target_scene or "bazaar")
        try:
            worker_url = NODE_SERVER.replace(":5000", ":5001")
            bazaar_res = http_session.get(f"{worker_url}/api/skyblock/bazaar/top?limit=5", timeout=3)
            
            if bazaar_res.status_code == 200:
                bazaar_raw = bazaar_res.json()
                last_updated = bazaar_raw.get("last_updated", "Unbekannt")
                flips = bazaar_raw.get("flips", [])
                
                bazaar_text = f"Live-Bazaar Daten (Stand: {last_updated}):\n"
                for idx, f in enumerate(flips, 1):
                    display_name = f.get("item_name") or f.get("item_id", "Unbekanntes Item")
                    bazaar_text += f"{idx}. {display_name}: Instant Buy {f['buy_price']} Coins, Instant Sell {f['sell_price']} Coins, Marge {f['margin_percent']}%\n"

                prompt_template = graph_brain.get_prompt(
                    "hypixel_bazaar_writer",
                    fallback="Du bist EVE. Hier sind die exakten Hypixel SkyBlock Live Bazaar Daten:\n{bazaar_data}\n\nBeantworte die Frage kurz und präzise: {user_input}"
                )
                
                safe_input = user_input.replace("{", "{{").replace("}", "}}")
                try:
                    formatted_prompt = prompt_template.format(
                        bazaar_data=bazaar_text,
                        last_updated=last_updated,
                        thema=safe_input,
                        user_input=safe_input,
                        raw_data=bazaar_text
                    )
                except KeyError:
                    formatted_prompt = f"Du bist EVE. Hier sind die Live Bazaar Daten:\n{bazaar_text}\n\nBeantworte kurz die Frage '{safe_input}'."

                return stream_ollama_to_speech(formatted_prompt)
            else:
                err_msg = f"Der Hypixel Market Worker liefert aktuell keine Daten, {title}."
                speech_queue.put(err_msg)
                return err_msg

        except Exception as e:
            print(f"[Bazaar-Voice-Fehler] {e}")
            err_msg = f"Fehler beim Abruf der Live-Bazaar-Daten: {e}"
            speech_queue.put(err_msg)
            return err_msg

    # --- INTENT 3: WETTERABFRAGE ---
    elif matched_intent_key == "weather_intent":
        print("[Intent] Wetterabfrage via Graph-Routing erkannt...")
        trigger_sdui_scene_switch(target_scene or "ambient")
        try:
            response = http_session.get(f"{NODE_SERVER}/weather", params={"tage": 3}, timeout=5)
            if response.status_code == 200 and response.text.strip():
                raw_weather = response.text
                
                prompt_key = "eve_weather_voice_short" if any(w in user_input_lower for w in ["kurz", "schnell", "status"]) else "eve_weather_voice_detailed"
                prompt_template = graph_brain.get_prompt(prompt_key, fallback="Fasse folgendes Wetter kurz zusammen:\n{raw_weather}")
                
                formatted_prompt = prompt_template.format(raw_weather=raw_weather)
                return stream_ollama_to_speech(formatted_prompt)
        except Exception as e:
            print(f"[System-Fehler] Wetter-Verbindung fehlgeschlagen: {e}")

    # --- INTENT 4: KNOWLEDGE GRAPH OPERATOR ---
    elif matched_intent_key == "knowledge_graph_intent":
        print("[Intent] Knowledge-Graph-Operation erkannt...")
        trigger_sdui_scene_switch(target_scene or "research")
        graph_thema = graph_brain.clean_topic("knowledge_graph_intent", user_input)

        try:
            response = http_session.post(f"{NODE_SERVER}/knowledge-graph", params={"thema": graph_thema}, timeout=5)
            res_text = f"Ich habe den Auftrag an die Neo4j-Pipeline übergeben, {title}. Das Thema '{graph_thema}' wird verknüpft."
            speech_queue.put(res_text)
            return res_text
        except Exception as e:
            err_text = f"Verbindung zur Neo4j-Schnittstelle fehlgeschlagen: {e}"
            speech_queue.put(err_text)
            return err_text

    # --- INTENT 5: RECHERCHE-INTENTS ---
    elif matched_intent_key and "research_intent" in matched_intent_key:
        print(f"[Intent] Multidomain Recherche-Auftrag ({matched_intent_key}) erkannt...")
        trigger_sdui_scene_switch(target_scene or "research")
        clean_thema = graph_brain.clean_topic(matched_intent_key, user_input)
        endpoint = intent_data.get("endpoint", "/research") if intent_data else "/research"

        try:
            print(f"[Node] Sende Forschungs-Auftrag an '{endpoint}': '{clean_thema}'")
            response = http_session.post(
                f"{NODE_SERVER}{endpoint}", 
                json={"thema": clean_thema, "template_key": "standard_report_template", "username": "user"}, 
                timeout=5
            )
            
            if response.status_code == 200:
                def wait_and_open_browser(target_thema: str) -> None:
                    encoded_thema = requests.utils.quote(target_thema)
                    preview_url = f"{NODE_SERVER}/preview/{encoded_thema}"
                    
                    print(f"[Auto-Open] Überwache Ziel-URL: {preview_url}")
                    time.sleep(40) 
                    
                    attempts = 0
                    while attempts < 90:
                        try:
                            check = http_session.get(preview_url, timeout=5)
                            if check.status_code == 200 and "läuft noch" not in check.text:
                                print("[Auto-Open] Ziel erreicht! Öffne Vorschau auf dem Mac...")
                                subprocess.run(["open", preview_url], check=False)
                                break
                        except Exception:
                            pass
                        time.sleep(10)
                        attempts += 1

                threading.Thread(target=wait_and_open_browser, args=(clean_thema,), daemon=True).start()
                res_text = f"Ich habe die Tiefenanalyse für '{clean_thema}' gestartet, {title}. Die Vorschau öffnet sich automatisch nach Fertigstellung."
                speech_queue.put(res_text)
                return res_text
                
        except Exception as e:
            err_text = f"Fehler beim Kommunizieren mit dem Node-Server: {e}"
            speech_queue.put(err_text)
            return err_text

    # --- INTENT 6: VIDEO GENERIERUNG ---
    elif matched_intent_key == "video_generation_intent":
        print("[Intent] Video-Render-Auftrag erkannt...")
        trigger_sdui_scene_switch(target_scene or "video")
        video_thema = graph_brain.clean_topic("video_generation_intent", user_input)

        try:
            res_text = f"Verstanden, {title}. Ich aktiviere die Render-Engine für das Thema '{video_thema}'."
            speech_queue.put(res_text)
            
            payload = {
                "topic": video_thema,
                "text_content": f"Automatischer Report: {video_thema}",
                "duration": 8,
                "fade_in": True,
                "vignette": True
            }
            
            http_session.post(f"{NODE_SERVER}/api/video/create-meme", json=payload, timeout=5)
            return res_text
            
        except Exception as e:
            err_text = f"Verbindung zum Video-Studio fehlgeschlagen: {e}"
            speech_queue.put(err_text)
            return err_text

    # --- STANDARD: CONVERSATIONAL CHAT ÜBER DAS BACKEND (/api/chat STREAMING) ---
    trigger_sdui_scene_switch("chat")
    try:
        response = http_session.post(
            f"{NODE_SERVER}/api/chat",
            json={"thema": user_input, "username": "user"},
            stream=True,
            timeout=30
        )
        if response.status_code == 200:
            chat_response = ""
            sentence_buffer = ""
            print("\n[Eve spricht live...]")
            
            for line in response.iter_lines(decode_unicode=True):
                if line and line.startswith("data: "):
                    try:
                        data = json.loads(line.replace("data: ", "").strip())
                        token = data.get("token", "")
                        
                        chat_response += token
                        sentence_buffer += token
                        
                        if any(p in token for p in [".", "!", "?", "\n"]):
                            clean_sentence = sentence_buffer.strip()
                            if clean_sentence:
                                speech_queue.put(clean_sentence)
                            sentence_buffer = ""
                    except Exception:
                        pass

            if sentence_buffer.strip():
                speech_queue.put(sentence_buffer.strip())

            if chat_response:
                return chat_response.strip()
        
        fallback_text = f"Ich habe Ihre Nachricht empfangen, {title}."
        speech_queue.put(fallback_text)
        return fallback_text

    except Exception as e:
        err_text = f"Fehler bei der Kommunikation mit dem EVE-Server Chat-Endpunkt: {e}"
        speech_queue.put(err_text)
        return err_text

# ==========================================
# 5. HAUPTSCHLEIFE & SAUBERES BEENDEN
# ==========================================
def main() -> None:
    print("=== EVE WIRD GESTARTET, SIR ===")
    print("[System] Client-Brücke aktiv. Graph-Driven Voice Engine online.")

    title = graph_brain.persona.get("title", "Sir")
    speech_queue.put(f"Systeme online. Ich höre Ihnen zu, {title}.")

    try:
        while True:
            user_input = input(f"\n[{title}] > ").strip()

            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit", "herunterfahren", "schließen"]:
                speech_queue.put(f"Fahre Systeme herunter. Auf Wiedersehen, {title}.")
                speech_queue.put(None)
                speech_queue.join()
                break

            response_text = query_local_brain(user_input)
            print(f"\n[Eve] {response_text}")

    except (KeyboardInterrupt, EOFError):
        print("\n[System] Herunterfahren eingeleitet...")
        speech_queue.put(None)
    finally:
        if neo4j_driver:
            neo4j_driver.close()
            print("[System] Neo4j-Verbindung geschlossen.")

if __name__ == "__main__":
    main()