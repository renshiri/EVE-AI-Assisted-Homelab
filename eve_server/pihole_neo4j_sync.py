#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import subprocess
import json
from collections import Counter
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Lädt die Variablen aus der .env-Datei im Hauptverzeichnis
load_dotenv()

# Neo4j Zugangsdaten aus Umgebungsvariablen laden
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    raise ValueError("[EVE-SYNC] Fehler: 'NEO4J_PASSWORD' wurde nicht in der .env-Datei gefunden!")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def fetch_blocked_from_pihole():
    """Holt die letzten geblockten Domains und zählt deren Häufigkeit im Batch."""
    try:
        cmd = [
            "docker", "run", "--rm", "-v", "pihole_etc:/data", "alpine",
            "sh", "-c",
            "apk add --no-cache sqlite > /dev/null 2>&1 && sqlite3 /data/pihole-FTL.db \"SELECT domain FROM queries WHERE status IN (1, 2, 3, 4, 5, 6, 7, 8) ORDER BY timestamp DESC LIMIT 200;\""
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            print(f"[EVE-SYNC] Fehler beim Auslesen: {result.stderr.strip()}")
            return {}
        
        domains = [line.string.strip() if hasattr(line, 'string') else line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
        
        # Häufigkeiten direkt in Python zählen
        domain_counts = Counter(domains)
        return domain_counts
    except Exception as e:
        print(f"Fehler beim Auslesen von Pi-hole: {e}")
        return {}

def sync_to_neo4j(domain_counts):
    """Schreibt Domains eindeutig in Neo4j und aktualisiert die Häufigkeit."""
    if not domain_counts:
        print("[EVE-SYNC] Keine Domains zum Synchronisieren gefunden.")
        return
        
    # In eine Liste von Dictionaries für Cypher UNWIND konvertieren
    items = [{"domain": dom, "count": cnt} for dom, cnt in domain_counts.items()]
    
    query = """
    UNWIND $items AS item
    MERGE (sys:System {name: 'Pi-hole', type: 'DNS-Shield'})
    MERGE (d:BlockedDomain {name: item.domain})
    ON CREATE SET d.firstBlocked = datetime(), d.count = item.count, d.lastBlocked = datetime()
    ON MATCH SET d.count = coalesce(d.count, 0) + item.count, d.lastBlocked = datetime()
    MERGE (d)-[:BLOCKED_BY]->(sys)
    """
    
    with driver.session() as session:
        session.run(query, items=items)
        print(f"[EVE-SYNC] {len(items)} eindeutige Domains in Neo4j synchronisiert/aktualisiert.")

if __name__ == "__main__":
    print("[EVE-SYNC] Starte optimierte Pi-hole -> Neo4j Synchronisation...")
    domain_counts = fetch_blocked_from_pihole()
    sync_to_neo4j(domain_counts)
    driver.close()