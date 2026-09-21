#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from eve_db import get_db_connection

router = APIRouter(prefix="/api/todos", tags=["Todos"])


class TodoCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    priority: Optional[str] = "Mittel"
    category: Optional[str] = "System"
    depends_on_id: Optional[str] = None
    project_id: Optional[str] = None
    is_note: Optional[bool] = False


class DependencyRequest(BaseModel):
    task_id: str
    depends_on_id: str


class StatusUpdateRequest(BaseModel):
    completed: Optional[bool] = None
    status: Optional[str] = None


@router.get("")
def get_todos(
    mode: Optional[str] = Query("all", description="Modes: 'all' or 'ready'"),
    project_id: Optional[str] = Query(None, description="Optionaler Projekt-Filter")
):
    """Holt Todos aus SQLite.
    
    Ermöglicht das Filtern nach 'ready' sowie gezielt nach 'project_id'.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conditions = []
        params = []

        if mode == "ready":
            conditions.append("(t.completed = 0 OR t.completed IS NULL)")
            conditions.append("(t.depends_on_id IS NULL OR dep.completed = 1)")

        if project_id and project_id != "all":
            conditions.append("t.project_id = ?")
            params.append(project_id)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        query = f"""
        SELECT t.* FROM todos t
        LEFT JOIN todos dep ON t.depends_on_id = dep.id
        {where_clause}
        ORDER BY t.date DESC
        """

        rows = cursor.execute(query, params).fetchall()

        todos = []
        for r in rows:
            d = dict(r)
            d["completed"] = bool(d["completed"])
            d["is_note"] = bool(d["is_note"])
            d["dependsOnIds"] = [d["depends_on_id"]] if d["depends_on_id"] else []
            todos.append(d)

        return {"status": "success", "todos": todos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("")
def create_todo(req: TodoCreateRequest):
    """Erstellt ein Todo/Notiz oder führt einen Bulk-Import durch."""
    conn = get_db_connection()
    cursor = conn.cursor()
    current_date = datetime.now().isoformat()

    lines = [
        line.strip("- *•").strip()
        for line in req.title.split("\n")
        if line.strip()
    ]

    try:
        if len(lines) > 1 and not req.is_note:
            created_nodes = []
            parent_id = req.depends_on_id

            for idx, line in enumerate(lines):
                todo_id = str(uuid4())
                p_id = req.project_id if idx == 0 else None

                cursor.execute(
                    """
                    INSERT INTO todos (id, title, priority, category, status, completed, is_note, date, project_id, depends_on_id)
                    VALUES (?, ?, ?, ?, 'OPEN', 0, 0, ?, ?, ?)
                """,
                    (todo_id, line, req.priority, req.category, current_date, p_id, parent_id),
                )

                created_nodes.append({"id": todo_id, "title": line, "completed": False})
                parent_id = todo_id

            conn.commit()
            return {"status": "success", "bulk": True, "count": len(created_nodes), "todos": created_nodes}

        todo_id = str(uuid4())
        status = "INFO" if req.is_note else "OPEN"

        cursor.execute(
            """
            INSERT INTO todos (id, title, priority, category, status, completed, is_note, date, project_id, depends_on_id)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        """,
            (
                todo_id,
                req.title,
                req.priority,
                req.category,
                status,
                int(req.is_note or False),
                current_date,
                req.project_id,
                req.depends_on_id,
            ),
        )

        conn.commit()
        return {
            "status": "success",
            "todo": {
                "id": todo_id,
                "title": req.title,
                "priority": req.priority,
                "category": req.category,
                "completed": False,
                "status": status,
                "date": current_date,
                "is_note": req.is_note or False,
                "dependsOnIds": [req.depends_on_id] if req.depends_on_id else [],
                "project_id": req.project_id
            },
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/{todo_id}/assign-project")
def assign_project_to_todo(todo_id: str, project_id: Optional[str] = None):
    """Ordnet ein Todo einem Projekt zu oder hebt die Zuordnung auf (project_id = None)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if project_id:
            proj = cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
            if not proj:
                raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

        cursor.execute("UPDATE todos SET project_id = ? WHERE id = ?", (project_id, todo_id))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Todo nicht gefunden")

        conn.commit()
        return {"status": "success", "message": "Projektzuordnung aktualisiert", "todo_id": todo_id, "project_id": project_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/{todo_id}/status")
def update_todo_status(todo_id: str, req: StatusUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        completed_val = int(req.completed) if req.completed is not None else None

        cursor.execute(
            """
            UPDATE todos 
            SET completed = COALESCE(?, completed),
                status = COALESCE(?, status)
            WHERE id = ?
        """,
            (completed_val, req.status, todo_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Todo nicht gefunden")

        conn.commit()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{todo_id}")
def delete_todo(todo_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        conn.commit()
        return {"status": "success", "message": "Todo gelöscht"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()