#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from pathlib import Path as FilePath
import re

# Pfade
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
PREVIEW_DIR = os.path.abspath(os.path.expanduser("~/storage/web_previews"))
NAS_DIR = os.path.abspath("/nas/recherchen")

ALLOWED_MEDIA_DIRS = [
    os.path.abspath("/home/Fotos"),
    os.path.abspath("/home/Serien"),
    os.path.abspath("/home/Filme"),
    NAS_DIR,
    os.path.abspath("/nas/eve_video_material")
]

os.makedirs(PREVIEW_DIR, exist_ok=True)
os.makedirs(NAS_DIR, exist_ok=True)
for m_dir in ALLOWED_MEDIA_DIRS:
    os.makedirs(m_dir, exist_ok=True)

# Service URLs & Hosts
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://localhost:8080/search")
MAC_HOST = os.getenv("MAC_HOST", "http://100.85.12.37:11434")

# Globaler Cache
EVE_CACHE = {
    "weather": {"data": "Wetterdaten werden geladen...", "last_updated": None},
    "whitelist_domains": {"data": ["wikipedia.org"], "last_updated": 0}
}

# Path Security Helper
def is_safe_path(base_dir: str, target_path: str) -> bool:
    try:
        base = FilePath(base_dir).resolve()
        target = FilePath(target_path).resolve()
        return target == base or base in target.parents
    except Exception:
        return False

def sanitize_filename(name: str) -> str:
    """Verhindert Path-Traversal und unsaubere Zeichen im Dateisystem."""
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', name.lower().strip())
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean if clean else "unbenanntes_thema"