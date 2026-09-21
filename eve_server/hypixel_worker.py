#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
=============================================================================
         HYPIXEL API SYNC WORKER (EVE DAEMON FOR LIVE MARKET DATA)
=============================================================================
"""

import asyncio
import os
import time
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from neo4j import GraphDatabase
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import threading
from dotenv import load_dotenv

# ==========================================
# 1. KONFIGURATION & DRIFT-PROTECTION
# ==========================================
# Lade Umgebungsvariablen aus der .env Datei
load_dotenv()

HYPIXEL_API_KEY = os.getenv("HYPIXEL_API_KEY", "")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not NEO4J_PASSWORD:
    print("[Worker-Warning] WARNUNG: 'NEO4J_PASSWORD' ist nicht in der .env-Datei gesetzt!")

WORKER_PORT = int(os.getenv("HYPIXEL_WORKER_PORT", 5001))  # Separater Port für den Live-Market API-Worker

# HTTP Session mit Connection Pooling
http_session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=10)
http_session.mount("https://", adapter)

# In-Memory RAM Cache für Bazaar-Live-Daten
MARKET_CACHE: Dict[str, Any] = {
    "last_updated": "Initialisiere...",
    "top_flips": [],
    "total_products": 0
}

# Neo4j Driver
try:
    if NEO4J_PASSWORD:
        neo4j_driver = GraphDatabase.driver(
            NEO4J_URI, 
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            max_connection_lifetime=300,
            max_connection_pool_size=10
        )
    else:
        neo4j_driver = None
except Exception as e:
    print(f"[Worker-Error] Neo4j Driver konnte nicht initialisiert werden: {e}")
    neo4j_driver = None

# ==========================================
# FASTAPI APP & CORS MIDDLEWARE (KRITISCH!)
# ==========================================
app = FastAPI(title="EVE Hypixel Live Market API")

# MUSS vorhanden sein, damit der React-Browser-Client von Port 5173/3000 zugreifen darf!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. NEO4J ITEM-STAMMDATEN SYNC
# ==========================================

def sync_static_items_to_neo4j() -> None:
    """Synct die offiziellen Hypixel Item-Stammdaten im Hintergrund."""
    if not neo4j_driver:
        print("[Worker-Warning] Neo4j offline. Ueberspringe Stammdaten-Sync.")
        return

    print("[Worker] Starte Sync der offiziellen Hypixel Item-Stammdaten...")
    url = "https://api.hypixel.net/v2/resources/skyblock/items"
    
    try:
        res = http_session.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                items = data.get("items", [])
                print(f"[Worker] {len(items)} Items von Hypixel empfangen. Aktualisiere Neo4j Graph...")
                
                query = """
                UNWIND $items AS item
                MERGE (i:Item {id: item.id})
                SET i.name = item.name,
                    i.tier = item.tier,
                    i.category = item.category,
                    i.npc_sell = item.npc_sell_price,
                    i.updated_at = timestamp()
                """
                
                batch_size = 500
                for i in range(0, len(items), batch_size):
                    batch = items[i:i + batch_size]
                    with neo4j_driver.session() as session:
                        session.run(query, items=batch)
                
                print("[Worker] Neo4j Item-Stammdaten erfolgreich synchronisiert!")
    except Exception as e:
        print(f"[Worker-Error] Fehler beim Item-Sync: {e}")

# ==========================================
# 3. HIGH-FREQUENCY BAZAAR MARKET POLLER
# ==========================================

async def fetch_bazaar_now():
    """Führt eine sofortige Aktualisierung der Bazaar-Daten durch."""
    url = "https://api.hypixel.net/v2/skyblock/bazaar"
    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: http_session.get(url, timeout=8))
        
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                products = data.get("products", {})
                flips = []

                for prod_id, prod_data in products.items():
                    quick_status = prod_data.get("quick_status", {})
                    buy_price = quick_status.get("buyPrice", 0)   # Buy Order / Sell Offer Price
                    sell_price = quick_status.get("sellPrice", 0) # Sell Offer / Buy Order Price
                    buy_volume = quick_status.get("buyVolume", 0)
                    sell_volume = quick_status.get("sellVolume", 0)

                    # Berechne Marge zwischen An- und Verkaufspreisen
                    if buy_price > 0 and sell_price > 0 and (buy_volume + sell_volume) > 1000:
                        margin = abs(buy_price - sell_price)
                        lower_price = min(buy_price, sell_price)
                        
                        if lower_price > 0:
                            margin_percent = (margin / lower_price) * 100
                            
                            # Realistische Margen filtern
                            if 1.0 <= margin_percent <= 150.0:
                                flips.append({
                                    "item_id": prod_id,
                                    "item_name": prod_id.replace("_", " ").title(),
                                    "buy_price": round(buy_price, 1),
                                    "sell_price": round(sell_price, 1),
                                    "margin": round(margin, 1),
                                    "margin_percent": round(margin_percent, 2),
                                    "volume": buy_volume + sell_volume
                                })

                flips.sort(key=lambda x: x["margin_percent"], reverse=True)
                top_50 = flips[:50]

                MARKET_CACHE["last_updated"] = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
                MARKET_CACHE["top_flips"] = top_50
                MARKET_CACHE["total_products"] = len(products)
                
                print(f"[Bazaar Sync] Cache erneuert um {MARKET_CACHE['last_updated']}. Top-Flips: {len(top_50)}")
    except Exception as e:
        print(f"[Bazaar Sync Error] {e}")

async def poll_bazaar_loop():
    while True:
        await fetch_bazaar_now()
        await asyncio.sleep(30) # Alle 30 Sekunden erneuern

# ==========================================
# 4. REST API ENDPUNKTE FÜR EVE & DASHBOARD
# ==========================================

@app.get("/api/skyblock/bazaar/top")
def get_top_flips(limit: int = 10):
    """Liefert die Top Bazaar-Flips direkt aus dem RAM-Cache."""
    return {
        "status": "success",
        "last_updated": MARKET_CACHE["last_updated"],
        "count": min(limit, len(MARKET_CACHE["top_flips"])),
        "flips": MARKET_CACHE["top_flips"][:limit]
    }

@app.get("/api/skyblock/bazaar/summary")
def get_bazaar_summary():
    return {
        "status": "online",
        "last_updated": MARKET_CACHE["last_updated"],
        "tracked_products": MARKET_CACHE.get("total_products", 0)
    }

# ==========================================
# 5. WORKER DAEMON LAUNCHER
# ==========================================

def start_background_tasks():
    # Asynchroner Polling-Loop im Thread starten
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # 1. Stammdaten im Hintergund syncen
    threading.Thread(target=sync_static_items_to_neo4j, daemon=True).start()
    
    # 2. Bazaar-Loop starten
    loop.run_until_complete(poll_bazaar_loop())

if __name__ == "__main__":
    t = threading.Thread(target=start_background_tasks, daemon=True)
    t.start()
    
    print(f"[Worker Daemon] Starte Hypixel Market API auf Port {WORKER_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=WORKER_PORT)