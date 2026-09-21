#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import shutil
import urllib.parse
from pathlib import Path as FilePath
from datetime import datetime
from typing import List
from fastapi import HTTPException, UploadFile

from eve_config import ALLOWED_MEDIA_DIRS, NAS_DIR, is_safe_path

def resolve_target_dir(path: str = "", username: str = "guest") -> FilePath:
    """Ermittelt und validiert das Zielverzeichnis sicher je nach Benutzerrechten."""
    base_path = FilePath("/").resolve() if username == "renshiri" else FilePath(NAS_DIR).resolve()
    
    if not path or path == "/":
        target = base_path
    else:
        p = FilePath(path)
        if p.is_absolute():
            target = p.resolve()
        else:
            target = (base_path / path).resolve()

    if username != "renshiri" and not is_safe_path(str(base_path), str(target)):
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    return target

def get_media_pool_items(path: str, username: str = "guest"):
    if username != "renshiri":
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    clean_path = os.path.abspath(path)
    if not any(is_safe_path(allowed, clean_path) for allowed in ALLOWED_MEDIA_DIRS):
        raise HTTPException(status_code=403, detail="Unzulässiger Medien-Pfad.")

    if not os.path.exists(clean_path):
        return {"items": [], "current_path": clean_path}

    valid_extensions = {
        "image": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
        "video": [".mp4", ".mkv", ".mov", ".avi", ".webm"]
    }

    folders, files = [], []
    idx = 1

    try:
        raw_files = sorted(os.listdir(clean_path), key=lambda s: s.lower())

        # 1. Prüfen, ob eine ordnerspezifische 'thumbnail.*' Datei existiert
        folder_thumbnail_url = None
        for filename in raw_files:
            full_path = os.path.join(clean_path, filename)
            if os.path.isfile(full_path):
                base_name, ext = os.path.splitext(filename)
                if base_name.lower() == "thumbnail" and ext.lower() in valid_extensions["image"]:
                    folder_thumbnail_url = f"/api/media/stream?file={urllib.parse.quote(full_path)}&username={username}"
                    break

        # 2. Verzeichnisinhalt durchgehen
        for filename in raw_files:
            full_path = os.path.join(clean_path, filename)
            
            if os.path.isdir(full_path):
                folders.append({
                    "id": f"dir_{idx}", 
                    "name": filename, 
                    "is_dir": True, 
                    "path": full_path, 
                    "type": "folder"
                })
                idx += 1
            elif os.path.isfile(full_path):
                base_name, ext = os.path.splitext(filename)
                ext_lower = ext.lower()

                # 'thumbnail.*' niemals als eigenes Bild in der Galerie anzeigen
                if base_name.lower() == "thumbnail":
                    continue

                media_type = "image" if ext_lower in valid_extensions["image"] else ("video" if ext_lower in valid_extensions["video"] else None)
                if media_type:
                    stats = os.stat(full_path)
                    file_item = {
                        "id": f"file_{idx}",
                        "name": filename,
                        "path": full_path,
                        "is_dir": False,
                        "type": media_type,
                        "url": f"/api/media/stream?file={urllib.parse.quote(full_path)}&username={username}",
                        "size": f"{round(stats.st_size / (1024 * 1024), 1)} MB",
                        "date": time.strftime("%d.%m.%Y", time.localtime(stats.st_mtime))
                    }

                    # Wenn es ein Video ist, ordnerspezifisches Poster anheften
                    if media_type == "video":
                        file_item["poster_url"] = folder_thumbnail_url

                    files.append(file_item)
                    idx += 1
    except Exception as e:
        print(f"[Media Pool Error] {e}")

    return {"current_path": clean_path, "items": folders + files}

def list_nas_files(path: str = "", username: str = "guest"):
    target_path = resolve_target_dir(path, username)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Verzeichnis nicht gefunden.")

    files_data = []
    try:
        for entry in target_path.iterdir():
            try:
                stat = entry.stat()
                is_dir = entry.is_dir()
                files_data.append({
                    "name": entry.name,
                    "is_dir": is_dir,
                    "size": f"{round(stat.st_size / (1024 * 1024), 2)} MB" if not is_dir else "--",
                    "date": datetime.fromtimestamp(stat.st_mtime).strftime("%d.%m.%Y %H:%M"),
                    "type": "folder" if is_dir else ("pdf" if entry.suffix.lower() == ".pdf" else "file")
                })
            except PermissionError:
                continue
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Lesen des Ordners: {e}")

    files_data.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return {"status": "success", "current_path": str(target_path), "files": files_data}

async def save_uploaded_files(target_path: str, files: List[UploadFile], username: str = "guest"):
    """Speichert hochgeladene Dateien (auch große MP4s) asynchron in 1MB-Chunks."""
    dest_dir = resolve_target_dir(target_path, username)

    if not dest_dir.exists() or not dest_dir.is_dir():
        raise HTTPException(status_code=404, detail="Zielverzeichnis existiert nicht.")

    uploaded_filenames = []
    chunk_size = 1024 * 1024  # 1 MB Chunks

    for file in files:
        safe_filename = FilePath(file.filename).name
        destination = dest_dir / safe_filename
        
        try:
            with destination.open("wb") as buffer:
                while chunk := await file.read(chunk_size):
                    buffer.write(chunk)
            uploaded_filenames.append(safe_filename)
        except Exception as e:
            print(f"[Upload Error] Fehler beim Schreiben von {safe_filename}: {e}")
            if destination.exists():
                os.remove(destination)
            raise HTTPException(status_code=500, detail=f"Fehler beim Speichern von {safe_filename}: {str(e)}")
        finally:
            await file.close()

    return {"status": "success", "uploaded": uploaded_filenames}

def create_folder(target_path: str, folder_name: str, username: str = "guest"):
    dest_dir = resolve_target_dir(target_path, username)
    clean_name = FilePath(folder_name).name
    new_dir = dest_dir / clean_name

    if new_dir.exists():
        raise HTTPException(status_code=400, detail="Ordner existiert bereits.")

    os.makedirs(new_dir, exist_ok=True)
    return {"status": "success", "folder": clean_name}

def delete_item(item_path: str, username: str = "guest"):
    target = resolve_target_dir(item_path, username)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Datei/Ordner nicht gefunden.")

    if target.is_dir():
        shutil.rmtree(target)
    else:
        os.remove(target)

    return {"status": "success", "deleted": target.name}

def move_item(src_path: str, dest_path: str, username: str = "guest"):
    """Verschiebt eine Datei oder einen Ordner an ein neues Ziel."""
    if username != "renshiri":
        raise HTTPException(status_code=403, detail="Keine Berechtigung zum Verschieben.")

    src = resolve_target_dir(src_path, username)
    dest = resolve_target_dir(dest_path, username)

    if not src.exists():
        raise HTTPException(status_code=404, detail="Quelldatei nicht gefunden.")

    if dest.is_dir():
        dest = dest / src.name

    shutil.move(str(src), str(dest))
    return {"status": "success", "moved": src.name, "target": str(dest)}