import os
import subprocess
import time
from pathlib import Path as FilePath

import docker
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import psutil

from eve_graph import get_system_topology_from_graph

router = APIRouter(tags=["System & Metrics"])

try:
    docker_client = docker.from_env()
except Exception:
    docker_client = None

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

_last_net_bytes_sent = None
_last_net_bytes_recv = None
_last_net_time = None


@router.get("/api/system/metrics")
def get_system_metrics():
    global _last_net_bytes_sent, _last_net_bytes_recv, _last_net_time
    cpu_usage, ram_percent, ram_used_gb, ram_total_gb = 0, 0, 0, 0
    try:
        cpu_usage = psutil.cpu_percent(interval=None)
        ram = psutil.virtual_memory()
        ram_percent = ram.percent
        ram_used_gb = round(ram.used / (1024**3), 1)
        ram_total_gb = round(ram.total / (1024**3), 1)
    except Exception as e:
        print(f"[Metrics RAM/CPU Error] {e}")

    disk_percent, disk_used_gb, disk_total_gb = 0, 0, 0
    try:
        disk = psutil.disk_usage("/")
        disk_percent = disk.percent
        disk_used_gb = round(disk.used / (1024**3), 1)
        disk_total_gb = round(disk.total / (1024**3), 1)
    except Exception as e:
        print(f"[Metrics Disk Error] {e}")

    cpu_temp = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for key in ["k10temp", "acpitz", "coretemp", "cpu_thermal"]:
                if key in temps and len(temps[key]) > 0:
                    cpu_temp = round(temps[key][0].current, 1)
                    break
    except Exception as e:
        print(f"[Metrics Temp Error] {e}")

    net_rx_kbs = 0.0
    net_tx_kbs = 0.0
    try:
        now = time.time()
        net = psutil.net_io_counters()
        if _last_net_time is not None and _last_net_time > 0:
            time_delta = now - _last_net_time
            if time_delta > 0:
                net_tx_kbs = round(
                    ((net.bytes_sent - _last_net_bytes_sent) / 1024) / time_delta, 1
                )
                net_rx_kbs = round(
                    ((net.bytes_recv - _last_net_bytes_recv) / 1024) / time_delta, 1
                )

        _last_net_bytes_sent = net.bytes_sent
        _last_net_bytes_recv = net.bytes_recv
        _last_net_time = now
    except Exception as e:
        print(f"[Metrics Net Error] {e}")

    return {
        "status": "success",
        "cpu_percent": cpu_usage,
        "cpu_temp": cpu_temp,
        "ram_percent": ram_percent,
        "ram_used_gb": ram_used_gb,
        "ram_total_gb": ram_total_gb,
        "disk_percent": disk_percent,
        "disk_used_gb": disk_used_gb,
        "disk_total_gb": disk_total_gb,
        "net_rx_kbs": max(0.0, net_rx_kbs),
        "net_tx_kbs": max(0.0, net_tx_kbs),
    }


@router.get("/api/logs")
def get_system_logs(service: str = "eve-server"):
    target = (
        "hypixel-worker.service"
        if service == "hypixel-worker"
        else "eve-server.service"
    )
    try:
        res = subprocess.run(
            ["journalctl", "-u", target, "-n", "15", "--no-pager"],
            capture_output=True,
            text=True,
            check=True,
        )
        return {
            "status": "success",
            "service": service,
            "logs": [l.strip() for l in res.stdout.split("\n") if l.strip()],
        }
    except Exception:
        return {"status": "error", "logs": ["Fehler beim Laden der System-Logs."]}


@router.get("/api/system/topology", response_class=PlainTextResponse)
def get_topology():
    return get_system_topology_from_graph()


@router.get("/api/services/status")
def get_services_status():
    python_scripts = [
        "eve_server.py",
        "hypixel_worker.py",
        "eve_graph.py",
        "eve_memory.py",
        "eve_media.py",
        "eve_research.py",
        "eve_weather.py",
        "eve_config.py",
    ]
    docker_services = [
        {"name": "neo4j", "match": "neo4j"},
        {"name": "pihole", "match": "pihole"},
    ]
    active_containers = []
    if docker_client:
        try:
            active_containers = docker_client.containers.list(all=True)
        except Exception:
            pass

    running_processes = []
    for proc in psutil.process_iter(["pid", "name", "cmdline", "status"]):
        try:
            cmdline = proc.info.get("cmdline")
            if cmdline:
                running_processes.append(" ".join(cmdline))
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    services_status = []

    for ds in docker_services:
        container = next(
            (c for c in active_containers if ds["match"] in c.name.lower()), None
        )
        status = container.status if container else "crashed"
        details = (
            f"Docker Container ({container.short_id})"
            if container
            else "Container nicht aktiv"
        )
        services_status.append(
            {"name": ds["name"], "type": "docker", "status": status, "details": details}
        )

    server_running = any(
        "eve_server" in cmd or "uvicorn" in cmd for cmd in running_processes
    )

    for script in python_scripts:
        is_active = (
            server_running
            if script
            in [
                "eve_server.py",
                "eve_graph.py",
                "eve_memory.py",
                "eve_media.py",
                "eve_research.py",
                "eve_weather.py",
                "eve_config.py",
            ]
            else any("hypixel_worker" in cmd for cmd in running_processes)
        )
        services_status.append(
            {
                "name": script,
                "type": "python",
                "status": "running" if is_active else "stopped",
                "details": "Aktiv im Backend" if is_active else "Inaktiv",
            }
        )

    return {"status": "success", "services": services_status}


