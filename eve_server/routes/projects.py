#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from eve_db import get_db_connection
from eve_graph import neo4j_driver

router = APIRouter(prefix="/api/projects", tags=["Projects"])


class ProjectCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    color: Optional[str] = "#00f0ff"


@router.get("")
def get_projects():
    """Holt alle Projekte aus SQLite inklusive Anzahl zugeordneter Tasks."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
        SELECT p.id, p.title, p.description, p.color, p.created_at,
               COUNT(t.id) as task_count
        FROM projects p
        LEFT JOIN todos t ON t.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        """
        rows = cursor.execute(query).fetchall()
        return {"status": "success", "projects": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("")
def create_project(req: ProjectCreateRequest):
    """Erstellt ein neues Projekt in SQLite (und optional als Ankerknoten in Neo4j)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    project_id = str(uuid4())
    created_at = datetime.now().isoformat()

    try:
        # 1. Speichern in SQLite
        cursor.execute(
            """
            INSERT INTO projects (id, title, description, color, created_at)
            VALUES (?, ?, ?, ?, ?)
        """,
            (project_id, req.title, req.description, req.color, created_at),
        )
        conn.commit()

        # 2. Synchronisation mit Neo4j (falls aktiv) als Graph-Ankerpunkt
        if neo4j_driver:
            query_neo4j = """
            MERGE (p:Project {id: $id})
            SET p.title = $title, p.description = $description, p.color = $color, p.created_at = $created_at
            """
            try:
                with neo4j_driver.session() as session:
                    session.run(
                        query_neo4j,
                        id=project_id,
                        title=req.title,
                        description=req.description,
                        color=req.color,
                        created_at=created_at,
                    )
            except Exception as graph_err:
                print(f"[Neo4j Sync Warning] Projekt nicht im Graphen gespiegelt: {graph_err}")

        return {
            "status": "success",
            "project": {
                "id": project_id,
                "title": req.title,
                "description": req.description,
                "color": req.color,
                "created_at": created_at,
            },
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/graph")
def get_project_graph(project_id: Optional[str] = None):
    """Schnittstelle für die Graphenansicht.
    
    Liest aktuell Knoten & Edges aus Neo4j (falls verfügbar), 
    fällt sonst auf eine SQLite-Struktur zurück.
    """
    if neo4j_driver:
        query = """
        MATCH (p:Project)
        OPTIONAL MATCH (p)-[r]-(m)
        RETURN p, type(r) AS rel_type, m
        """
        try:
            with neo4j_driver.session() as session:
                result = session.run(query)
                nodes = []
                edges = []
                seen = set()

                for record in result:
                    p = dict(record["p"])
                    if p["id"] not in seen:
                        p["is_project"] = True
                        nodes.append(p)
                        seen.add(p["id"])

                    m = dict(record["m"]) if record["m"] else None
                    if m and m.get("id") not in seen:
                        nodes.append(m)
                        seen.add(m["id"])

                    if record["rel_type"] and m:
                        edges.append({
                            "source": p["id"],
                            "target": m["id"],
                            "type": record["rel_type"]
                        })

                return {"status": "success", "nodes": nodes, "edges": edges}
        except Exception as e:
            print(f"[Neo4j Graph Fetch Error] {e}")

    # Fallback auf SQLite, falls Neo4j offline ist
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        p_rows = cursor.execute("SELECT * FROM projects").fetchall()
        t_rows = cursor.execute("SELECT * FROM todos WHERE project_id IS NOT NULL").fetchall()

        nodes = [dict(p) | {"is_project": True} for p in p_rows]
        edges = []

        for t in t_rows:
            td = dict(t)
            nodes.append(td)
            edges.append({"source": td["id"], "target": td["project_id"], "type": "BELONGS_TO"})

        return {"status": "success", "nodes": nodes, "edges": edges}
    finally:
        conn.close()


@router.delete("/{project_id}")
def delete_project(project_id: str):
    """Löscht ein Projekt aus SQLite und detach-löscht es aus Neo4j."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()

        if neo4j_driver:
            try:
                with neo4j_driver.session() as session:
                    session.run("MATCH (p:Project {id: $id}) DETACH DELETE p", id=project_id)
            except Exception as graph_err:
                print(f"[Neo4j Delete Warning] {graph_err}")

        return {"status": "success", "message": "Projekt gelöscht"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()