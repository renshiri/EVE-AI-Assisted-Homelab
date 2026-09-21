# routes/minecraft.py
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import subprocess
import os
import shutil

router = APIRouter(prefix="/api/minecraft", tags=["minecraft_control"])

CONTAINER_NAME = "minecraft-server"
# Pfad zum Server-Ordner auf dem Host/Container-Volume
SERVER_DIR = os.getenv("MINECRAFT_DIR", "/home/renshiri/mc-docker/data")
PLUGINS_DIR = os.path.join(SERVER_DIR, "plugins")

class ActionRequest(BaseModel):
    action: str

class RconRequest(BaseModel):
    command: str

class LuckPermsRequest(BaseModel):
    target_type: str  # 'user' oder 'group'
    target_name: str
    action: str       # 'permission set', 'parent set', 'info'
    value: str = ""

# --- 1. STATUS & METRIKEN ---
@router.get("/status")
async def get_minecraft_status():
    try:
        res = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME],
            capture_output=True, text=True
        )
        is_running = res.stdout.strip() == "true"

        if not is_running:
            return {"online": False, "playersOnline": 0, "maxPlayers": 100, "cpuPercent": 0, "ramUsedMb": 0, "ramTotalMb": 4096}

        # Stats abfragen
        stats_res = subprocess.run(
            ["docker", "stats", CONTAINER_NAME, "--no-stream", "--format", "{{.CPUPerc}};{{.MemUsage}}"],
            capture_output=True, text=True
        )
        stats_data = stats_res.stdout.strip().split(";")
        cpu = stats_data[0].replace("%", "") if len(stats_data) > 0 else "0"
        
        return {
            "online": True,
            "playersOnline": 0,
            "maxPlayers": 100,
            "cpuPercent": float(cpu) if cpu else 0.0,
            "ramUsedMb": 1850,
            "ramTotalMb": 4096
        }
    except Exception as e:
        return {"online": False, "error": str(e)}

# --- 2. POWER ACTIONS ---
@router.post("/action")
async def execute_container_action(req: ActionRequest):
    action = req.action.lower()
    if action not in ["start", "stop", "restart"]:
        raise HTTPException(status_code=400, detail="Ungültige Aktion")

    try:
        subprocess.run(["docker", action, CONTAINER_NAME], check=True)
        return {"status": "success", "message": f"Server {action} wurde ausgeführt."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker-Fehler: {str(e)}")

# --- 3. KONSOLE & RCON ---
@router.post("/rcon")
async def send_rcon_command(req: RconRequest):
    try:
        cmd = ["docker", "exec", CONTAINER_NAME, "rcon-cli", req.command]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"status": "success", "response": res.stdout.strip() or "Befehl ausgeführt."}
    except Exception as e:
        return {"status": "error", "response": f"Fehler: {str(e)}"}

# --- 4. CONTAINER LOGS ---
@router.get("/logs")
async def get_server_logs(lines: int = 100):
    try:
        cmd = ["docker", "logs", "--tail", str(lines), CONTAINER_NAME]
        res = subprocess.run(cmd, capture_output=True, text=True)
        log_lines = res.stdout.splitlines() + res.stderr.splitlines()
        return {"status": "success", "logs": log_lines[-lines:]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log-Fehler: {str(e)}")

# --- 5. PLUGIN MANAGER ---
@router.get("/plugins")
async def list_plugins():
    try:
        if not os.path.exists(PLUGINS_DIR):
            return {"plugins": []}
        files = [f for f in os.listdir(PLUGINS_DIR) if f.endswith(".jar")]
        return {"plugins": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Lesen der Plugins: {str(e)}")

@router.post("/plugins/upload")
async def upload_plugin(file: UploadFile = File(...)):
    try:
        os.makedirs(PLUGINS_DIR, exist_ok=True)
        file_path = os.path.join(PLUGINS_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "message": f"Plugin {file.filename} erfolgreich hochgeladen."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload-Fehler: {str(e)}")

# --- 6. LUCKPERMS STEUERUNG ---
@router.post("/luckperms")
async def execute_luckperms(req: LuckPermsRequest):
    try:
        # Erstellt automatisch z.B. "lp user Player permission set group.admin"
        full_cmd = f"lp {req.target_type} {req.target_name} {req.action} {req.value}".strip()
        cmd = ["docker", "exec", CONTAINER_NAME, "rcon-cli", full_cmd]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"status": "success", "response": res.stdout.strip()}
    except Exception as e:
        return {"status": "error", "response": f"LuckPerms-Fehler: {str(e)}"}