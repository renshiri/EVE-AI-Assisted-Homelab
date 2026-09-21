#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from typing import Optional, List
from ollama import AsyncClient as AsyncOllamaClient
from eve_config import MAC_HOST
from eve_graph import (
    get_prompt_from_graph,
    get_user_facts_prompt,
    get_active_rules_from_graph,
    resolve_intent_and_template,
    get_project_structure_prompt
)
from eve_memory import query_relevant_context, query_codebase_context
from eve_weather import fetch_open_meteo_weather
from routes.calendar import fetch_calendar_events_internal

# Live-Indexing Imports
from index_structure import index_folder_structure

SERVICES_ROOT = os.path.expanduser("~/services")


class ContextBuilder:
    """
    Sammelt alle notwendigen Daten aus Neo4j, ChromaDB, Live-Dateisystem, Kalender und Wetter
    und fügt sie zu einem strikten System-Prompt zusammen.
    """

    def __init__(self, user_msg: str, username: str = "renshiri", lat: float = 50.7753, lon: float = 6.0839):
        self.user_msg = user_msg
        self.username = username
        self.lat = lat
        self.lon = lon
        
        self.intent_key: Optional[str] = None
        self.scene_key: Optional[str] = None

    def _read_file_from_disk(self, rel_path: str) -> Optional[str]:
        """Liest eine Datei sicher und direkt in Echtzeit von der Festplatte ab."""
        try:
            # Pfad normieren & Path Traversal verhindern
            clean_path = rel_path.lstrip("/").strip()
            full_path = os.path.normpath(os.path.join(SERVICES_ROOT, clean_path))
            
            if not full_path.startswith(SERVICES_ROOT):
                print(f"[Live-Read Warning] Zugriff verweigert (Path Traversal): {rel_path}")
                return None

            if os.path.exists(full_path) and os.path.isfile(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Schutz vor gigantischen Log- oder Binärdateien (max. 100 KB)
                    if len(content) > 100_000:
                        return content[:100_000] + "\n... [Inhalt gekürzt, Datei zu groß]"
                    return content
        except Exception as e:
            print(f"[Live-Read Error] Fehler beim Lesen von {rel_path}: {e}")
        return None

    def _extract_and_read_mentioned_files(self) -> str:
        """Sucht im User-Prompt nach Dateinamen/Pfaden und liest diese direkt von der Disk."""
        # Erkennt Muster wie: routes/chat.py, context_builder.py, eve_server.py, etc.
        pattern = r'\b([a-zA-Z0-9_\-\/]+\.(?:py|jsx|js|json|html|css|md))\b'
        matches = list(set(re.findall(pattern, self.user_msg)))
        
        if not matches:
            return ""

        loaded_files = []
        for file_match in matches:
            # Versuche relativen Pfad zu finden (z. B. direkt oder unter eve_server/)
            content = self._read_file_from_disk(file_match)
            if not content and not file_match.startswith("eve_server/"):
                # Fallback: Versuche den Pfad innerhalb von eve_server/ zu lokalisieren
                content = self._read_file_from_disk(os.path.join("eve_server", file_match))

            if content:
                loaded_files.append(f"--- START ECHTE DATEI: {file_match} ---\n{content}\n--- ENDE DATEI ---")

        if loaded_files:
            return "\n\n[LIVE DATEIEN VON DER FESTPLATTE (Echtzeit)]:\n" + "\n\n".join(loaded_files)
        return ""

    def assemble(self) -> str:
        """Führt alle Datenquellen zusammen und liefert den fertigen Prompt zurück."""
        
        # 1. Intent & Szenen-Routing aus Neo4j auflösen
        self.intent_key, _, self.scene_key = resolve_intent_and_template(self.user_msg)

        # 2. Codebase- & Ordnerstruktur-Kontext (LIVE + HYBRID)
        code_context = ""
        if self.intent_key == "code_analysis_intent": # Nur bei erkannten Code-Fragestellungen
            # (A) Live-Ordnerstruktur-Sync in Neo4j
            try:
                index_folder_structure()
            except Exception as e:
                print(f"[ContextBuilder Warning] Live-Folder-Sync fehlgeschlagen: {e}")

            folder_struct = get_project_structure_prompt()
            
            # (B) Prio 1: Gezielter Live-Disk-Read (falls Dateinamen genannt wurden)
            live_file_content = self._extract_and_read_mentioned_files()
            
            # (C) Prio 2: ChromaDB-Vektorsuche (als Fallback oder Ergänzung)
            raw_code = query_codebase_context(self.user_msg, n_results=5) if not live_file_content else ""

            if folder_struct or live_file_content or raw_code:
                code_context = (
                    "\n\n[SKILL: CODEBASE-ANALYSE ACTIVATED - LIVE DATA]\n"
                    f"NEO4J DATEISTRUKTUR:\n{folder_struct}\n"
                    f"{live_file_content}\n"
                    f"{f'CHROMADB CODE-SCHNIPSEL:\n{raw_code}' if raw_code else ''}\n\n"
                    "STRIKTE VERHALTENSREGEL:\n"
                    "1. Beziehe dich AUSSCHLIESSLICH auf den oben gezeigten echten Code und die Ordnerstruktur.\n"
                    "2. Falls der konkrete Code einer angefragten Datei nicht im Kontext oben enthalten ist, antworte direkt mit:\n"
                    "   'Der Quellcode dieser Datei liegt aktuell nicht in meinem Kontext-Speicher vor.'\n"
                    "3. Erfinde UNTER KEINEN UMSTÄNDEN Code, Routen, Frameworks (wie Flask) oder Platzhalter!"
                )

        # 3. Kalender-Kontext
        cal_context = ""
        try:
            events = fetch_calendar_events_internal()
            if events:
                formatted = "\n".join([
                    f"- {e.get('title')} am {e.get('start_datetime')} (Kategorie: {e.get('category', 'Privat')})"
                    for e in events[:5]
                ])
                cal_context = f"\n\n[KALENDER-DATEN AUS NEO4J]:\n{formatted}"
        except Exception as e:
            print(f"[ContextBuilder Warning] Kalender-Abfrage fehlgeschlagen: {e}")

        # 4. Graph-Fakten, Chat-Gedächtnis, Wetter, Regeln & Persona
        graph_facts = get_user_facts_prompt(user_id=self.username)
        past_memory = query_relevant_context(self.user_msg, n_results=4)
        memory_str = f"\n\n[CHAT-ERINNERUNGEN]:\n{past_memory}" if past_memory else ""
        weather_str = fetch_open_meteo_weather(lat=self.lat, lon=self.lon)
        system_rules = get_active_rules_from_graph()
        persona = get_prompt_from_graph("system_persona") or "Du bist EVE, ein hochentwickeltes KI-System."

        # 5. Verschmelzung zum finalen System-Prompt
        full_prompt = (
            f"{persona}\n"
            f"ANGESCHALTETER INTENT: {self.intent_key or 'Standard-Chat'}\n"
            f"{system_rules}\n"
            f"{graph_facts}"
            f"{memory_str}"
            f"{code_context}\n\n"
            f"{weather_str}"
            f"{cal_context}"
        )

        return full_prompt


class LLMEngine:
    """Kapselt den Aufruf des Sprachmodells über Ollama."""

    def __init__(self, host: str = MAC_HOST, default_model: str = "qwen2.5:7b"):
        self.client = AsyncOllamaClient(host=host)
        self.default_model = default_model

    async def generate(self, system_prompt: str, user_msg: str) -> str:
        res = await self.client.chat(
            model=self.default_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ],
            options={
                "num_ctx": 4096,
                "num_thread": 8,
                "temperature": 0.2
            }
        )
        return res["message"]["content"]