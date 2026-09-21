from fastapi import APIRouter
import requests

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("")
def get_weather():
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
            return {
                "status": "success",
                "temp": data.get('temperature_2m', '--'),
                "apparent_temp": data.get('apparent_temperature', '--'),
                "humidity": data.get('relative_humidity_2m', '--'),
                "wind_speed": data.get('wind_speed_10m', '--'),
                "location": "Aachen"
            }
    except Exception as e:
        print(f"[Weather Warning] Open-Meteo Abruf fehlgeschlagen: {e}")

    return {"status": "error", "temp": "--", "location": "Aachen"}