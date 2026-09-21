import os
from pathlib import Path as FilePath
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from eve_config import PREVIEW_DIR, NAS_DIR, ALLOWED_MEDIA_DIRS, is_safe_path, sanitize_filename
from eve_db import save_playback_position, get_playback_position, get_last_played_media
from eve_media import (
    get_media_pool_items, 
    list_nas_files, 
    save_uploaded_files, 
    create_folder, 
    delete_item,
    move_item
)

router = APIRouter(tags=["Media & Files"])


class ProgressUpdate(BaseModel):
    file_path: str
    position: float
    username: str = "guest"


@router.get("/api/media/pool")
def route_media_pool(path: str = Query(...), username: str = Query("guest")):
    return get_media_pool_items(path, username)

@router.get("/api/media/stream")
def route_media_stream(file: str = Query(...), username: str = Query("guest")):
    if username != "renshiri":
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")
    clean = os.path.abspath(file)
    if not any(is_safe_path(allowed, clean) for allowed in ALLOWED_MEDIA_DIRS) or not os.path.exists(clean):
        raise HTTPException(status_code=404, detail="Datei nicht gefunden.")
    return FileResponse(clean)

@router.post("/api/media/progress")
def save_media_progress(data: ProgressUpdate):
    """Speichert die Abspielposition eines Videos spezifisch pro User."""
    save_playback_position(data.username, data.file_path, data.position)
    return {"status": "success", "user": data.username, "file_path": data.file_path, "position": data.position}

@router.get("/api/media/progress")
def get_media_progress(file_path: str = Query(...), username: str = Query("guest")):
    """Fragt die zuletzt gespeicherte Abspielposition eines Videos für einen User ab."""
    position = get_playback_position(username, file_path)
    return {"status": "success", "user": username, "file_path": file_path, "position": position}

@router.get("/api/media/last-played")
def route_get_last_played(username: str = Query("guest"), folder_path: Optional[str] = Query(None)):
    """Gibt das zuletzt wiedergegebene Video für einen User aus der Datenbank zurück (optional ordnerspezifisch)."""
    last_item = get_last_played_media(username, folder_path=folder_path)
    return {"status": "success", "item": last_item}

@router.get("/api/files")
def route_files(path: str = "", username: str = "guest"):
    return list_nas_files(path, username)

@router.get("/api/files/download")
def route_file_download(path: str, username: str = "guest"):
    file_path = FilePath(path).resolve() if username == "renshiri" else (FilePath(NAS_DIR).resolve() / path).resolve()
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden.")
    return FileResponse(path=file_path, filename=file_path.name)

@router.post("/api/files/upload")
async def route_file_upload(
    target_path: str = Form(""),
    username: str = Form("guest"),
    files: List[UploadFile] = File(...)
):
    return await save_uploaded_files(target_path, files, username)

@router.post("/api/files/mkdir")
def route_create_folder(
    target_path: str = Form(""),
    folder_name: str = Form(...),
    username: str = Form("guest")
):
    return create_folder(target_path, folder_name, username)

@router.delete("/api/files/delete")
def route_delete_item(
    path: str = Query(...),
    username: str = Query("guest")
):
    return delete_item(path, username)

@router.get("/api/reports")
def list_reports():
    p = FilePath(PREVIEW_DIR)
    if not p.exists(): return {"status": "error", "reports": []}
    return {"status": "success", "reports": [{"title": f.stem.replace("_", " ").title(), "filename": f.name} for f in p.glob("*.html")]}

@router.get("/preview/{thema}", response_class=HTMLResponse)
def get_preview(thema: str):
    preview_path = os.path.join(PREVIEW_DIR, f"{sanitize_filename(thema)}.html")
    if os.path.exists(preview_path):
        with open(preview_path, "r", encoding="utf-8") as f: return f.read()
    return "<html><body><h1>Analyse läuft noch...</h1></body></html>"

@router.post("/api/files/move")
def route_move_item(
    src_path: str = Form(...),
    dest_path: str = Form(...),
    username: str = Form("guest")
):
    return move_item(src_path, dest_path, username)