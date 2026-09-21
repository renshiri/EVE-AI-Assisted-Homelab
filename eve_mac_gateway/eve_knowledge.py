import os
import requests
import ollama
from neo4j import GraphDatabase
from datetime import datetime

# ─────────────────────────────────────────
# Eve Knowledge System
# Kombiniert Neo4j (strukturierter Graph)
# mit ChromaDB (semantische Suche)
# ─────────────────────────────────────────

# Verbindungen via Umgebungsvariablen mit neutralen Defaults
NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "your-secure-password")
MEMORY_SERVER  = os.getenv("MEMORY_SERVER_URL", "http://localhost:8765")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# ─── Lesen ────────────────────────────────

def knowledge_recall(query: str) -> str:
    """
    Kombinierter Kontext-Abruf:
    1. Neo4j: strukturierter Graph-Kontext
    2. ChromaDB: semantisch ähnliche Episoden
    """
    context_parts = []

    # 1. Neo4j – relevante Knoten suchen
    try:
        with driver.session() as session:
            # Alle Personen + Eigenschaften
            persons = session.run("""
                MATCH (p:Person)
                RETURN p
            """)
            for record in persons:
                node = record["p"]
                props = dict(node.items())
                name = props.pop("name", "Unbekannt")
                props.pop("created_at", None)
                if props:
                    lines = [f"Person: {name}"]
                    for k, v in props.items():
                        lines.append(f"  {k}: {v}")
                    context_parts.append("\n".join(lines))

            # Projekte + Eigenschaften
            projects = session.run("""
                MATCH (p:Project)
                RETURN p
            """)
            for record in projects:
                node = record["p"]
                props = dict(node.items())
                name = props.pop("name", "Unbekannt")
                props.pop("created_at", None)
                props.pop("updated_at", None)
                if props:
                    lines = [f"Projekt: {name}"]
                    for k, v in props.items():
                        lines.append(f"  {k}: {v}")
                    context_parts.append("\n".join(lines))

            # Beziehungen
            relations = session.run("""
                MATCH (a)-[r]->(b)
                RETURN a.name as from, type(r) as rel, b.name as to
                LIMIT 20
            """)
            rel_lines = []
            for record in relations:
                if record["from"] and record["to"]:
                    rel_lines.append(
                        f"  {record['from']} –{record['rel']}→ {record['to']}"
                    )
            if rel_lines:
                context_parts.append("Beziehungen:\n" + "\n".join(rel_lines))

    except Exception as e:
        print(f"[Knowledge] Neo4j Fehler: {e}")

    # 2. ChromaDB – semantische Episoden
    try:
        response = requests.post(
            f"{MEMORY_SERVER}/recall",
            json={"query": query, "n_results": 3},
            timeout=3
        )
        data = response.json()
        if data.get("episodes"):
            lines = ["Vergangene Episoden:"]
            for ep in data["episodes"]:
                lines.append(f"  - {ep}")
            context_parts.append("\n".join(lines))
    except Exception:
        pass

    return "\n\n".join(context_parts) if context_parts else ""


# ─── Schreiben ────────────────────────────

def knowledge_store(user_text: str, eve_response: str):
    """
    Extrahiert neue Fakten und schreibt sie in Neo4j + ChromaDB.
    Qwen entscheidet was gespeichert wird und in welche Kategorie.
    """
    try:
        extraction_prompt = (
            "Analysiere dieses Gespräch und extrahiere ALLE erinnerungswürdigen Informationen.\n\n"
            f"Nutzer: {user_text}\n"
            f"Eve: {eve_response}\n\n"
            "Kategorien:\n"
            "PERSON: Fakten über den Nutzer (Name, Alter, Herkunft, Präferenzen, Gewohnheiten)\n"
            "PROJEKT: Informationen über ein laufendes Projekt (Name, Tech-Stack, Status, Components)\n"
            "SYSTEM: Informationen über Eve oder die technische Infrastruktur\n"
            "EPISODE: Wichtige Entscheidung oder Ereignis das zukünftig relevant sein könnte\n"
            "NICHTS: Smalltalk, zu vage, nicht relevant\n\n"
            "Antworte NUR in diesem Format, eine Zeile pro Eintrag, KEINE Header-Zeile:\n"
            "KATEGORIE|Entität|Eigenschaft|Wert\n\n"
            "Beispiele:\n"
            "PERSON|User|praeferenz_antworten|kurz und präzise\n"
            "PROJEKT|Portfolio Website|tech_frontend|React + Vite\n"
            "PROJEKT|Portfolio Website|status|in_arbeit\n"
            "SYSTEM|Eve|modell|qwen2.5:7b\n"
            "EPISODE|System|entscheidung|Node wird als NAS genutzt statt Agenten-Server\n\n"
            "Wenn nichts erinnerungswürdig: NUR 'NICHTS'"
        )

        result = ollama.chat(
            model="qwen2.5:7b",
            messages=[{"role": "user", "content": extraction_prompt}]
        )

        extracted = result["message"]["content"].strip()
        print(f"[Knowledge Debug] Extrahiert:\n{extracted}")

        if extracted.upper() == "NICHTS" or not extracted:
            return

        lines = [l.strip() for l in extracted.split("\n") 
         if l.strip() and "|" in l 
         and not l.startswith("KATEGORIE")]

        with driver.session() as session:
            for line in lines:
                parts = line.split("|")
                if len(parts) != 4:
                    continue

                kategorie, entitaet, eigenschaft, wert = [p.strip() for p in parts]
                kategorie = kategorie.upper()

                if kategorie == "PERSON":
                    session.run("""
                        MERGE (p:Person {name: $name})
                        SET p[$key] = $value, p.updated_at = datetime()
                    """, name=entitaet, key=eigenschaft, value=wert)
                    print(f"[Knowledge] Person aktualisiert: {entitaet}.{eigenschaft} = {wert}")

                elif kategorie == "PROJEKT":
                    session.run("""
                        MERGE (p:Project {name: $name})
                        SET p[$key] = $value, p.updated_at = datetime()
                    """, name=entitaet, key=eigenschaft, value=wert)
                    session.run("""
                        MATCH (sir:Person {name: "User"})
                        MATCH (proj:Project {name: $name})
                        MERGE (sir)-[:ARBEITET_AN]->(proj)
                    """, name=entitaet)
                    print(f"[Knowledge] Projekt aktualisiert: {entitaet}.{eigenschaft} = {wert}")

                elif kategorie == "SYSTEM":
                    session.run("""
                        MERGE (s:System {name: $name})
                        SET s[$key] = $value, s.updated_at = datetime()
                    """, name=entitaet, key=eigenschaft, value=wert)
                    print(f"[Knowledge] System aktualisiert: {entitaet}.{eigenschaft} = {wert}")

                elif kategorie == "EPISODE":
                    try:
                        requests.post(
                            f"{MEMORY_SERVER}/remember",
                            json={"text": f"{entitaet}: {wert}", "memory_type": "episode"},
                            timeout=3
                        )
                        print(f"[Knowledge] Episode gespeichert: {wert}")
                    except Exception:
                        pass

    except Exception as e:
        print(f"[Knowledge] Fehler beim Speichern: {e}")


# ─── Health Check ─────────────────────────

def knowledge_health() -> bool:
    try:
        driver.verify_connectivity()
        return True
    except Exception:
        return False