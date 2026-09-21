from fastapi import APIRouter, Query
from eve_graph import neo4j_driver

router = APIRouter(prefix="/api/intent", tags=["Intent Routing"])

@router.get("/match")
def match_user_intent(q: str = Query(...)):
    if not neo4j_driver:
        return {"status": "error", "matched_intent": None, "scene": None}
    
    q_lower = q.lower().strip()
    query = """
    MATCH (i:Intent)
    OPTIONAL MATCH (i)-[:TRIGGERS_SCENE]->(sc:Scene)
    RETURN i.key AS key, i.keywords AS keywords, i.target_endpoint AS endpoint, sc.key AS scene_key
    """
    try:
        best_intent, best_scene, highest_score = None, None, 0
        with neo4j_driver.session() as session:
            for record in session.run(query):
                keywords = record["keywords"] or []
                score = sum(1 for kw in keywords if kw.lower() in q_lower)
                if score > highest_score:
                    highest_score = score
                    best_intent = record["key"]
                    best_scene = record["scene_key"]

        return {"status": "success", "matched_intent": best_intent, "scene": best_scene, "score": highest_score}
    except Exception as e:
        return {"status": "error", "detail": str(e)}