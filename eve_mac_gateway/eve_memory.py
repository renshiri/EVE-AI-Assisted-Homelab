import os
import requests
import ollama

MEMORY_SERVER = os.getenv("MEMORY_SERVER_URL", "http://localhost:8765")

def memory_recall(query: str) -> str:
    """Ruft relevante Erinnerungen vom Node ab und gibt sie als Text zurück."""
    try:
        response = requests.post(
            f"{MEMORY_SERVER}/recall",
            json={"query": query, "n_results": 5},
            timeout=3
        )
        data = response.json()

        memories = []

        if data.get("facts"):
            memories.append("Was ich über den Nutzer weiß:")
            for fact in data["facts"]:
                memories.append(f"  - {fact}")

        if data.get("episodes"):
            memories.append("Vergangene Gespräche:")
            for episode in data["episodes"]:
                memories.append(f"  - {episode}")

        return "\n".join(memories) if memories else ""

    except Exception:
        return ""  # Fehler still abfangen


def memory_store(user_text: str, eve_response: str):
    """Extrahiert neue Fakten aus dem Gespräch und speichert sie im Node."""
    try:
        extraction_prompt = (
            "Analysiere die Aussage des Nutzers und extrahiere ALLE erinnerungswürdigen Fakten "
            "über seine Person, Präferenzen, laufende Projekte, Namen oder wichtige Entscheidungen.\n\n"
            f"Aussage des Nutzers: {user_text}\n\n"
            "Regeln:\n"
            "1. Gib jeden Fakt als eigene Zeile aus, kurz und präzise.\n"
            "   Beispiel:\n"
            "   Nutzer heißt Domenico\n"
            "   Laufendes Projekt: EVE AI-System\n"
            "2. Wenn kein konkreter Fakt vorhanden ist, antworte NUR mit 'NICHTS'.\n"
            "Keine Erklärungen, keine Nummerierung, keine Formatierung."
        )

        result = ollama.chat(
            model='qwen2.5:7b',
            messages=[{'role': 'user', 'content': extraction_prompt}]
        )

        extracted = result['message']['content'].strip()
        print(f"[Memory Debug] Extrahiert: '{extracted}'")

        if extracted.upper() == "NICHTS" or not extracted:
            return

        lines = [line.strip() for line in extracted.split("\n") if line.strip()]

        for line in lines:
            if line.upper() == "NICHTS":
                continue
        
            memory_type = "fact" if any(keyword in line.lower() for keyword in [
                "bevorzugt", "mag", "liebt", "hasst", "immer", "nie",
                "projekt", "arbeitet", "heisst", "heißt", "wohnt", "nutzt", "name",
                "alter", "jahre", "herkunft", "präferenz", "kommt aus",
                "aktivität", "interesse", "hobby", "ziel", "entscheidung",
                "vorlieben", "abneigungen", "familie", "freunde", "kollegen",
                "lieblings", "will", "möchte", "plant", "träumt", "erwartet",
                "erinnert", "vergisst", "sucht", "findet", "denkt", "fühlt",
                "glaubt", "weiß", "weiß nicht", "kennt", "kennt nicht", "erlebt", 
                "erfährt", "erforscht", "studiert"
            ]) else "episode"
    
            try:
                requests.post(
                    f"{MEMORY_SERVER}/remember",
                    json={"text": line, "memory_type": memory_type},
                    timeout=3
                )
                print(f"[Memory] Gespeichert: '{line}' als {memory_type}")
            except Exception:
                pass
    except Exception:
        pass

def memory_health() -> bool:
    """Prüft ob der Memory-Server erreichbar ist."""
    try:
        response = requests.get(f"{MEMORY_SERVER}/health", timeout=2)
        return response.status_code == 200
    except Exception:
        return False