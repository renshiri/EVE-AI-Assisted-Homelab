import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film, Wand2, Loader2, CheckCircle, AlertCircle, Palette,
  Settings2, Activity, ListVideo, ChevronDown, ChevronUp,
  RefreshCw, Play, Pause, SkipBack, SkipForward, Scissors,
  Monitor, Clock, Folder, Sparkles, XCircle
} from 'lucide-react';

const API_BASE = "http://100.81.234.37:5000";

const C = {
  bg0:"#141414", bg1:"#1e1e1e", bg2:"#252526", bg3:"#2d2d2d",
  border:"#3a3a3a", blue:"#007acc", blueDim:"#005f9e",
  amber:"#f5a623", fuchsia:"#c084fc", emerald:"#34d399",
  rose:"#f87171", zinc4:"#a1a1aa", zinc5:"#71717a", zinc2:"#e4e4e7",
};

const panelStyle = {
  background:C.bg2, border:`1px solid ${C.border}`, borderRadius:4,
  display:"flex", flexDirection:"column", overflow:"hidden",
};
const headStyle = {
  background:C.bg3, borderBottom:`1px solid ${C.border}`,
  padding:"5px 10px", display:"flex", alignItems:"center",
  justifyContent:"space-between", flexShrink:0,
  fontSize:11, fontWeight:600, color:C.zinc2, letterSpacing:"0.03em", userSelect:"none",
};

const StatusBadge = ({ status }) => {
  const map = {
    queued:      ["Warteschlange", C.bg3,    C.zinc5,  C.zinc5, false],
    researching: ["Recherche",     "#1e3a5f","#60a5fa","#60a5fa",true],
    rendering:   ["Rendering",     "#3b2300", C.amber,  C.amber, true],
    done:        ["Fertig",        "#052e16", C.emerald,C.emerald,false],
    error:       ["Fehler",        "#2c0a0a", C.rose,   C.rose,  false],
  };
  const [label,bg,txt,dot,pulse] = map[status]||map.queued;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"1px 7px",
      background:bg,borderRadius:3,fontSize:10,fontWeight:700,color:txt,
      letterSpacing:"0.06em",textTransform:"uppercase",flexShrink:0 }}>
      <span style={{ width:6,height:6,borderRadius:"50%",background:dot,
        animation:pulse?"blink 1.1s infinite":"none" }} />
      {label}
    </span>
  );
};

const LiveTimer = ({ startedAt, finishedAt, durationSec }) => {
  const [elapsed,setElapsed] = useState(0);
  useEffect(()=>{
    if(finishedAt||durationSec!=null) return;
    const start=new Date(startedAt).getTime();
    const id=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);
    return ()=>clearInterval(id);
  },[startedAt,finishedAt,durationSec]);
  const secs=durationSec!=null?durationSec:elapsed;
  const m=Math.floor(secs/60).toString().padStart(2,"0");
  const s=Math.floor(secs%60).toString().padStart(2,"0");
  return <span style={{ fontFamily:"monospace",fontSize:10,color:C.zinc5 }}>
    {durationSec!=null?`✓ ${m}:${s}`:`⏱ ${m}:${s}`}
  </span>;
};

