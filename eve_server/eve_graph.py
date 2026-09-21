#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from typing import Tuple, Optional, List
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    print("[Neo4j-Warning] WARNUNG: 'NEO4J_PASSWORD' ist nicht in der .env-Datei gesetzt!")

try:
    if NEO4J_PASSWORD:
        neo4j_driver = GraphDatabase.driver(
            NEO4J_URI, 
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            max_connection_lifetime=300,
            max_connection_pool_size=10
        )
    else:
        neo4j_driver = None
except Exception as e:
    print(f"[Neo4j-Warning] Driver konnte nicht initialisiert werden: {e}")
    neo4j_driver = None

def init_neo4j_indexes():
    if not neo4j_driver:
        return
    indexes = [
        "CREATE INDEX intent_key_idx IF NOT EXISTS FOR (i:Intent) ON (i.key);",
        "CREATE INDEX prompt_key_idx IF NOT EXISTS FOR (p:Prompt) ON (p.key);",
        "CREATE INDEX source_domain_idx IF NOT EXISTS FOR (s:Source) ON (s.domain);",
        "CREATE INDEX calendar_start_idx IF NOT EXISTS FOR (e:CalendarEvent) ON (e.start_datetime);",
        "CREATE INDEX user_username_idx IF NOT EXISTS FOR (u:User) ON (u.username);"
    ]
    try:
        with neo4j_driver.session() as session:
            for idx_query in indexes:
                session.run(idx_query)
        print("[Neo4j-Perf] Indizes verifiziert.")
    except Exception as e:
        print(f"[Neo4j-Warning] Index-Initialisierung fehlgeschlagen: {e}")

# ==========================================
# EVE GRAPH ERINNERUNG & AUTO-LEARNING
# ==========================================

def get_user_facts_prompt(user_id: str = "renshiri") -> str:
    """Liest alle festen Verbindungen und Fakten über den Nutzer aus Neo4j aus."""
    if not neo4j_driver:
        return ""
    
    query = """
    MATCH (u:User {username: $user_id})-[r]->(e)
    RETURN type(r) AS relation, e.name AS entity, labels(e)[0] AS label
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query, user_id=user_id)
            facts = [f"- {r['relation']}: {r['entity']} ({r['label']})" for r in records]
            if facts:
                return "\nGESPEICHERTE STAMMDATEN UND FAKTEN (NEO4J GRAPH):\n" + "\n".join(facts)
    except Exception as e:
        print(f"[Neo4j-Facts Error] {e}")
    return ""

def extract_and_store_graph_facts(text: str, user_id: str = "renshiri") -> None:
    """Extrahiert beim Chatten einfache Fakten und verknüpft sie fest mit dem User."""
    if not neo4j_driver:
        return

    text_lower = text.lower()

    # 1. Hardware / Geräte-Erkennung
    if "nutze" in text_lower or "habe" in text_lower:
        match = re.search(r'(?:nutze|habe)\s+(?:ein|einen|eine)?\s*([a-zA-Z0-9\s]+(?:m1|m2|m3|m4|macbook|iphone|pc|server|laptop)[a-zA-Z0-9\s]*)', text, re.IGNORECASE)
        if match:
            device_name = match.group(1).strip()
            _create_graph_relation(user_id, "NUTZT_GERAET", device_name, "Device")

    # 2. Projekt- / Frontend-Erkennung
    if "arbeite an" in text_lower or "entwickle" in text_lower:
        match = re.search(r'(?:arbeite an|entwickle)\s+(?:einem|einer|dem)?\s*([a-zA-Z0-9\s]+(?:frontend|backend|app|dashboard|projekt)[a-zA-Z0-9\s]*)', text, re.IGNORECASE)
        if match:
            project_name = match.group(1).strip()
            _create_graph_relation(user_id, "ARBEITET_AN", project_name, "Project")

def _create_graph_relation(user_id: str, relation: str, entity_name: str, label: str):
    query = f"""
    MERGE (u:User {{username: $user_id}})
    MERGE (e:{label} {{name: $entity_name}})
    MERGE (u)-[r:{relation}]->(e)
    SET r.updated_at = datetime()
    """
    try:
        with neo4j_driver.session() as session:
            session.run(query, user_id=user_id, entity_name=entity_name)
            print(f"[Neo4j Auto-Learn] Fakt verknüpft: (User:{user_id})-[:{relation}]->({entity_name}:{label})")
    except Exception as e:
        print(f"[Neo4j Auto-Learn Error] {e}")

# ==========================================
# BESTEHENDE SYSTEM-FUNKTIONEN
# ==========================================

def resolve_intent_and_template(thema: str) -> Tuple[str, str, Optional[str]]:
    if not neo4j_driver:
        return "research_intent", "standard_report_template", "research"

    query = """
    MATCH (i:Intent)
    WHERE i.keywords IS NOT NULL
    WITH i, [kw IN i.keywords WHERE $thema CONTAINS toLower(kw)] AS matches
    WHERE size(matches) > 0
    OPTIONAL MATCH (i)-[:USES_TEMPLATE]->(t:Template {active: true})
    OPTIONAL MATCH (i)-[:TRIGGERS_SCENE]->(sc:Scene)
    RETURN i.key AS intent_key, t.key AS template_key, sc.key AS scene_key, size(matches) AS score
    ORDER BY score DESC
    LIMIT 1
    """
    try:
        with neo4j_driver.session() as session:
            result = session.run(query, thema=thema.lower()).single()
            if result:
                return (
                    result["intent_key"], 
                    result["template_key"] or "standard_report_template", 
                    result["scene_key"] or "research"
                )
    except Exception as e:
        print(f"[Graph-Routing-Error] {e}")

    return "research_intent", "standard_report_template", "research"

def get_prompt_from_graph(prompt_key: str) -> str:
    if not neo4j_driver:
        return ""
    query = "MATCH (p:Prompt {key: $key, active: true}) RETURN p.text AS text LIMIT 1"
    try:
        with neo4j_driver.session() as session:
            result = session.run(query, key=prompt_key).single()
            if result and result["text"]:
                return str(result["text"])
    except Exception as e:
        print(f"[Neo4j-Prompt-Error] {e}")
    return ""

def get_system_topology_from_graph() -> str:
    if not neo4j_driver:
        return "Keine Verbindung zur Neo4j-Datenbank verfügbar."
    
    query = """
    MATCH (n:Node)
    OPTIONAL MATCH (n)-[:HOSTS_SERVICE]->(s:Service)
    OPTIONAL MATCH (n)-[:HOSTS_CONTAINER]->(c:Container)
    OPTIONAL MATCH (n)-[:PROVIDES_STORAGE]->(st:StorageNode)
    RETURN n.hostname AS host, n.ip AS ip, n.os AS os, 
           n.cpu AS cpu, n.ram AS ram, n.swap AS swap, n.role AS role,
           n.net_interface AS net_interface, n.storage_root AS storage_root,
           collect(DISTINCT s.name + ' (' + coalesce(s.type, 'Service') + ' | Port: ' + coalesce(toString(s.port), 'N/A') + ')') AS services,
           collect(DISTINCT c.name + ' (Docker | Port: ' + coalesce(toString(c.port), 'N/A') + ')') AS containers,
           collect(DISTINCT st.path + ' [' + coalesce(st.filesystem, 'N/A') + ']') AS storages
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query)
            topology_summary = "=== VERIFIZIERTE EVE SYSTEM-TOPOLOGIE & HARDWARE (LIVE GRAPH) ===\n\n"
            has_data = False
            for r in records:
                if not r["host"]:
                    continue
                has_data = True
                topology_summary += f"KNOTEN: {r['host']} ({r['ip']})\n  - Rolle: {r['role']}\n  - OS: {r['os']}\n  - CPU: {r['cpu']}\n  - RAM: {r['ram']}\n\n"
            return topology_summary if has_data else "Keine Topologie-Daten in Neo4j gefunden."
    except Exception as e:
        return f"Fehler beim Auslesen der Topologie aus Neo4j: {e}"

