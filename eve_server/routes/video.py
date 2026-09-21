import os
import subprocess
import re
import requests
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from eve_config import ALLOWED_MEDIA_DIRS, is_safe_path

from eve_graph import log_generated_video_to_graph

router = APIRouter(prefix="/api/video", tags=["Video Generation"])

VIDEO_SOURCE_DIR = os.path.abspath("/nas/eve_video_material")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")

# =====================================================================
# IN-MEMORY JOB REGISTRY
# Hält Status aller laufenden und abgeschlossenen Render-Jobs.
# =====================================================================
job_registry: dict[str, dict] = {}

def _create_job(job_type: str, topic: str, output_file: str) -> str:
    """Erstellt einen neuen Job-Eintrag und gibt die job_id zurück."""
    job_id = str(uuid.uuid4())[:8]
    job_registry[job_id] = {
        "job_id": job_id,
        "type": job_type,
        "topic": topic,
        "output_file": output_file,
        "status": "queued",       # queued | researching | rendering | done | error
        "stage": "",
        "started_at": datetime.now().isoformat(),
        "finished_at": None,
        "duration_sec": None,
        "error": None,
        "ffmpeg_stderr": None,
    }
    return job_id

def _update_job(job_id: str, **kwargs):
    if job_id in job_registry:
        job_registry[job_id].update(kwargs)


# =====================================================================
# PYDANTIC MODELLE
# =====================================================================
class VideoEditRequest(BaseModel):
    background_video: Optional[str] = "background_loop.mp4"
    topic: Optional[str] = "Automatischer Content"
    text_content: str
    duration: Optional[int] = 10

    text_position: Optional[str] = "bottom"
    text_color: Optional[str] = "white"
    font_size: Optional[int] = 40
    box_color: Optional[str] = "black"
    box_opacity: Optional[float] = 0.6

    brightness: Optional[float] = 0.0
    contrast: Optional[float] = 1.0
    saturation: Optional[float] = 1.0
    sepia: Optional[bool] = False
    invert_colors: Optional[bool] = False

    flip_horizontal: Optional[bool] = False
    flip_vertical: Optional[bool] = False

    fade_in: Optional[bool] = False
    fade_out: Optional[bool] = False
    grayscale: Optional[bool] = False
    blur: Optional[bool] = False
    vignette: Optional[bool] = False
    noise: Optional[bool] = False
    glitch_rgb: Optional[bool] = False
    pixelate: Optional[bool] = False

    show_timecode: Optional[bool] = False
    progress_bar: Optional[bool] = False

    mute_audio: Optional[bool] = False
    audio_volume: Optional[float] = 1.0


class AutoPipelineRequest(BaseModel):
    topic: str
    background_video: Optional[str] = "background_loop.mp4"
    duration: Optional[int] = 12


