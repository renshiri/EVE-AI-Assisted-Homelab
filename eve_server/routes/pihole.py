import subprocess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from eve_graph import neo4j_driver

router = APIRouter(prefix="/api/pihole", tags=["Pi-hole"])

class PiholeActionRequest(BaseModel):
    action: str
    param: Optional[str] = ""

@router.get("/blocked-logs")
def get_pihole_blocked_logs_from_neo4j():
    if not neo4j_driver:
        return {"status": "success", "logs": []}
    
    query = """
    MATCH (d:BlockedDomain)-[:BLOCKED_BY]->(sys:System {name: 'Pi-hole'})
    RETURN d.name AS domain, toString(d.firstBlocked) AS time
    ORDER BY d.firstBlocked DESC LIMIT 30
    """
    try:
        with neo4j_driver.session() as session:
            logs = []
            for r in session.run(query):
                time_str = r["time"].replace("T", " ")[:19] if r["time"] and "T" in r["time"] else "Kürzlich"
                logs.append({"time": time_str, "domain": r["domain"]})
            return {"status": "success", "logs": logs}
    except Exception as e:
        print(f"[Neo4j Pi-hole Logs Error] {e}")
        return {"status": "success", "logs": []}

@router.post("/action")
def execute_pihole_action(req: PiholeActionRequest):
    try:
        if req.action == "gravity":
            cmd = ["docker", "exec", "pihole", "pihole", "updateGravity"]
        elif req.action == "blacklist":
            if not req.param:
                raise HTTPException(status_code=400, detail="Keine Domain angegeben.")
            cmd = ["docker", "exec", "pihole", "pihole", "wildcard", "blacklist", req.param]
        else:
            raise HTTPException(status_code=400, detail="Unbekannte Aktion.")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return {"status": "error", "message": f"Fehler: {result.stderr.strip()}"}

        return {"status": "success", "message": f"Aktion '{req.action}' erfolgreich ausgeführt."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-stats")
def get_pihole_daily_stats():
    if not neo4j_driver:
        return {"status": "success", "stats": []}
    
    query = """
    MATCH (d:BlockedDomain)-[:BLOCKED_BY]->(sys:System {name: 'Pi-hole'})
    RETURN d.name AS domain, coalesce(d.count, 1) AS count
    ORDER BY count DESC LIMIT 7
    """
    try:
        with neo4j_driver.session() as session:
            stats = []
            for r in session.run(query):
                stats.append({"domain": r["domain"], "count": r["count"]})
            return {"status": "success", "stats": stats}
    except Exception as e:
        print(f"[Neo4j Pi-hole Stats Error] {e}")
        return {"status": "success", "stats": []}