def log_generated_video_to_graph(topic: str, text_content: str, output_path: str):
    if not neo4j_driver:
        print("[Neo4j-Warning] Kein Treiber für Video-Logging verfügbar.")
        return False

    query = """
    MERGE (t:Topic {name: toLower($topic)})
    CREATE (v:GeneratedVideo {
        text: $text_content,
        path: $output_path,
        timestamp: datetime()
    })
    CREATE (v)-[:BELONGS_TO_TOPIC]->(t)
    RETURN elementId(v) AS video_id
    """
    try:
        with neo4j_driver.session() as session:
            session.run(query, topic=topic, text_content=text_content, output_path=output_path)
            print(f"[Neo4j-Success] Video-Kontext für Thema '{topic}' in Graph gespeichert.")
            return True
    except Exception as e:
        print(f"[Neo4j-Error] Konnte Video nicht in Neo4j loggen: {e}")
        return False

def store_knowledge_in_graph(topic: str, text_content: str, source: str = "EVE-Auto-Research"):
    if not neo4j_driver:
        print("[Neo4j-Warning] Kein Treiber verfügbar, Gedächtnis offline.")
        return False

    query = """
    MERGE (t:Topic {name: toLower($topic)})
    CREATE (k:Knowledge {
        content: $text_content,
        source: $source,
        timestamp: datetime()
    })
    CREATE (k)-[:BELONGS_TO]->(t)
    RETURN elementId(k) AS knowledge_id
    """
    try:
        with neo4j_driver.session() as session:
            session.run(query, topic=topic, text_content=text_content, source=source)
            print(f"[EVE Brain] Neues Wissen zum Thema '{topic}' erfolgreich verinnerlicht.")
            return True
    except Exception as e:
        print(f"[Neo4j-Error] Fehler beim Speichern des Wissens: {e}")
        return False

def get_active_rules_from_graph() -> str:
    """Liest alle aktiven Verhaltensregeln geordnet nach Priorität aus Neo4j aus."""
    if not neo4j_driver:
        return ""
    
    query = """
    MATCH (r:Rule {active: true})
    RETURN r.key AS key, r.text AS text, r.category AS category
    ORDER BY r.priority ASC
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query)
            rules = [f"- [{r['category'].upper()}] {r['text']}" for r in records]
            if rules:
                return "\nSTRIKTE SYSTEM- UND VERHALTENSREGELN (NEO4J RULES):\n" + "\n".join(rules)
    except Exception as e:
        print(f"[Neo4j-Rules Error] {e}")
    return ""

def get_project_structure_prompt() -> str:
    if not neo4j_driver:
        return ""
    query = """
    MATCH (d:Directory)-[:CONTAINS_FILE]->(f:ProjectFile)
    RETURN d.path AS dir, collect(f.name) AS files
    LIMIT 25
    """
    try:
        with neo4j_driver.session() as session:
            records = session.run(query)
            structure = [f"- Ordner '{r['dir']}': {', '.join(r['files'][:10])}" for r in records]
            if structure:
                return "\nEXAKTE PROJEKT-ORDNERSTRUKTUR (LIVE GRAPH):\n" + "\n".join(structure)
    except Exception as e:
        print(f"[Graph Structure Error] {e}")
    return ""