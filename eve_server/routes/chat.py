from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import asyncio

from context_builder import ContextBuilder, LLMEngine
from eve_graph import store_knowledge_in_graph, extract_and_store_graph_facts, neo4j_driver
from eve_memory import add_chat_to_memory
from eve_weather import fetch_open_meteo_weather
from eve_config import EVE_CACHE

router = APIRouter(tags=["Chat & UI"])

llm_engine = LLMEngine()

class UIConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def push_scene_change(self, scene_name: str, payload: dict = None):
        msg = {"type": "SWITCH_SCENE", "scene": scene_name, "payload": payload or {}}
        for conn in list(self.active_connections):
            try:
                await conn.send_json(msg)
            except Exception:
                pass

ui_manager = UIConnectionManager()

class ResearchRequest(BaseModel):
    thema: str
    template_key: Optional[str] = "standard_report_template"
    username: Optional[str] = "renshiri"
    lat: Optional[float] = 50.7753
    lon: Optional[float] = 6.0839

class ChatMsg(BaseModel):
    sender: str
    text: str
    timestamp: str

chat_history_db = []

@router.websocket("/ws/ui")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if token:
        from routes.auth import verify_session_token
        if not verify_session_token(token):
            await websocket.close(code=1008)
            return
    await ui_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ui_manager.disconnect(websocket)

@router.post("/api/ui/switch")
async def trigger_ui_switch(scene: str):
    await ui_manager.push_scene_change(scene)
    return {"status": "success", "switched_to": scene}

@router.get("/api/chat/history")
def get_chat_history():
    return {"status": "success", "messages": chat_history_db}

@router.post("/api/chat/message")
def post_chat_message(msg: ChatMsg):
    chat_history_db.append(msg.dict())
    if len(chat_history_db) > 100:
        chat_history_db.pop(0)
    return {"status": "success"}

@router.post("/api/chat")
async def handle_chat_message(req: ResearchRequest):
    try:
        user_msg = req.thema.lower().strip()
        username = req.username or "renshiri"

        # Befehle direkt behandeln
        if user_msg in ["/reload_brain", "/update_brain"]:
            if neo4j_driver:
                update_query = """
                MATCH (p:Prompt {key: "system_persona"})
                SET p.text = "Du bist EVE, ein hochentwickeltes KI-System und agierst wie JARVIS. Du hast direkten Zugriff auf den lokalen Kalender, System-Metriken, feste Stammdaten und das Vektor-Gedächtnis. Behaupte NIEMALS, dass du keinen Zugriff auf persönliche Daten hast. Sprich den Benutzer stets höflich mit 'Sir' an, antworte hochpräzise, elegant und direkt auf den Punkt."
                RETURN p.key
                """
                with neo4j_driver.session() as session:
                    session.run(update_query)
            
            EVE_CACHE["whitelist_domains"]["last_updated"] = 0
            
            async def single_response():
                msg = "🧠 System-Persona in Neo4j aktualisiert & Caches geleert, Sir!"
                yield f"data: {json.dumps({'token': msg})}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(single_response(), media_type="text/event-stream")

        if user_msg == "/weather":
            async def weather_response():
                w_text = fetch_open_meteo_weather(lat=req.lat, lon=req.lon)
                yield f"data: {json.dumps({'token': w_text})}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(weather_response(), media_type="text/event-stream")

        if user_msg == "/logs":
            async def logs_response():
                yield f"data: {json.dumps({'token': '🖥️ Szenenwechsel zu den System-Logs durchgeführt.'})}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(logs_response(), media_type="text/event-stream")

        extract_and_store_graph_facts(req.thema, user_id=username)

        builder = ContextBuilder(
            user_msg=req.thema, 
            username=username, 
            lat=req.lat, 
            lon=req.lon
        )
        full_prompt = builder.assemble()

        if builder.scene_key:
            await ui_manager.push_scene_change(builder.scene_key)

        # STREAM GENERATOR SCHLEIFE
        async def text_stream_generator():
            full_reply = ""
            
            if hasattr(llm_engine, "generate_stream"):
                async for chunk in llm_engine.generate_stream(system_prompt=full_prompt, user_msg=req.thema):
                    if chunk:
                        full_reply += chunk
                        yield f"data: {json.dumps({'token': chunk})}\n\n"
                        await asyncio.sleep(0)  # Verhindert Event-Loop Blocking
            else:
                reply = await llm_engine.generate(system_prompt=full_prompt, user_msg=req.thema)
                full_reply = reply
                words = reply.split(" ")
                for i, w in enumerate(words):
                    space = " " if i > 0 else ""
                    yield f"data: {json.dumps({'token': space + w})}\n\n"
                    await asyncio.sleep(0.01)

            # Signalisiert dem Frontend das saubere Ende
            yield "data: [DONE]\n\n"

            # Nach dem Beenden des Streams Gedächtnis aktualisieren
            try:
                add_chat_to_memory(req.thema, full_reply, username=username)
                store_knowledge_in_graph(
                    topic=req.thema, 
                    text_content=f"User ({username}): {req.thema} | EVE: {full_reply}",
                    source="EVE-Live-Chat"
                )
            except Exception as e:
                print(f"[Memory-Update Error] {e}")

        return StreamingResponse(
            text_stream_generator(), 
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))