# =====================================================================
# KERN-RENDER-FUNKTION
# =====================================================================
def render_dynamic_video(video_dir: str, bg_file: str, output_file: str,
                          req: VideoEditRequest, job_id: str = None):
    """
    Rendert das Video via FFmpeg und loggt in Neo4j.
    Schreibt jeden Schritt in den job_registry, damit das Frontend pollen kann.
    """
    t_start = datetime.now()

    def _fail(reason: str, ffmpeg_stderr: str = None):
        print(f"[Video Error] {reason}")
        if job_id:
            _update_job(job_id,
                        status="error",
                        stage="abgebrochen",
                        error=reason,
                        ffmpeg_stderr=ffmpeg_stderr,
                        finished_at=datetime.now().isoformat())

    try:
        # --- FIX: Input-Video und Output-Ordner sauber trennen ---
        input_video = os.path.join(video_dir, bg_file)
        output_dir = os.path.dirname(output_file)
        os.makedirs(output_dir, exist_ok=True)

        if not os.path.exists(input_video):
            _fail(f"Hintergrundvideo nicht gefunden: {input_video}")
            return

        if job_id:
            _update_job(job_id, status="rendering", stage="FFmpeg Filter-Kette aufbauen")

        # --- VIDEO FILTER KETTE ---
        vf_chain = []

        eq_params = []
        if req.brightness != 0.0: eq_params.append(f"brightness={req.brightness}")
        if req.contrast != 1.0:   eq_params.append(f"contrast={req.contrast}")
        if req.saturation != 1.0: eq_params.append(f"saturation={req.saturation}")
        if eq_params:
            vf_chain.append("eq=" + ":".join(eq_params))

        if req.grayscale:      vf_chain.append("hue=s=0")
        if req.sepia:          vf_chain.append("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131")
        if req.invert_colors:  vf_chain.append("negate")
        if req.flip_horizontal: vf_chain.append("hflip")
        if req.flip_vertical:   vf_chain.append("vflip")
        if req.blur:           vf_chain.append("boxblur=5:1")
        if req.pixelate:       vf_chain.append("scale=iw/10:-1,scale=10*iw:-1:flags=neighbor")
        if req.glitch_rgb:     vf_chain.append("chromashift=cbh=-4:crh=4")
        if req.vignette:       vf_chain.append("vignette=PI/4")
        if req.noise:          vf_chain.append("noise=alls=15:allf=t+u")

        if req.show_timecode:
            vf_chain.append("drawtext=text='%{pts\\:hms}':x=20:y=20:fontcolor=white:fontsize=30:box=1:boxcolor=black@0.5")
        if req.progress_bar:
            vf_chain.append(f"drawbox=x=0:y=ih-15:w='iw*(t/{req.duration})':h=15:color=red@0.8:t=fill")

        if req.text_position == "top":    y_pos = "150"
        elif req.text_position == "center": y_pos = "(h-th)/2"
        else:                              y_pos = "h-th-150"

        safe_text = req.text_content.replace("'", "\\'").replace(":", "\\:")
        text_filter = (
            f"drawtext=text='{safe_text}':fontcolor={req.text_color}:fontsize={req.font_size}:"
            f"box=1:boxcolor={req.box_color}@{req.box_opacity}:boxborderw=20:x=(w-text_w)/2:y={y_pos}"
        )
        vf_chain.append(text_filter)

        if req.fade_in:  vf_chain.append("fade=t=in:st=0:d=1")
        if req.fade_out: vf_chain.append(f"fade=t=out:st={req.duration - 1}:d=1")

        vf_string = ",".join(vf_chain)

        audio_args = (["-an"] if req.mute_audio
                      else ["-af", f"volume={req.audio_volume}"] if req.audio_volume != 1.0
                      else [])

        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1",
            "-i", input_video,
            "-t", str(req.duration),
        ]
        if vf_string:
            cmd.extend(["-vf", vf_string])
        cmd.extend(audio_args)
        cmd.extend(["-codec:v", "libx264", "-pix_fmt", "yuv420p", "-shortest", output_file])

        print(f"[FFmpeg] Starte Render: {' '.join(cmd)}")
        if job_id:
            _update_job(job_id, stage="FFmpeg läuft …", status="rendering")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        elapsed = round((datetime.now() - t_start).total_seconds(), 1)

        if result.returncode != 0:
            _fail(f"FFmpeg exit {result.returncode}", ffmpeg_stderr=result.stderr[-2000:])
            print(f"[FFmpeg STDERR] {result.stderr[-2000:]}")
            return

        print(f"[Video Success] Fertig nach {elapsed}s: {output_file}")
        if job_id:
            _update_job(job_id,
                        status="done",
                        stage="Fertig",
                        finished_at=datetime.now().isoformat(),
                        duration_sec=elapsed)

        try:
            log_generated_video_to_graph(
                topic=req.topic,
                text_content=req.text_content,
                output_path=output_file
            )
        except Exception as graph_err:
            print(f"[Neo4j-Warning] Logging fehlgeschlagen (Video trotzdem OK): {graph_err}")

    except subprocess.TimeoutExpired:
        _fail("FFmpeg Timeout nach 300s")
    except Exception as e:
        _fail(str(e))


