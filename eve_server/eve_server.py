#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import os
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from eve_db import init_sqlite_tables
from eve_graph import neo4j_driver, init_neo4j_indexes
from index_structure import index_folder_structure
from routine_worker import routine_scheduler_loop

# Modulare Router Imports
from routes import (
    auth, chat, media, system, calendar, 
    todos, pihole, search, weather, terminal, intent, 
    whatsapp, routines, projects, video, rules, minecraft, contacts
)

process_pool = ProcessPoolExecutor(max_workers=4)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[System] Starte EVE Backend-System...")
    
    # 1. SQLite-Tabellen synchron vor Background-Tasks initialisieren
    try:
        init_sqlite_tables()
    except Exception as e:
        print(f"[Critical Error] SQLite-Initialisierung fehlgeschlagen: {e}")

    # 2. Hintergrund-Tasks sauber verwalten
    startup_tasks = []
    
    if neo4j_driver:
        startup_tasks.append(asyncio.create_task(asyncio.to_thread(init_neo4j_indexes)))
        startup_tasks.append(asyncio.create_task(asyncio.to_thread(index_folder_structure)))
    else:
        print("[Neo4j-Notice] Neo4j-Treiber offline. Graph-Indizierung wird übersprungen.")

    scheduler_task = asyncio.create_task(routine_scheduler_loop(interval_seconds=3600))
    startup_tasks.append(scheduler_task)

    yield
    
    print("[System] Fahre Backend herunter...")
    
    # Graceful Shutdown für Async-Tasks
    for task in startup_tasks:
        if not task.done():
            task.cancel()
    
    await asyncio.gather(*startup_tasks, return_exceptions=True)

    # ProcessPool geordnet herunterfahren
    process_pool.shutdown(wait=True)

    # Neo4j-Verbindung schließen
    if neo4j_driver:
        neo4j_driver.close()


app = FastAPI(title="EVE Core API", lifespan=lifespan)

# Einschränkung der CORS-Origins (Lokale Entwicklung & Tailscale-Mesh 100.x.x.x)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registriere alle Sub-Modul-Router
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(media.router)
app.include_router(system.router)
app.include_router(calendar.router)
app.include_router(todos.router)
app.include_router(routines.router)
app.include_router(pihole.router)
app.include_router(search.router)
app.include_router(weather.router)
app.include_router(terminal.router)
app.include_router(intent.router)
app.include_router(whatsapp.router)
app.include_router(projects.router)
app.include_router(video.router)
app.include_router(rules.router)
app.include_router(minecraft.router)
app.include_router(contacts.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)