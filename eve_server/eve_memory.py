#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import requests
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

CHROMA_DATA_DIR = os.path.expanduser("~/storage/chroma_db")
os.makedirs(CHROMA_DATA_DIR, exist_ok=True)

# Docker-Container auf dem NAS (Port 11435)
OLLAMA_EMBED_URL = os.getenv("OLLAMA_EMBED_URL", "http://localhost:11435/api/embeddings")

class NASOllamaEmbeddingFunction(EmbeddingFunction):
    """Nutzt nomic-embed-text über den lokalen Docker-Container auf dem NAS."""
    def __init__(self, model_name: str = "nomic-embed-text"):
        self.model_name = model_name

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for doc in input:
            try:
                res = requests.post(
                    OLLAMA_EMBED_URL,
                    json={"model": self.model_name, "prompt": doc},
                    timeout=10
                )
                if res.status_code == 200:
                    embeddings.append(res.json()["embedding"])
                else:
                    print(f"[Embedding Error] HTTP {res.status_code}: {res.text}")
                    embeddings.append([0.0] * 768)
            except Exception as e:
                print(f"[Embedding Error] Verbindung zum Docker-Container fehlgeschlagen: {e}")
                embeddings.append([0.0] * 768)
        return embeddings

chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
ollama_ef = NASOllamaEmbeddingFunction()

# Collection für Chat-Erinnerungen
chat_collection = chroma_client.get_or_create_collection(
    name="chat_memory",
    embedding_function=ollama_ef
)

def add_chat_to_memory(user_msg: str, eve_reply: str, username: str = "renshiri"):
    """Speichert ein Gesprächspaar im Kurzzeit-/Episodengedächtnis."""
    try:
        combined_text = f"User ({username}): {user_msg}\nEVE: {eve_reply}"
        msg_id = f"msg_{int(time.time() * 1000)}"
        
        chat_collection.add(
            documents=[combined_text],
            ids=[msg_id],
            metadatas=[{"username": username, "timestamp": time.time()}]
        )
        print(f"[ChromaDB] Dialog {msg_id} erfolgreich im Gedächtnis gespeichert.")
        return True
    except Exception as e:
        print(f"[ChromaDB Error] Fehler beim Speichern: {e}")
        return False

def query_relevant_context(user_msg: str, n_results: int = 2) -> str:
    """Sucht die ähnlichsten vergangenen Nachrichten für den Prompt-Kontext."""
    try:
        results = chat_collection.query(
            query_texts=[user_msg],
            n_results=n_results
        )
        
        docs = results.get("documents", [[]])[0]
        if not docs:
            return ""
        
        return "\n---\n".join(docs)
    except Exception as e:
        print(f"[ChromaDB Error] Fehler bei Abfrage: {e}")
        return ""

def query_codebase_context(user_msg: str, n_results: int = 4) -> str:
    """Sucht nach relevanten Quellcode-Ausschnitten aus der eve_codebase Collection."""
    try:
        code_coll = chroma_client.get_or_create_collection(
            name="eve_codebase",
            embedding_function=ollama_ef
        )
        results = code_coll.query(
            query_texts=[user_msg],
            n_results=n_results
        )
        
        docs = results.get("documents", [[]])[0]
        if not docs:
            return ""
        
        return "\n\n---\n\n".join(docs)
    except Exception as e:
        print(f"[ChromaDB Error] Fehler bei Codebase-Abfrage: {e}")
        return ""