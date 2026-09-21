import os
import asyncio
import pty
import select
import fcntl
import subprocess
import json
import struct
import termios
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from routes.auth import verify_session_token

router = APIRouter(tags=["Terminal"])

def resize_pty(fd, rows, cols):
    """Aktualisiert die Zeilen- und Spaltenanzahl des PTY-Terminals."""
    try:
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except Exception:
        pass

@router.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    user = verify_session_token(token)
    if not user:
        # Abweisen bei fehlendem oder ungültigem Session-Token
        await websocket.close(code=1008)
        return

    await websocket.accept()
    master_fd, slave_fd = pty.openpty()
    
    # WICHTIG: Sofort eine Standardgröße setzen, damit Bash nicht mit 0x0 startet und leer bleibt
    resize_pty(master_fd, 24, 80)
    
    # Startet den Prozess direkt im Root-Verzeichnis ('/')
    p = subprocess.Popen(
        ["bash"], 
        preexec_fn=os.setsid, 
        stdin=slave_fd, 
        stdout=slave_fd, 
        stderr=slave_fd, 
        text=False,
        cwd="/"
    )
    os.close(slave_fd)

    flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    async def read_from_pty():
        try:
            while p.poll() is None:
                r, _, _ = select.select([master_fd], [], [], 0.1)
                if r:
                    try:
                        data = os.read(master_fd, 1024)
                        if data:
                            await websocket.send_text(data.decode('utf-8', errors='ignore'))
                    except OSError:
                        break
                await asyncio.sleep(0.01)
        except Exception:
            pass

    read_task = asyncio.create_task(read_from_pty())

    try:
        while True:
            message = await websocket.receive_text()
            
            # Prüfen, ob es sich um eine JSON-Steuerungsnachricht handelt (z.B. Resize)
            try:
                parsed = json.loads(message)
                if isinstance(parsed, dict) and parsed.get("type") == "resize":
                    resize_pty(master_fd, parsed.get("rows", 24), parsed.get("cols", 80))
                    continue
            except json.JSONDecodeError:
                pass

            # Reguläre Tasteneingaben an das Terminal senden
            if message:
                os.write(master_fd, message.encode('utf-8'))
                
    except WebSocketDisconnect:
        pass
    finally:
        read_task.cancel()
        try:
            p.terminate()
            p.wait(timeout=1)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except Exception:
            pass