#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "data", "sqlite")
DB_PATH = os.path.join(DB_DIR, "eve.db")

os.makedirs(DB_DIR, exist_ok=True)


def get_db_connection():
    """Erstellt eine sichere Verbindung zur SQLite-Datenbank."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Sicherheits- und Performance-Pragmas
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = DELETE;")
    return conn


def init_sqlite_tables():
    """Initialisiert alle benötigten Tabellen mit relationalen Integritätsregeln."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tabellen-Definitionen
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#00f0ff',
        created_at TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'Mittel',
        category TEXT DEFAULT 'System',
        status TEXT DEFAULT 'OPEN',
        completed INTEGER DEFAULT 0,
        is_note INTEGER DEFAULT 0,
        date TEXT,
        project_id TEXT,
        depends_on_id TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
        FOREIGN KEY (depends_on_id) REFERENCES todos (id) ON DELETE SET NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_datetime TEXT NOT NULL,
        category TEXT DEFAULT 'Allgemein',
        priority TEXT DEFAULT 'Mittel',
        location TEXT DEFAULT '',
        recurrence TEXT DEFAULT 'none'
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        priority TEXT DEFAULT 'Mittel',
        category TEXT DEFAULT 'System',
        frequency TEXT DEFAULT 'daily',
        day_of_week INTEGER DEFAULT 1,
        day_of_month INTEGER DEFAULT 1,
        last_generated TEXT,
        created_at TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at REAL NOT NULL,
        last_seen REAL NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS media_progress (
        username TEXT NOT NULL,
        file_path TEXT NOT NULL,
        position REAL DEFAULT 0.0,
        updated_at REAL NOT NULL,
        PRIMARY KEY (username, file_path)
    );
    """)

    # Auto-Migration: Stelle sicher, dass recurrence in alten calendar_events existiert
    try:
        cursor.execute("ALTER TABLE calendar_events ADD COLUMN recurrence TEXT DEFAULT 'none';")
    except sqlite3.OperationalError:
        pass  # Spalte existiert bereits

    # 2. Performance-Indizes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_depends ON todos(depends_on_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start_datetime);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_media_updated ON media_progress(username, updated_at);")

    conn.commit()
    conn.close()
    print("[SQLite] Datenbank & Tabellen erfolgreich verifiziert.")


def save_playback_position(username: str, file_path: str, position: float):
    """Speichert oder aktualisiert die Abspielposition eines Benutzers."""
    import time
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO media_progress (username, file_path, position, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username, file_path) DO UPDATE SET
            position = excluded.position,
            updated_at = excluded.updated_at;
    """, (username, file_path, position, time.time()))
    conn.commit()
    conn.close()


def get_playback_position(username: str, file_path: str) -> float:
    """Liest die gespeicherte Abspielposition für einen Benutzer aus."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT position FROM media_progress 
        WHERE username = ? AND file_path = ?;
    """, (username, file_path))
    row = cursor.fetchone()
    conn.close()
    return row["position"] if row else 0.0


def get_last_played_media(username: str, folder_path: str = None):
    """Liest den zuletzt wiedergewonnenen Inhalt eines Benutzers aus.
    Optional gefiltert nach einem spezifischen Ordnerpfad.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if folder_path:
        clean_folder = folder_path.rstrip('/') + '/'
        cursor.execute("""
            SELECT file_path, position, updated_at 
            FROM media_progress 
            WHERE username = ? AND file_path LIKE ?
            ORDER BY updated_at DESC 
            LIMIT 1;
        """, (username, f"{clean_folder}%"))
    else:
        cursor.execute("""
            SELECT file_path, position, updated_at 
            FROM media_progress 
            WHERE username = ? 
            ORDER BY updated_at DESC 
            LIMIT 1;
        """, (username,))
        
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


if __name__ == "__main__":
    init_sqlite_tables()