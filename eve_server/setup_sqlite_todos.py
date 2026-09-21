import os
import sqlite3

# Ordner für SQLite-DB anlegen
os.makedirs("data/sqlite", exist_ok=True)
db_path = "data/sqlite/eve.db"


def init_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # WAL-Modus aktivieren (Massive Performance-Steigerung bei Lese/Schreibzugriffen)
    cursor.execute("PRAGMA journal_mode=WAL;")

    # Tabelle für Projekte
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Tabelle für Todos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority INTEGER DEFAULT 1,
        project_id INTEGER,
        due_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
    );
    """)

    conn.commit()
    conn.close()
    print(f"Erfolg! SQLite-Datenbank unter '{db_path}' initialisiert.")


if __name__ == "__main__":
    init_db()