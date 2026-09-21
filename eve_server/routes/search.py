from fastapi import APIRouter, HTTPException, Query
import httpx
import os
import asyncio
from typing import List, Dict, Any

router = APIRouter(prefix="/api/search", tags=["Search"])

# Konfiguration: Mehrere SearXNG-Instanzen unterstützen (kommagetrennt)
# Beispiel: "http://localhost:8080/search,http://searxng-node-2:8080/search"
RAW_URLS = os.getenv(
    "SEARXNG_URLS", 
    "http://localhost:8080/search"
)
SEARXNG_INSTANCES: List[str] = [url.strip() for url in RAW_URLS.split(",") if url.strip()]

# Globaler HTTP-Client mit Connection Pooling für maximale Performance
client: httpx.AsyncClient = None

def get_search_client() -> httpx.AsyncClient:
    global client
    if client is None or client.is_closed:
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
        client = httpx.AsyncClient(limits=limits, timeout=5.0)
    return client

async def close_search_client():
    global client
    if client and not client.is_closed:
        await client.aclose()
        client = None

async def fetch_from_instance(instance_url: str, params: dict) -> List[Dict[str, Any]]:
    """Fragt eine einzelne SearXNG-Instanz ab und fängt Fehler ab."""
    try:
        http_client = get_search_client()
        response = await http_client.get(instance_url, params=params)
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
    except Exception as e:
        # Falls eine Instanz offline ist oder ein Timeout hat, ignorieren wir sie leise
        pass
    return []


@router.get("")
async def proxy_search(
    q: str = Query(..., description="Suchbegriff"), 
    category: str = Query("general", description="SearXNG Kategorie"),
    pageno: int = Query(1, ge=1, description="Seitenzahl für Infinity Scroll")
):
    params = {
        "q": q, 
        "format": "json", 
        "categories": category, 
        "pageno": pageno,
        "language": "auto"
    }

    # Parallel-Abfrage an ALLE konfigurierten Instanzen schicken
    tasks = [fetch_from_instance(url, params) for url in SEARXNG_INSTANCES]
    results_nested = await asyncio.gather(*tasks)

    # Ergebnisse zusammenführen und Deduplizieren
    seen_urls = set()
    unique_results = []

    for result_list in results_nested:
        for item in result_list:
            url = item.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(item)

    if not unique_results and len(SEARXNG_INSTANCES) > 0:
        # Falls gar keine Ergebnisse von einer der Instanzen kamen
        raise HTTPException(
            status_code=503, 
            detail="Keine Ergebnisse erhalten. Überprüfe die SearXNG-Instanzen."
        )

    return {
        "query": q,
        "category": category,
        "pageno": pageno,
        "results": unique_results
    }