# =====================================================================
# AUTO-PIPELINE
# =====================================================================
def run_research_and_render(video_dir: str, bg_file: str, topic: str,
                             output_file: str, duration: int, job_id: str = None):
    """Recherchiert via Ollama, generiert Text, rendert danach das Video."""
    try:
        print(f"[Pipeline] Recherche für: '{topic}' …")
        if job_id:
            _update_job(job_id, status="researching", stage="Ollama generiert Text …")

        prompt = (
            f"Du bist EVE, ein analytisches System. Recherchiere kurz das Thema '{topic}'. "
            f"Fasse das Wichtigste in exakt 2 kurzen, knackigen Sätzen zusammen. "
            f"Schreibe absolut keine Einleitung, sondern nur den puren Text. "
            f"Füge zwischen den Sätzen ein '\\n' ein."
        )

        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5:7b",
            "prompt": prompt,
            "stream": False
        }, timeout=90)

        if response.status_code != 200:
            if job_id:
                _update_job(job_id, status="error", stage="Ollama nicht erreichbar",
                            error=f"HTTP {response.status_code}")
            return

        generated_text = response.json().get("response", "").strip()
        safe_text = generated_text.replace("'", "").replace('"', "")
        print(f"[Pipeline] Text:\n{safe_text}")

        req = VideoEditRequest(
            text_content=safe_text,
            topic=topic,
            background_video=bg_file,
            duration=duration,
            text_position="center",
            fade_in=True,
            fade_out=True,
            vignette=True,
            show_timecode=True,
            progress_bar=True,
        )

        render_dynamic_video(video_dir, bg_file, output_file, req, job_id=job_id)

    except Exception as e:
        print(f"[Pipeline Exception] {e}")
        if job_id:
            _update_job(job_id, status="error", stage="Exception", error=str(e))


# =====================================================================
# API ENDPUNKTE
# =====================================================================
def _validate_and_prepare(topic: str, prefix: str):
    """Prüft Pfad-Sicherheit und baut Output-Pfad. Gibt (clean_path, output_file) zurück."""
    clean_path = VIDEO_SOURCE_DIR
    if not any(is_safe_path(allowed, clean_path) for allowed in ALLOWED_MEDIA_DIRS):
        raise HTTPException(status_code=403, detail="Zugriff auf diesen Pfad nicht erlaubt.")
    os.makedirs(clean_path, exist_ok=True)
    safe_topic = re.sub(r'[^a-z0-9]', '_', topic.lower()).strip('_')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(clean_path, f"{prefix}_{safe_topic}_{timestamp}.mp4")
    return clean_path, output_file


@router.post("/create-meme")
def create_meme_video(req: VideoEditRequest, background_tasks: BackgroundTasks):
    clean_path, output_file = _validate_and_prepare(req.topic, "video")
    job_id = _create_job("manual", req.topic, output_file)

    background_tasks.add_task(
        render_dynamic_video,
        video_dir=clean_path,
        bg_file=req.background_video,
        output_file=output_file,
        req=req,
        job_id=job_id,
    )
    return {"status": "success", "job_id": job_id, "message": "Render-Job gestartet.", "target_file": output_file}


@router.post("/auto-pipeline")
def create_auto_pipeline(req: AutoPipelineRequest, background_tasks: BackgroundTasks):
    clean_path, output_file = _validate_and_prepare(req.topic, "auto")
    job_id = _create_job("auto-pipeline", req.topic, output_file)

    background_tasks.add_task(
        run_research_and_render,
        video_dir=clean_path,
        bg_file=req.background_video,
        topic=req.topic,
        output_file=output_file,
        duration=req.duration,
        job_id=job_id,
    )
    return {"status": "success", "job_id": job_id, "message": f"Pipeline für '{req.topic}' gestartet.", "target_file": output_file}


@router.get("/job/{job_id}")
def get_job_status(job_id: str):
    """Gibt den aktuellen Status eines Render-Jobs zurück."""
    job = job_registry.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' nicht gefunden.")
    return job


@router.get("/jobs")
def list_jobs():
    """Gibt alle Jobs sortiert nach Startzeit zurück (neueste zuerst)."""
    sorted_jobs = sorted(job_registry.values(), key=lambda j: j["started_at"], reverse=True)
    return {"jobs": sorted_jobs, "total": len(sorted_jobs)}