@router.get("/api/services/{service_name}/logs")
def get_service_logs(service_name: str, tail: int = 150):
    if docker_client:
        try:
            container = docker_client.containers.get(service_name)
            logs = container.logs(tail=tail, timestamps=True).decode("utf-8")
            return {"status": "success", "service": service_name, "logs": logs}
        except Exception:
            pass
    service_id = (
        "eve-server"
        if service_name.endswith(".py") or service_name == "eve-server"
        else service_name
    )
    try:
        result = subprocess.run(
            [
                "journalctl",
                "-u",
                f"{service_id}.service",
                "-n",
                str(tail),
                "--no-pager",
            ],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if result.returncode == 0 and result.stdout.strip():
            return {
                "status": "success",
                "service": service_name,
                "logs": result.stdout,
            }
    except Exception:
        pass

    raise HTTPException(
        status_code=404,
        detail=f"Dienst '{service_name}' nicht gefunden oder keine Logs verfügbar.",
    )


@router.get("/api/backend/scripts")
def list_backend_scripts(username: str = "guest"):
    try:
        scripts = []
        seen_names = set()
        search_paths = [
            FilePath("/home/renshiri/services/eve_server"),
            FilePath(BACKEND_DIR),
            FilePath(os.getcwd()),
        ]
        for target_path in search_paths:
            if target_path.exists() and target_path.is_dir():
                for entry in target_path.rglob("*.py"):
                    if ".venv" in entry.parts or "__pycache__" in entry.parts:
                        continue
                    if entry.name not in seen_names:
                        seen_names.add(entry.name)
                        try:
                            size_str = f"{round(entry.stat().st_size / 1024, 1)} KB"
                        except Exception:
                            size_str = "0 KB"
                        scripts.append(
                            {"name": entry.name, "size": size_str, "path": str(entry)}
                        )
        # Erst nach Durchlauf aller Pfade zurückgeben:
        return {"status": "success", "scripts": sorted(scripts, key=lambda x: x["name"])}
    except Exception as e:
        print(f"[API Error /api/backend/scripts]: {e}")
        return {"status": "success", "scripts": []}


@router.get("/api/backend/scripts/view")
def view_backend_script(filename: str, username: str = "guest"):
    # Erlaube auch relative Pfade aus Unterordnern, verwehre aber Directory Traversal ("..")
    normalized_filename = os.path.normpath(filename).lstrip("/\\")

    if ".." in normalized_filename.split(os.sep) or not normalized_filename.endswith(
        ".py"
    ):
        raise HTTPException(
            status_code=400, detail="Ungültiger oder unzulässiger Dateipfad."
        )

    # Mögliche Basisverzeichnisse durchsuchen
    base_paths = [
        FilePath(BACKEND_DIR),
        FilePath("/home/renshiri/services/eve_server"),
        FilePath(os.getcwd()),
    ]

    found_script = None

    for base in base_paths:
        # 1. Prüfe direkten relativen Pfad (z. B. "subfolder/script.py")
        candidate = base / normalized_filename
        if candidate.exists() and candidate.is_file():
            found_script = candidate
            break

        # 2. Fallback: Suche nach dem Dateinamen, falls nur der Name ohne Unterordner übergeben wurde
        safe_basename = os.path.basename(normalized_filename)
        if base.exists() and base.is_dir():
            matches = list(base.rglob(safe_basename))
            if matches:
                found_script = matches[0]
                break

    if not found_script or not found_script.exists():
        raise HTTPException(status_code=404, detail="Skript nicht gefunden.")

    try:
        content = found_script.read_text(encoding="utf-8")
        return {
            "status": "success",
            "filename": found_script.name,
            "path": str(found_script),
            "content": content,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ServerActionRequest(BaseModel):
    action: str
    target: str = "eve-server"


@router.post("/api/server/action")
def execute_system_server_action(req: ServerActionRequest):
    """Führt Server-Steuerungsaktionen wie Neustart von Diensten oder Status-Checks aus."""
    action = req.action.lower().strip()
    target = req.target.strip()

    allowed_services = {
        "eve-server": "eve-server.service",
        "hypixel-worker": "hypixel-worker.service"
    }

    if action == "restart_service":
        service_unit = allowed_services.get(target)
        if not service_unit:
            raise HTTPException(status_code=400, detail=f"Unbekannter Dienst: {target}")
        try:
            subprocess.run(["systemctl", "restart", service_unit], check=True, timeout=10)
            return {"status": "success", "message": f"Dienst '{target}' neu gestartet."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fehler beim Neustart von {target}: {e}")

    elif action == "ping":
        return {"status": "success", "message": "pong"}

    else:
        return {"status": "success", "message": f"Aktion '{action}' empfangen."}