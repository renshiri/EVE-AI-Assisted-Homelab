#!/bin/bash

echo "=== EMERGENCY KILLSWITCH INITIATED ==="

# 1. Voice Bridge & Python Prozesse beenden
echo "[System] Beende EVE Voice Bridge & Python Worker..."
pkill -f "jarvis_bridge.py" 2>/dev/null
pkill -f "eve_server.py" 2>/dev/null

# 2. Ollama Instanzen stoppen
echo "[System] Stoppe Ollama-Inferenz-Server..."
killall Ollama 2>/dev/null
pkill -f "ollama serve" 2>/dev/null

# 3. Bestätigung ausgeben
sleep 1
echo "[System] Alle EVE-Dienste wurden erfolgreich heruntergefahren."
exit 0