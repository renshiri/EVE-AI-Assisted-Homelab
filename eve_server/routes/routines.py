#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from eve_db import get_db_connection
from routine_worker import process_routines

router = APIRouter(prefix="/api/routines", tags=["Routines"])


class RoutineCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    priority: Optional[str] = "Mittel"
    category: Optional[str] = "System"
    frequency: Optional[str] = "daily"     # 'daily', 'weekly', 'monthly'
    day_of_week: Optional[int] = 1         # 1 = Montag, 7 = Sonntag
    day_of_month: Optional[int] = 1        # 1 bis 31


@router.get("")
def get_routines():
    """Ruft alle angelegten Routine-Templates aus SQLite ab."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
        SELECT id, title, priority, category, frequency, 
               day_of_week, day_of_month, last_generated, created_at
        FROM routines
        ORDER BY created_at DESC
        """
        rows = cursor.execute(query).fetchall()
        return {"status": "success", "routines": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("")
def create_routine(req: RoutineCreateRequest):
    """Erstellt ein neues Routine-Template in SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()

    routine_id = str(uuid4())
    created_at = datetime.now().isoformat()

    try:
        cursor.execute(
            """
            INSERT INTO routines (
                id, title, priority, category, frequency, 
                day_of_week, day_of_month, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                routine_id,
                req.title.strip(),
                req.priority,
                req.category,
                req.frequency,
                req.day_of_week,
                req.day_of_month,
                created_at,
            ),
        )
        conn.commit()

        # Nach der Erstellung sofort prüfen, ob die Routine heute fällig ist
        try:
            process_routines()
        except Exception as worker_err:
            print(f"[Routine Worker Warning] Erstausführung fehlgeschlagen: {worker_err}")

        return {
            "status": "success",
            "routine": {
                "id": routine_id,
                "title": req.title,
                "priority": req.priority,
                "category": req.category,
                "frequency": req.frequency,
                "day_of_week": req.day_of_week,
                "day_of_month": req.day_of_month,
                "created_at": created_at,
            },
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/trigger")
def trigger_routine_worker():
    """Stößt den Routine-Worker manuell an."""
    try:
        count = process_routines()
        return {
            "status": "success",
            "message": f"Worker ausgeführt. {count} Routine-Todos generiert.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Worker-Fehler: {str(e)}")


@router.delete("/{routine_id}")
def delete_routine(routine_id: str):
    """Löscht ein Routine-Template aus SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM routines WHERE id = ?", (routine_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Routine nicht gefunden")

        conn.commit()
        return {"status": "success", "message": "Routine gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()