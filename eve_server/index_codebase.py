#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import glob
import chromadb
from eve_memory import NASOllamaEmbeddingFunction

CHROMA_DATA_DIR = os.path.expanduser("~/storage/chroma_db")
# Zeigt direkt auf den übergeordneten services-Ordner
SERVICES_ROOT = os.path.expanduser("~/services")

# ChromaDB Client & Embedding-Funktion (nutzt deinen NAS Docker-Container)
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
ollama_ef = NASOllamaEmbeddingFunction()

def chunk_file(file_path: str, max_lines: int = 60) -> list:
    """Liest eine Datei und zerlegt sie in handliche Code-Blöcke."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[Skip] Konnte {file_path} nicht lesen: {e}")
        return []

    chunks = []
    # Pfad relativ zum Home-Ordner für bessere Lesbarkeit im Prompt
    rel_path = os.path.relpath(file_path, os.path.expanduser("~"))
    
    for i in range(0, len(lines), max_lines):
        chunk_lines = lines[i:i + max_lines]
        content = "".join(chunk_lines)
        header = f"// FILE: {rel_path} (Zeilen {i+1}-{i+len(chunk_lines)})\n"
        chunks.append({
            "id": f"{rel_path.replace('/', '_')}_{i}",
            "text": header + content,
            "metadata": {"path": rel_path, "start_line": i + 1}
        })
    return chunks

def index_codebase():
    """Scannt den gesamten services-Ordner (Backend, UI, Scripts) und speichert alles in ChromaDB."""
    print("--- Starte Indizierung der gesamten EVE-Codebase (~/services) ---")
    
    # 1. Alte Collection zurücksetzen
    try:
        chroma_client.delete_collection("eve_codebase")
        print("[ChromaDB] Alte 'eve_codebase' Collection geleert.")
    except Exception:
        pass

    fresh_collection = chroma_client.get_or_create_collection(
        name="eve_codebase",
        embedding_function=ollama_ef
    )

    # 2. Alle relevanten Dateiendungen im services-Ordner suchen
    extensions = ["**/*.py", "**/*.jsx", "**/*.js", "**/*.ts", "**/*.tsx", "**/*.css", "**/*.json"]
    files_to_index = []

    if os.path.exists(SERVICES_ROOT):
        for ext in extensions:
            files_to_index.extend(glob.glob(os.path.join(SERVICES_ROOT, ext), recursive=True))

    # 3. Unnötige/Generierte Ordner ausschließen
    ignored_keywords = [
        "node_modules", ".venv", "venv", "__pycache__", 
        "build", "dist", ".git", "package-lock.json"
    ]
    filtered_files = [
        f for f in files_to_index 
        if not any(ignored in f for ignored in ignored_keywords)
    ]

    print(f"[Found] {len(filtered_files)} relevante Code-Dateien im Ordner 'services' gefunden.")

    # 4. Chunks erstellen und in ChromaDB schreiben
    documents, ids, metadatas = [], [], []

    for file_path in filtered_files:
        chunks = chunk_file(file_path)
        for c in chunks:
            documents.append(c["text"])
            ids.append(c["id"])
            metadatas.append(c["metadata"])

    if documents:
        batch_size = 50
        for i in range(0, len(documents), batch_size):
            fresh_collection.add(
                documents=documents[i:i+batch_size],
                ids=ids[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )
        print(f"✅ Erfolgreich {len(documents)} Code-Abschnitte (Backend & UI) in ChromaDB indiziert!")
    else:
        print("⚠️ Keine passenden Dateien unter ~/services gefunden.")

if __name__ == "__main__":
    index_codebase()