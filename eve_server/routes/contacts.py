#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pyicloud import PyiCloudService
from pyicloud.exceptions import PyiCloudFailedLoginException

from eve_graph import neo4j_driver

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])

class ICloudSyncRequest(BaseModel):
    username: str
    password: str
    two_factor_code: Optional[str] = None

def init_contact_indexes():
    """Erstellt Neo4j-Indizes für allgemeine Kontakte."""
    if not neo4j_driver:
        return
    query = "CREATE INDEX contact_phone_idx IF NOT EXISTS FOR (c:Contact) ON (c.phone);"
    try:
        with neo4j_driver.session() as session:
            session.run(query)
    except Exception as e:
        print(f"[Contacts] Index-Fehler: {e}", flush=True)

@router.on_event("startup")
async def startup():
    init_contact_indexes()

@router.post("/sync/icloud")
async def sync_icloud_contacts(req: ICloudSyncRequest):
    """
    Synchronisiert Kontakte aus der iCloud nach Neo4j als generelle 'Contact'-Nodes.
    """
    if not neo4j_driver:
        raise HTTPException(status_code=500, detail="Neo4j Datenbank nicht erreichbar.")

    try:
        api = PyiCloudService(req.username, req.password)
    except PyiCloudFailedLoginException as e:
        raise HTTPException(status_code=401, detail=f"iCloud Login fehlgeschlagen: {e}")

    # 2FA Handling
    if api.requires_2fa:
        if not req.two_factor_code:
            return {"status": "2fa_required", "message": "Zwei-Faktor-Authentifizierung erforderlich. Sende den Request erneut mit 'two_factor_code'."}
        
        result = api.validate_2fa_code(req.two_factor_code)
        if not result:
            raise HTTPException(status_code=401, detail="Falscher 2FA Code.")

    # Dynamische Prüfung, ob .all eine Methode oder eine Property/Liste ist
    try:
        if callable(api.contacts.all):
            contacts_data = api.contacts.all()
        else:
            contacts_data = api.contacts.all
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Kontakte: {e}")

    query = """
    UNWIND $contacts AS c
    MERGE (contact:Contact {phone: c.phone})
    SET contact.name = c.name,
        contact.source = 'iCloud',
        contact.updated_at = datetime()
    """

    processed_contacts = []
    
    for c in contacts_data:
        phones = c.get("phones", [])
        if phones:
            for phone_obj in phones:
                raw_phone = phone_obj.get("field", "")
                clean_number = re.sub(r'\D', '', raw_phone)
                
                if clean_number.startswith("0049"):
                    clean_number = clean_number[2:]
                elif clean_number.startswith("0") and len(clean_number) > 8:
                    clean_number = "49" + clean_number[1:]
                
                if not clean_number:
                    continue
                    
                whatsapp_format = f"{clean_number}@c.us"
                
                first_name = c.get('firstName', '')
                last_name = c.get('lastName', '')
                full_name = f"{first_name} {last_name}".strip()
                
                if full_name:
                    processed_contacts.append({
                        "name": full_name,
                        "phone": whatsapp_format
                    })
                    break

    try:
        with neo4j_driver.session() as session:
            session.run(query, contacts=processed_contacts)
        return {"status": "success", "synced_count": len(processed_contacts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Datenbankfehler beim Speichern: {e}")

@router.get("/")
async def get_all_contacts():
    """Gibt die globale Kontaktliste zurück."""
    if not neo4j_driver:
        return {"contacts": []}
    
    query = "MATCH (c:Contact) RETURN c.name AS name, c.phone AS phone, c.source AS source ORDER BY c.name"
    try:
        with neo4j_driver.session() as session:
            records = session.run(query)
            return {"contacts": [dict(r) for r in records]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))