#!/usr/bin/env python3
from eve_graph import neo4j_driver
from eve_db import get_db_connection

def migrate_calendar():
    if not neo4j_driver:
        print("[Migration Error] Neo4j ist nicht erreichbar.")
        return

    # 1. Termine aus Neo4j auslesen
    query = """
    MATCH (e:CalendarEvent)
    RETURN e.id AS id, e.title AS title, e.start_datetime AS start_datetime, 
           e.category AS category, e.priority AS priority, e.location AS location
    """
    
    try:
        with neo4j_driver.session() as session:
            events = [dict(record) for record in session.run(query)]
        print(f"[Neo4j] {len(events)} Termine gefunden.")
    except Exception as e:
        print(f"[Neo4j Error] {e}")
        return

    if not events:
        print("Keine Termine zum Migrieren vorhanden.")
        return

    # 2. Termine in SQLite einfügen
    conn = get_db_connection()
    cursor = conn.cursor()
    migrated_count = 0

    try:
        for evt in events:
            cursor.execute("""
                INSERT OR IGNORE INTO calendar_events (
                    id, title, start_datetime, category, priority, location, recurrence
                ) VALUES (?, ?, ?, ?, ?, ?, 'none')
            """, (
                evt.get("id"),
                evt.get("title"),
                evt.get("start_datetime"),
                evt.get("category", "Allgemein"),
                evt.get("priority", "Mittel"),
                evt.get("location", "")
            ))
            migrated_count += cursor.rowcount

        conn.commit()
        print(f"[SQLite] {migrated_count} Termine erfolgreich übertragen!")
    except Exception as e:
        conn.rollback()
        print(f"[SQLite Error] {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_calendar()