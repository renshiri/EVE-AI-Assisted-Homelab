#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
from datetime import datetime
from uuid import uuid4

from eve_db import get_db_connection


def process_routines():
    """Prüft alle aktiven Routinen (täglich, wöchentlich, monatlich) und generiert fällige Todos in SQLite."""
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")        # z. B. '2026-08-31'
    current_week_str = now.strftime("%Y-W%U")   # z. B. '2026-W35'
    current_month_str = now.strftime("%Y-%m")   # z. B. '2026-08'
    
    current_iso = now.isoformat()
    current_weekday = now.weekday() + 1         # 1 = Montag, 7 = Sonntag
    current_day_of_month = now.day              # 1 bis 31

    conn = get_db_connection()
    cursor = conn.cursor()
    created_count = 0

    try:
        # Alle aktiven Routinen aus SQLite abrufen
        routines = cursor.execute("""
            SELECT id, title, priority, category, frequency, 
                   day_of_week, day_of_month, last_generated 
            FROM routines
        """).fetchall()

        for r in routines:
            r_dict = dict(r)
            freq = r_dict.get("frequency", "daily")
            last_gen = r_dict.get("last_generated")
            should_generate = False
            marker = today_str

            # A. TÄGLICHE ROUTINE
            if freq == "daily":
                if last_gen != today_str:
                    should_generate = True
                    marker = today_str

            # B. WÖCHENTLICHE ROUTINE
            elif freq == "weekly":
                target_day = int(r_dict.get("day_of_week") or 1)
                if current_weekday == target_day and last_gen != current_week_str:
                    should_generate = True
                    marker = current_week_str

            # C. MONATLICHE ROUTINE
            elif freq == "monthly":
                target_day = int(r_dict.get("day_of_month") or 1)
                if current_day_of_month == target_day and last_gen != current_month_str:
                    should_generate = True
                    marker = current_month_str

            # Falls fällig: Todo in SQLite anlegen und Routine-Marker aktualisieren
            if should_generate:
                new_todo_id = str(uuid4())
                
                # 1. Neues Todo generieren
                cursor.execute("""
                    INSERT INTO todos (id, title, priority, category, status, completed, is_note, date)
                    VALUES (?, ?, ?, ?, 'OPEN', 0, 0, ?)
                """, (
                    new_todo_id,
                    r_dict["title"],
                    r_dict.get("priority", "Mittel"),
                    r_dict.get("category", "System"),
                    current_iso
                ))

                # 2. Ausführungs-Marker in der Routine-Tabelle aktualisieren
                cursor.execute("""
                    UPDATE routines 
                    SET last_generated = ? 
                    WHERE id = ?
                """, (marker, r_dict["id"]))

                created_count += 1

        conn.commit()

        if created_count > 0:
            print(f"[Routine Worker] {created_count} Routine-Todos generiert ({today_str}).")
    except Exception as e:
        conn.rollback()
        print(f"[Routine Worker Error] {e}")
    finally:
        conn.close()

    return created_count


async def routine_scheduler_loop(interval_seconds: int = 3600):
    """Hintergrund-Schleife (standardmäßig stündliche Prüfung)."""
    while True:
        try:
            process_routines()
        except Exception as e:
            print(f"[Scheduler Loop Error] {e}")
        await asyncio.sleep(interval_seconds)