const JobRow = ({ job }) => {
  const [open,setOpen]=useState(false);
  const active=job.status==="rendering"||job.status==="researching";
  return (
    <div style={{ borderRadius:3,border:`1px solid ${active?C.amber+"55":C.border}`,
      background:active?"#3b230022":job.status==="error"?"#2c0a0a22":
        job.status==="done"?"#05261222":C.bg1,marginBottom:3 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex",alignItems:"center",
        gap:6,padding:"4px 8px",cursor:"pointer" }}>
        <StatusBadge status={job.status} />
        <span style={{ flex:1,fontSize:11,color:C.zinc2,overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{job.topic}</span>
        <span style={{ fontFamily:"monospace",fontSize:10,color:C.zinc5 }}>
          {job.job_id?.substring(0,8)}</span>
        <LiveTimer startedAt={job.started_at} finishedAt={job.finished_at} durationSec={job.duration_sec} />
        {open?<ChevronUp size={11} color={C.zinc5}/>:<ChevronDown size={11} color={C.zinc5}/>}
      </div>
      {open&&(
        <div style={{ borderTop:`1px solid ${C.border}`,padding:"6px 8px",
          background:C.bg0,fontSize:10,color:C.zinc5 }}>
          {job.stage&&<div style={{ marginBottom:4,color:C.zinc4 }}>Stage: {job.stage}</div>}
          <div style={{ fontFamily:"monospace",wordBreak:"break-all" }}>{job.output_file}</div>
          {job.error&&(
            <div style={{ marginTop:5,padding:"4px 6px",background:"#2c0a0a",
              border:`1px solid ${C.rose}44`,borderRadius:3,color:C.rose }}>
              <XCircle size={10} style={{ marginRight:4,verticalAlign:"middle" }}/>{job.error}
            </div>
          )}
          {job.ffmpeg_stderr&&(
            <details style={{ marginTop:4 }}>
              <summary style={{ cursor:"pointer",color:C.zinc5 }}>FFmpeg stderr</summary>
              <pre style={{ fontFamily:"monospace",fontSize:9,color:"#f87171aa",
                whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:70,overflowY:"auto",
                background:"#000",padding:4,borderRadius:2,marginTop:4 }}>
                {job.ffmpeg_stderr}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

const FxToggle = ({ name,label,config,onChange }) => {
  const on=config[name];
  return (
    <label style={{ display:"flex",alignItems:"center",gap:5,padding:"3px 7px",
      background:on?"#003d66":C.bg1,border:`1px solid ${on?C.blue:C.border}`,
      borderRadius:3,fontSize:10,cursor:"pointer",color:on?"#93c5fd":C.zinc4,
      boxShadow:on?`0 0 6px ${C.blue}44`:"none",userSelect:"none" }}>
      <input type="checkbox" name={name} checked={on} onChange={onChange}
        style={{ accentColor:C.blue,width:11,height:11,cursor:"pointer" }}/>
      {label}
    </label>
  );
};

const SliderRow = ({ name,label,min,max,step,config,onChange }) => (
  <label style={{ display:"flex",flexDirection:"column",gap:2 }}>
    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:C.zinc5 }}>
      <span>{label}</span>
      <span style={{ fontFamily:"monospace",color:C.zinc2 }}>{config[name]}</span>
    </div>
    <input type="range" name={name} min={min} max={max} step={step}
      value={config[name]} onChange={onChange}
      style={{ accentColor:C.blue,height:3,cursor:"pointer",width:"100%" }}/>
  </label>
);

const MetricsBar = ({ jobs }) => {
  const done=jobs.filter(j=>j.status==="done").length;
  const active=jobs.filter(j=>j.status==="rendering"||j.status==="researching").length;
  const errors=jobs.filter(j=>j.status==="error").length;
  const fin=jobs.filter(j=>j.duration_sec!=null);
  const avg=fin.length?(fin.reduce((a,j)=>a+j.duration_sec,0)/fin.length).toFixed(1):null;
  return (
    <div style={{ display:"flex",gap:4,padding:"5px 8px",
      borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
      {[["Gesamt",jobs.length,C.zinc4],["Aktiv",active,active>0?C.amber:C.zinc5],
        ["Fertig",done,done>0?C.emerald:C.zinc5],["Fehler",errors,errors>0?C.rose:C.zinc5],
        ["Ø Dauer",avg?`${avg}s`:"—",C.blue]].map(([l,v,c])=>(
        <div key={l} style={{ flex:1,background:C.bg0,border:`1px solid ${C.border}`,
          borderRadius:3,padding:"3px 4px",textAlign:"center" }}>
          <div style={{ fontFamily:"monospace",fontSize:13,fontWeight:700,color:c }}>{v}</div>
          <div style={{ fontSize:9,color:C.zinc5,textTransform:"uppercase",letterSpacing:"0.05em" }}>{l}</div>
        </div>
      ))}
    </div>
  );
};

export default function VideoStudioScene() { 
  const [loading,setLoading]=useState(false);
  const [statusMsg,setStatusMsg]=useState("");
  const [isError,setIsError]=useState(false);
  const [autoPilot,setAutoPilot]=useState(false);
  const [isPlaying,setIsPlaying]=useState(false);
  const [jobs,setJobs]=useState([]);
  const [activeJobId,setActiveJobId]=useState(null);
  const [lastPolled,setLastPolled]=useState(null);
  const pollingRef=useRef(null);

  const [cfg,setCfg]=useState({
    background_video:"background_loop.mp4",topic:"Automatischer Content",
    text_content:"EVE Video Studio ist online!",duration:10,
    text_position:"center",text_color:"white",font_size:40,
    box_color:"black",box_opacity:0.6,
    brightness:0.0,contrast:1.0,saturation:1.0,
    sepia:false,invert_colors:false,flip_horizontal:false,flip_vertical:false,
    fade_in:false,fade_out:false,grayscale:false,blur:false,vignette:true,
    noise:false,glitch_rgb:false,pixelate:false,
    show_timecode:false,progress_bar:false,mute_audio:false,audio_volume:1.0,
  });

  const fetchJobs=useCallback(async()=>{
    try {
      const r=await fetch(`${API_BASE}/api/video/jobs`);
      if(r.ok){const d=await r.json();setJobs(d.jobs||[]);setLastPolled(new Date());}
    } catch{}
  },[]);

  useEffect(()=>{fetchJobs();},[fetchJobs]);

  useEffect(()=>{
    const active=jobs.some(j=>["rendering","researching","queued"].includes(j.status));
    if(active){pollingRef.current=setInterval(fetchJobs,3000);}
    else{clearInterval(pollingRef.current);}
    return()=>clearInterval(pollingRef.current);
  },[jobs,fetchJobs]);

  useEffect(()=>{
    if(!activeJobId) return;
    const job=jobs.find(j=>j.job_id===activeJobId);
    if(!job) return;
    if(job.status==="done"){setStatusMsg(`✓ Fertig (${job.duration_sec}s): ${job.output_file?.split("/").pop()}`);setIsError(false);}
    if(job.status==="error"){setStatusMsg(`Fehler: ${job.error}`);setIsError(true);}
  },[jobs,activeJobId]);

  const handleChange=e=>{
    const{name,value,type,checked}=e.target;
    const v=type==="checkbox"?checked
      :(type==="range"||type==="number")
        ?(name==="duration"||name==="font_size"?parseInt(value):parseFloat(value))
        :value;
    setCfg(p=>({...p,[name]:v}));
  };

  const handleRender=async()=>{
    setLoading(true);setIsError(false);setActiveJobId(null);
    setStatusMsg(autoPilot?"EVE recherchiert…":"Sende Render-Auftrag…");
    try {
      const ep=autoPilot?`${API_BASE}/api/video/auto-pipeline`:`${API_BASE}/api/video/create-meme`;
      const payload=autoPilot?{topic:cfg.topic,background_video:cfg.background_video,duration:cfg.duration}:cfg;
      const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json();
      if(r.ok){setActiveJobId(d.job_id);setStatusMsg(`Job ${d.job_id} gestartet…`);await fetchJobs();}
      else{setIsError(true);setStatusMsg(`Fehler: ${d.detail||"Serverfehler"}`);}
    } catch(e){setIsError(true);setStatusMsg(`Netzwerkfehler: ${e.message}`);}
    setLoading(false);
  };

  const activeJob=jobs.find(j=>j.job_id===activeJobId);
  const fxList=[
    ["fade_in","Fade In"],["fade_out","Fade Out"],["vignette","Vignette"],["blur","Blur"],
    ["grayscale","Schwarzweiß"],["sepia","Sepia"],["invert_colors","Invertieren"],
    ["pixelate","8-Bit Pixel"],["glitch_rgb","RGB Glitch"],["noise","VHS Noise"],
    ["flip_horizontal","Spiegeln H"],["flip_vertical","Spiegeln V"],
    ["show_timecode","Timecode"],["progress_bar","Ladebalken"],
  ];

  return (
    <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",
      background:C.bg0,fontFamily:"'Segoe UI',system-ui,sans-serif",
      color:C.zinc2,fontSize:12,overflow:"hidden",borderRadius:8 }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.bg0}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        input[type=range]{-webkit-appearance:none;background:${C.bg3};border-radius:2px;height:3px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:${C.blue};cursor:pointer}
      `}</style>

      {/* MENU BAR */}
      <div style={{ background:C.bg3,borderBottom:`1px solid ${C.border}`,
        padding:"4px 12px",display:"flex",alignItems:"center",gap:14,flexShrink:0 }}>
        <span style={{ fontWeight:700,color:C.blue,letterSpacing:1,fontSize:11 }}>EVE STUDIO</span>
        {["Datei","Bearbeiten","Sequence","Effekte","Fenster"].map(m=>(
          <span key={m} style={{ color:C.zinc5,cursor:"pointer",fontSize:11,padding:"1px 5px" }}>{m}</span>
        ))}
        <div style={{ flex:1 }}/>
        <label style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,cursor:"pointer",
          padding:"3px 10px",borderRadius:3,userSelect:"none",
          background:autoPilot?"#4a0e7c":C.bg2,
          border:`1px solid ${autoPilot?C.fuchsia:C.border}`,
          color:autoPilot?C.fuchsia:C.zinc4,
          boxShadow:autoPilot?`0 0 10px ${C.fuchsia}55`:"none" }}>
          <input type="checkbox" checked={autoPilot} onChange={e=>setAutoPilot(e.target.checked)} style={{ display:"none" }}/>
          <Activity size={12} style={{ animation:autoPilot?"blink 1s infinite":"none" }}/>
          EVE AUTO-PILOT
        </label>
      </div>

      {/* MAIN WORKSPACE — hard 3-column grid, no Tailwind breakpoints */}
      <div style={{ flex:1,display:"grid",gridTemplateColumns:"210px 1fr 270px",
        gap:2,padding:2,minHeight:0,overflow:"hidden" }}>

        {/* COL 1: EFFECTS */}
        <div style={{ ...panelStyle,opacity:autoPilot?0.35:1,pointerEvents:autoPilot?"none":"auto" }}>
          <div style={headStyle}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Palette size={13} color={C.blue}/>Lumetri &amp; FX
            </div>
            <Sparkles size={11} color={C.amber}/>
          </div>
          <div style={{ overflowY:"auto",flex:1,minHeight:0,padding:"8px" }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10,fontWeight:700,color:C.zinc5,textTransform:"uppercase",
                letterSpacing:"0.07em",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.border}` }}>
                Grundeinstellungen
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                <SliderRow name="brightness" label="Helligkeit" min={-1} max={1} step={0.1} config={cfg} onChange={handleChange}/>
                <SliderRow name="contrast" label="Kontrast" min={0} max={2} step={0.1} config={cfg} onChange={handleChange}/>
                <SliderRow name="saturation" label="Sättigung" min={0} max={3} step={0.1} config={cfg} onChange={handleChange}/>
                <SliderRow name="font_size" label="Schriftgröße" min={16} max={96} step={2} config={cfg} onChange={handleChange}/>
                <SliderRow name="audio_volume" label="Lautstärke" min={0} max={2} step={0.1} config={cfg} onChange={handleChange}/>
              </div>
            </div>
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:C.zinc5,textTransform:"uppercase",
                letterSpacing:"0.07em",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${C.border}` }}>
                Video-Effekte (FX)
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:4 }}>
                {fxList.map(([n,l])=><FxToggle key={n} name={n} label={l} config={cfg} onChange={handleChange}/>)}
              </div>
            </div>
          </div>
        </div>

        {/* COL 2: PROGRAM MONITOR */}
        <div style={panelStyle}>
          <div style={headStyle}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Monitor size={13} color={C.blue}/>Program Monitor
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontFamily:"monospace",fontSize:10,color:C.zinc5,
                background:C.bg0,padding:"1px 6px",borderRadius:3,border:`1px solid ${C.border}` }}>
                1920×1080
              </span>
              <span style={{ width:7,height:7,borderRadius:"50%",display:"inline-block",
                background:isPlaying?C.emerald:C.zinc5,
                boxShadow:isPlaying?`0 0 6px ${C.emerald}`:"none" }}/>
            </div>
          </div>
          {/* Viewport */}
          <div style={{ flex:1,background:"#000",position:"relative",overflow:"hidden",
            display:"flex",alignItems:"center",justifyContent:"center",minHeight:0 }}>
            <div style={{ position:"absolute",inset:0,opacity:0.25,
              backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 39px,${C.border} 39px,${C.border} 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,${C.border} 39px,${C.border} 40px)` }}/>
            <div style={{ position:"absolute",top:"50%",left:0,right:0,height:1,background:`${C.border}66` }}/>
            <div style={{ position:"absolute",left:"50%",top:0,bottom:0,width:1,background:`${C.border}66` }}/>
            {cfg.vignette&&<div style={{ position:"absolute",inset:0,boxShadow:"inset 0 0 70px rgba(0,0,0,0.9)",pointerEvents:"none" }}/>}
            <div style={{ textAlign:"center",zIndex:1 }}>
              <Film size={36} color={isPlaying?C.blue:C.zinc5} style={{ marginBottom:6,transition:"color 0.3s" }}/>
              <div style={{ fontSize:10,color:C.zinc4,fontFamily:"monospace" }}>{cfg.background_video}</div>
              <div style={{ fontSize:9,color:C.zinc5,marginTop:2 }}>{cfg.duration}s · {cfg.text_position}</div>
            </div>
            {/* Text overlay */}
            <div style={{ position:"absolute",
              ...(cfg.text_position==="top"?{top:16}:cfg.text_position==="center"?{top:"50%",transform:"translateY(-50%)"}:{bottom:16}),
              left:12,right:12,textAlign:"center",zIndex:2 }}>
              <div style={{ display:"inline-block",background:"rgba(0,0,0,0.75)",
                color:"#fff",fontSize:Math.max(9,cfg.font_size*0.22),padding:"3px 10px",
                borderRadius:2,fontFamily:"monospace",maxWidth:"100%",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {cfg.text_content}
              </div>
            </div>
            {/* Active job badge */}
            {activeJob&&(activeJob.status==="rendering"||activeJob.status==="researching")&&(
              <div style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.9)",
                border:`1px solid ${C.amber}55`,borderRadius:4,padding:"4px 8px",
                display:"flex",alignItems:"center",gap:5,fontSize:10 }}>
                <Loader2 size={10} color={C.amber} style={{ animation:"spin 1s linear infinite" }}/>
                <span style={{ color:C.amber }}>{activeJob.stage||"Rendering…"}</span>
                <LiveTimer startedAt={activeJob.started_at} finishedAt={activeJob.finished_at} durationSec={activeJob.duration_sec}/>
              </div>
            )}
          </div>
          {/* Transport */}
          <div style={{ background:C.bg3,borderTop:`1px solid ${C.border}`,
            padding:"6px 12px",display:"flex",alignItems:"center",
            justifyContent:"center",gap:12,flexShrink:0 }}>
            <button style={{ background:"none",border:"none",cursor:"pointer",color:C.zinc5,padding:2 }}>
              <SkipBack size={14}/>
            </button>
            <button onClick={()=>setIsPlaying(p=>!p)}
              style={{ background:isPlaying?C.amber:C.blue,border:"none",borderRadius:3,
                cursor:"pointer",color:"#fff",padding:"4px 8px",display:"flex",alignItems:"center" }}>
              {isPlaying?<Pause size={13} fill="#fff"/>:<Play size={13} fill="#fff"/>}
            </button>
            <button style={{ background:"none",border:"none",cursor:"pointer",color:C.zinc5,padding:2 }}>
              <SkipForward size={14}/>
            </button>
            <span style={{ fontFamily:"monospace",fontSize:10,color:C.zinc5,marginLeft:8 }}>
              00:00:00:00 / {cfg.duration}s
            </span>
          </div>
        </div>

        {/* COL 3: PROJECT PANEL */}
        <div style={panelStyle}>
          <div style={headStyle}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Folder size={13} color={C.blue}/>Project &amp; Sequenz
            </div>
          </div>
          <div style={{ overflowY:"auto",flex:1,minHeight:0,padding:"8px",
            display:"flex",flexDirection:"column",gap:8 }}>
            {[{name:"background_video",label:"Quelldatei (NAS)",type:"text"},
              {name:"topic",label:"Thema",type:"text"},
              {name:"duration",label:"Dauer (Sek.)",type:"number"}].map(({name,label,type})=>(
              <label key={name} style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <span style={{ fontSize:10,color:C.zinc5 }}>{label}</span>
                <input type={type} name={name} value={cfg[name]} onChange={handleChange}
                  min={type==="number"?1:undefined}
                  style={{ background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,
                    padding:"4px 7px",color:C.zinc2,fontSize:11,fontFamily:"monospace",
                    outline:"none",width:"100%",boxSizing:"border-box" }}/>
              </label>
            ))}
            <label style={{ display:"flex",flexDirection:"column",gap:3 }}>
              <span style={{ fontSize:10,color:C.zinc5 }}>Text-Position</span>
              <select name="text_position" value={cfg.text_position} onChange={handleChange}
                style={{ background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,
                  padding:"4px 7px",color:C.zinc2,fontSize:11,outline:"none" }}>
                <option value="top">Oben</option>
                <option value="center">Mitte</option>
                <option value="bottom">Unten</option>
              </select>
            </label>
            {!autoPilot?(
              <label style={{ display:"flex",flexDirection:"column",gap:3,flex:1 }}>
                <span style={{ fontSize:10,color:C.zinc5 }}>Text Overlay</span>
                <textarea name="text_content" value={cfg.text_content} onChange={handleChange}
                  style={{ background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,
                    padding:"6px 7px",color:C.zinc2,fontSize:11,fontFamily:"monospace",
                    resize:"vertical",minHeight:70,outline:"none",lineHeight:1.5 }}/>
              </label>
            ):(
              <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",background:C.bg0,
                border:`1px dashed ${C.fuchsia}55`,borderRadius:4,minHeight:70,
                padding:10,textAlign:"center" }}>
                <Activity size={20} color={C.fuchsia} style={{ marginBottom:6,animation:"blink 1s infinite" }}/>
                <div style={{ fontSize:11,fontWeight:700,color:C.fuchsia,
                  letterSpacing:"0.06em",textTransform:"uppercase" }}>KI-Agent aktiv</div>
                <div style={{ fontSize:10,color:C.zinc5,marginTop:4 }}>Analysiert "{cfg.topic}"</div>
              </div>
            )}
            {statusMsg&&(
              <div style={{ display:"flex",alignItems:"flex-start",gap:6,padding:"5px 7px",
                background:C.bg0,border:`1px solid ${isError?C.rose+"44":C.emerald+"44"}`,
                borderRadius:3,fontSize:10,fontFamily:"monospace",color:isError?C.rose:C.emerald }}>
                {isError?<AlertCircle size={11} style={{ flexShrink:0,marginTop:1 }}/>
                  :<CheckCircle size={11} style={{ flexShrink:0,marginTop:1 }}/>}
                <span style={{ wordBreak:"break-all" }}>{statusMsg}</span>
              </div>
            )}
            <button onClick={handleRender} disabled={loading}
              style={{ display:"flex",alignItems:"center",justifyContent:"center",
                gap:7,padding:"8px 14px",borderRadius:4,fontWeight:700,
                fontSize:12,letterSpacing:"0.05em",cursor:loading?"not-allowed":"pointer",
                border:"none",transition:"all 0.2s",
                background:loading?C.bg3:autoPilot?"#7c3aed":C.blue,
                color:loading?C.zinc5:"#fff",
                boxShadow:loading?"none":autoPilot?`0 0 14px ${C.fuchsia}55`:`0 0 10px ${C.blue}55` }}>
              {loading?<Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/>:<Film size={14}/>}
              {loading?"RENDERING…":autoPilot?"AUTO-PIPELINE STARTEN":"EXPORTIEREN & RENDERN"}
            </button>
          </div>
        </div>
      </div>

      {/* TIMELINE + QUEUE */}
      <div style={{ background:C.bg2,borderTop:`1px solid ${C.border}`,flexShrink:0 }}>
        {/* Timeline */}
        <div style={{ borderBottom:`1px solid ${C.border}` }}>
          <div style={{ background:C.bg3,padding:"4px 10px",
            display:"flex",alignItems:"center",justifyContent:"space-between",
            fontSize:11,fontWeight:600,color:C.zinc4 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <Scissors size={12} color={C.blue}/>Timeline — V1 / A1
            </div>
            <span style={{ fontFamily:"monospace",fontSize:10,color:C.zinc5 }}>
              00:00:00:00 / {cfg.duration}s
            </span>
          </div>
          <div style={{ height:32,background:C.bg1,position:"relative",overflow:"hidden",
            display:"flex",alignItems:"center",padding:"0 8px" }}>
            <div style={{ position:"absolute",top:0,bottom:0,left:"28%",
              width:1,background:"#ef4444",zIndex:2 }}/>
            {Array.from({length:21}).map((_,i)=>(
              <div key={i} style={{ position:"absolute",left:`${i*5}%`,top:0,
                height:i%5===0?8:4,width:1,background:C.zinc5+(i%5===0?"88":"44") }}/>
            ))}
            <div style={{ position:"absolute",left:8,width:"55%",height:20,
              background:`${C.blue}33`,border:`1px solid ${C.blue}88`,borderRadius:2,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 8px",zIndex:1 }}>
              <span style={{ fontSize:9,fontFamily:"monospace",color:"#93c5fd",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                [V1] {cfg.background_video}
              </span>
              <span style={{ fontSize:9,color:"#93c5fd",flexShrink:0 }}>{cfg.duration}s</span>
            </div>
          </div>
        </div>
        {/* Queue */}
        <div style={{ background:C.bg3,padding:"4px 10px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          fontSize:11,fontWeight:600,color:C.zinc4,borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <ListVideo size={12} color={C.blue}/>Render Queue
            {lastPolled&&<span style={{ fontSize:9,color:C.zinc5,fontWeight:400 }}>
              — {lastPolled.toLocaleTimeString("de-DE")}
            </span>}
          </div>
          <button onClick={fetchJobs} style={{ background:"none",border:"none",
            cursor:"pointer",color:C.zinc5,padding:2 }}>
            <RefreshCw size={11}/>
          </button>
        </div>
        <MetricsBar jobs={jobs}/>
        <div style={{ maxHeight:100,overflowY:"auto",padding:"4px 6px",background:C.bg1 }}>
          {jobs.length===0?(
            <div style={{ textAlign:"center",color:C.zinc5,fontSize:10,padding:"12px 0" }}>
              Keine Render-Jobs. Starte einen Auftrag.
            </div>
          ):jobs.map(j=><JobRow key={j.job_id} job={j}/>)}
        </div>
      </div>
    </div>
  );
}
