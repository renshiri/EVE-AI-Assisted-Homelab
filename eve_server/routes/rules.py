from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from eve_graph import neo4j_driver

router = APIRouter(prefix="/api/rules", tags=["Rules Management"])

class RuleModel(BaseModel):
    key: str
    text: str
    category: Optional[str] = "general"
    priority: Optional[int] = 5
    active: Optional[bool] = True

# 1. Alle Regeln für die UI auflisten
@router.get("")
def get_all_rules():
    if not neo4j_driver:
        raise HTTPException(status_code=500, detail="Neo4j nicht erreichbar")
    
    query = """
    MATCH (r:Rule)
    RETURN r.key AS key, r.text AS text, r.category AS category, r.priority AS priority, r.active AS active
    ORDER BY r.priority ASC
    """
    with neo4j_driver.session() as session:
        result = session.run(query)
        rules = [dict(record) for record in result]
    return {"status": "success", "rules": rules}

# 2. Regel über die UI erstellen oder aktualisieren (MERGE/SET)
@router.post("")
def save_rule(rule: RuleModel):
    if not neo4j_driver:
        raise HTTPException(status_code=500, detail="Neo4j nicht erreichbar")
    
    query = """
    MERGE (r:Rule {key: $key})
    SET r.text = $text,
        r.category = $category,
        r.priority = $priority,
        r.active = $active,
        r.updated_at = datetime()
    RETURN r.key AS key
    """
    with neo4j_driver.session() as session:
        session.run(query, key=rule.key, text=rule.text, category=rule.category, priority=rule.priority, active=rule.active)
    
    return {"status": "success", "message": f"Regel '{rule.key}' erfolgreich im Graph gespeichert."}

# 3. Regel schnell an/ausschalten (Toggle)
@router.patch("/{key}/toggle")
def toggle_rule(key: str, active: bool):
    if not neo4j_driver:
        raise HTTPException(status_code=500, detail="Neo4j nicht erreichbar")
    
    query = "MATCH (r:Rule {key: $key}) SET r.active = $active RETURN r.key"
    with neo4j_driver.session() as session:
        session.run(query, key=key, active=active)
    
    return {"status": "success", "message": f"Regel '{key}' Status auf {active} gesetzt."}