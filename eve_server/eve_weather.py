#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests

def fetch_open_meteo_weather(lat: float = 50.7753, lon: float = 6.0839) -> str:
    """Holt minutengenaue Wetterdaten von Open-Meteo mit Koordinaten-Validation."""
    try:
        lat = float(lat)
        lon = float(lon)
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            lat, lon = 50.7753, 6.0839
    except (ValueError, TypeError):
        lat, lon = 50.7753, 6.0839

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "wind_speed_10m"],
        "timezone": "auto"
    }

    try:
        res = requests.get(url, params=params, timeout=3.0)
        if res.status_code == 200:
            data = res.json().get("current", {})
            return (
                f"AKTUELLES LIVE-WETTER (Position: {lat:.4f}, {lon:.4f}):\n"
                f"- Temperatur: {data.get('temperature_2m', 'N/A')}°C (Gefühlt: {data.get('apparent_temperature', 'N/A')}°C)\n"
                f"- Luftfeuchtigkeit: {data.get('relative_humidity_2m', 'N/A')}%\n"
                f"- Windgeschwindigkeit: {data.get('wind_speed_10m', 'N/A')} km/h"
            )
    except Exception as e:
        print(f"[Weather Warning] Open-Meteo Abruf fehlgeschlagen: {e}")

    return "Wetterdaten derzeit nicht verfügbar."