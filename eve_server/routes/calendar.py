#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from eve_db import get_db_connection

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


# Pydantic-Schemas für Eingabe-Validierung
class CalendarEventCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    start_datetime: str
    category: Optional[str] = "Allgemein"
    priority: Optional[str] = "Mittel"
    location: Optional[str] = ""
    recurrence: Optional[str] = "none"  # 'none', 'daily', 'weekly', 'monthly'


class CalendarEventUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    start_datetime: str
    category: Optional[str] = "Allgemein"
    priority: Optional[str] = "Mittel"
    location: Optional[str] = ""
    recurrence: Optional[str] = "none"


def fetch_calendar_events_internal():
    """Liest alle Kalenderevents direkt aus SQLite aus."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
        SELECT id, title, start_datetime, category, priority, location, recurrence
        FROM calendar_events
        ORDER BY start_datetime ASC
        """
        rows = cursor.execute(query).fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[Calendar Fetch Internal Error] {e}")
        return []
    finally:
        conn.close()


@router.get("/events")
def get_calendar_events():
    """Ruft alle Kalenderevents ab."""
    return {"status": "success", "events": fetch_calendar_events_internal()}


@router.post("/events")
def create_calendar_event(req: CalendarEventCreateRequest):
    """Erstellt ein neues Kalenderevent (einzeln oder mit Wiederholungsmuster)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    event_id = str(uuid4())

    try:
        cursor.execute(
            """
            INSERT INTO calendar_events (
                id, title, start_datetime, category, priority, location, recurrence
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                req.title.strip(),
                req.start_datetime,
                req.category,
                req.priority,
                req.location,
                req.recurrence,
            ),
        )
        conn.commit()
        return {
            "status": "success",
            "event": {
                "id": event_id,
                "title": req.title,
                "start_datetime": req.start_datetime,
                "category": req.category,
                "priority": req.priority,
                "location": req.location,
                "recurrence": req.recurrence,
            },
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/events/{event_id}")
def update_calendar_event(event_id: str, req: CalendarEventUpdateRequest):
    """Aktualisiert ein bestehendes Kalenderevent."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE calendar_events
            SET title = ?, start_datetime = ?, category = ?, priority = ?, location = ?, recurrence = ?
            WHERE id = ?
            """,
            (
                req.title.strip(),
                req.start_datetime,
                req.category,
                req.priority,
                req.location,
                req.recurrence,
                event_id,
            ),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Event nicht gefunden")

        conn.commit()
        return {"status": "success", "message": "Event aktualisiert"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/events/{event_id}")
def delete_calendar_event(event_id: str):
    """Löscht ein Kalenderevent."""
    if not event_id or event_id == "undefined" or event_id.strip() == "":
        raise HTTPException(status_code=400, detail="Ungültige oder fehlende Event-ID")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Event nicht gefunden")

        conn.commit()
        return {"status": "success", "message": "Event gelöscht", "event_id": event_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()