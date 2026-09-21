import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

export default function EVEAvatar({ 
  onClick, 
  cortexActive = false, 
  activeCategory = 'all',
  onSelectCategory,
  nodesData = {},
  className = "" 
}) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState(null);
  const projectedNodesRef = useRef([]);

  // 3D-Neuronetz Rendering direkt in der Schallplatte
  useEffect(() => {
    if (!cortexActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const { 
      reportsCount = 0, 
      nasFilesCount = 0, 
      bazaarCount = 0, 
      logsCount = 0, 
      calendarCount = 0, 
      activeTodosCount = 0, 
      todoStats = { hoch: 0, mittel: 0, gering: 0 }, 
      systemMetrics = {} 
    } = nodesData;

    let currentNodes = [];
    let currentConnections = [];

    const rootCategories = [
      { id: "ai-core", label: "AI & Skills", color: "#00f0ff", x: 0, y: -40, z: 0, size: 8 },
      { id: "knowledge", label: "Knowledge Base", color: "#00ffcc", x: -80, y: -15, z: -25, size: 7 },
      { id: "infra", label: "Infrastructure", color: "#6366f1", x: 80, y: -15, z: 25, size: 7 },
      { id: "security", label: "DNS Shield", color: "#ff007f", x: 45, y: 65, z: -35, size: 6 },
      { id: "productivity", label: "Productivity", color: "#fbbf24", x: -45, y: 65, z: 35, size: 6 }
    ];

    if (activeCategory === 'all') {
      rootCategories.forEach((cat, idx) => {
        currentNodes.push({ ...cat, isParent: true, subDesc: 'Cluster Node' });
        if (idx > 0) currentConnections.push([0, idx, false]);
      });
    } else {
      let parentColor = "#00f0ff";
      let subItems = [];

      if (activeCategory === 'ai-core') {
        parentColor = "#00f0ff";
        subItems = [
          { label: "EVE Core Engine", desc: "Main Controller" },
          { label: "LLM Local Model", desc: "Local Llama Pipeline" },
          { label: "Vector Registry", desc: "Embeddings Memory" },
          { label: "Cypher Router", desc: "GraphDB Parser" }
        ];
      } else if (activeCategory === 'knowledge') {
        parentColor = "#00ffcc";
        subItems = [
          { label: `Reports (${reportsCount})`, desc: "Deep Cache" },
          { label: `NAS Documents (${nasFilesCount})`, desc: "Repository" },
          { label: "Knowledge Graph", desc: "Entities" },
          { label: `Bazaar (${bazaarCount})`, desc: "Market Graph" }
        ];
      } else if (activeCategory === 'infra') {
        parentColor = "#6366f1";
        subItems = [
          { label: "FastAPI Backend", desc: "Port 5000" },
          { label: "CPU Engine", desc: `Load: ${systemMetrics.cpu_percent || 0}%` },
          { label: "RAM Memory", desc: `Usage: ${systemMetrics.ram_percent || 0}%` },
          { label: `Logs (${logsCount})`, desc: "Buffer" }
        ];
      } else if (activeCategory === 'security') {
        parentColor = "#ff007f";
        subItems = [
          { label: "DNS Shield", desc: "Pi-hole Active" },
          { label: "Blocklist", desc: "Filtered Domains" },
          { label: "FTL Database", desc: "DNS Logs" }
        ];
      } else if (activeCategory === 'productivity') {
        parentColor = "#fbbf24";
        subItems = [
          { label: `Calendar (${calendarCount})`, desc: "Events" },
          { label: `Todos (${activeTodosCount})`, desc: `H:${todoStats.hoch} M:${todoStats.mittel}` },
          { label: `Bazaar Flips (${bazaarCount})`, desc: "Market Sync" }
        ];
      }

      currentNodes.push({ id: activeCategory, label: activeCategory.toUpperCase(), color: parentColor, x: 0, y: -65, z: 0, size: 9, isParent: true });

      const totalSubs = subItems.length;
      subItems.forEach((sub, i) => {
        const angle = (i / totalSubs) * Math.PI * 2;
        currentNodes.push({
          id: `${activeCategory}-${i}`,
          label: sub.label,
          subDesc: sub.desc,
          color: parentColor,
          x: Math.cos(angle) * 115,
          y: Math.sin(angle) * 85,
          z: (i % 2 === 0 ? 30 : -30),
          size: 5,
          isParent: false
        });
        currentConnections.push([0, i + 1, true]);
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxRadius = (Math.min(canvas.width, canvas.height) / 2) * 0.8;

      rotationRef.current += 0.001; // Reduzierte Rotationsgeschwindigkeit im Cortex-Modus
      const rot = rotationRef.current;

      const projected = currentNodes.map(node => {
        const rx = node.x * Math.cos(rot) - node.z * Math.sin(rot);
        const rz = node.x * Math.sin(rot) + node.z * Math.cos(rot);
        const normFactor = maxRadius / 130;
        const perspective = 500 / (500 + rz * normFactor);

        return {
          ...node,
          px: cx + rx * normFactor * perspective,
          py: cy + node.y * normFactor * perspective,
          pSize: Math.max(2.5, node.size * perspective * 1.1)
        };
      });

      projectedNodesRef.current = projected;

      // Connections
      currentConnections.forEach(([i, j, isSub]) => {
        const n1 = projected[i], n2 = projected[j];
        if (!n1 || !n2) return;
        ctx.beginPath();
        ctx.moveTo(n1.px, n1.py);
        ctx.lineTo(n2.px, n2.py);
        ctx.strokeStyle = isSub ? `${n1.color}77` : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = isSub ? 1.5 : 2;
        ctx.setLineDash(isSub ? [3, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Nodes
      projected.forEach(node => {
        ctx.save();
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          node.px - node.pSize * 0.3, 
          node.py - node.pSize * 0.3, 
          node.pSize * 0.1, 
          node.px, 
          node.py, 
          node.pSize
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, node.color);
        gradient.addColorStop(1, '#030406');

        ctx.arc(node.px, node.py, node.pSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.shadowBlur = node.isParent ? 15 : 8;
        ctx.shadowColor = node.color;
        ctx.fill();
        ctx.restore();

        ctx.font = node.isParent ? "bold 10px monospace" : "9px monospace";
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.fillText(node.label.toUpperCase(), node.px, node.py - (node.isParent ? 14 : 10));

        if (node.subDesc) {
          ctx.font = "7.5px monospace";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(node.subDesc, node.px, node.py + 12);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    const updateSize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
    };
  }, [cortexActive, activeCategory, nodesData]);

  const handleCanvasMouseMove = (e) => {
    if (!cortexActive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = projectedNodesRef.current.find(n => {
      const dx = n.px - x;
      const dy = n.py - y;
      return Math.sqrt(dx * dx + dy * dy) < (n.pSize + 6);
    });

    setHoveredNodeInfo(hit || null);
  };

  const handleCanvasClick = (e) => {
    if (!cortexActive) {
      onClick?.();
      return;
    }

    if (hoveredNodeInfo && hoveredNodeInfo.isParent && onSelectCategory) {
      e.stopPropagation();
      onSelectCategory(hoveredNodeInfo.id);
    } else {
      onClick?.();
    }
  };

  // Ermittlung des Status für die Anzeige
  const currentStatus = cortexActive ? `ACTIVE: ${activeCategory.toUpperCase()}` : "SYS_STANDBY";

  return (
    <div 
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      className={`relative flex justify-center items-center cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-95 group isolate ${className}`}
    >
      {/* CYAN & PINK AMBIENT GLOWS */}
      <div className="w-52 h-52 sm:w-72 sm:h-72 md:w-[480px] md:h-[480px] 2xl:w-[560px] 2xl:h-[560px] rounded-full bg-[#00f0ff]/35 blur-[140px] animate-pulse absolute pointer-events-none" />
      <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-[400px] md:h-[400px] 2xl:w-[480px] 2xl:h-[480px] rounded-full bg-[#ff007f]/35 blur-[120px] animate-pulse absolute pointer-events-none" style={{ animationDuration: '3.5s' }} />

      {/* KLASSISCHER VINYL-GLAS-CONTAINER */}
      <div 
        className="w-44 h-44 sm:w-56 sm:h-56 md:w-[440px] md:h-[440px] 2xl:w-[520px] 2xl:h-[520px] 
                   bg-[#080808]/90 
                   border border-[#00f0ff]/50 border-t-[#00f0ff]/80 border-b-[#ff007f]/70
                   ring-2 ring-pink-500/40 
                   rounded-full flex items-center justify-center relative z-10 
                   backdrop-blur-3xl backdrop-brightness-90
                   shadow-[0_0_70px_rgba(0,240,255,0.4),_0_0_110px_rgba(255,0,127,0.3),_inset_0_0_80px_rgba(0,240,255,0.3)] 
                   overflow-hidden 
                   transform-gpu [backface-visibility:hidden] [mask-image:-webkit-radial-gradient(white,black)]"
      >
        {/* WELLENARTIGE SCHIMMER-SCHICHTEN */}
        {!cortexActive && (
          <div className="absolute inset-0 pointer-events-none z-12 overflow-hidden rounded-full mix-blend-screen">
            <div className="absolute inset-[-50%] bg-[radial-gradient(circle_at_center,_rgba(0,240,255,0.35)_0%,_rgba(255,0,127,0.3)_40%,_transparent_70%)] animate-[wavePulse_12s_ease-in-out_infinite]" />
            <div className="absolute inset-[-50%] bg-[radial-gradient(circle_at_center,_rgba(255,0,127,0.25)_0%,_rgba(0,240,255,0.25)_50%,_transparent_75%)] animate-[wavePulse_16s_ease-in-out_infinite_reverse]" style={{ animationDelay: '-6s' }} />
          </div>
        )}

        {/* ECHTE ROTIERENDE SCHALLPLATTE (Reduzierte Drehgeschwindigkeit: 16s normal, 8s beim Hovern) */}
        {!cortexActive && (
          <div className="absolute inset-0 rounded-full pointer-events-none animate-[spin_16s_linear_infinite] group-hover:[animation-duration:8s] transition-all duration-700">
            
            {/* MIKRO OPTIK (Ultrafeine Nano-Textur) */}
            <div 
              className="absolute inset-0 rounded-full opacity-[0.25] mix-blend-overlay z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='ultraNanoNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='240.0' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23ultraNanoNoise)'/%3E%3C/svg%3E")`
              }}
            />

            {/* Eingravierte Vinyl-Rillen */}
            <div 
              className="absolute inset-0 rounded-full opacity-60 mix-blend-overlay"
              style={{
                background: `repeating-radial-gradient(
                  circle at center,
                  transparent 0,
                  transparent 2px,
                  rgba(255, 255, 255, 0.15) 3px,
                  rgba(0, 0, 0, 0.8) 4px
                )`
              }}
            />
            {/* Realistische Vinyl-Anisotropie */}
             <div 
              className="absolute inset-0 rounded-full opacity-40 mix-blend-screen"
              style={{
                background: `conic-gradient(
                  from 0deg at 50% 50%,
                  transparent 0deg,
                  rgba(255,255,255,0.2) 20deg,
                  transparent 40deg,
                  transparent 180deg,
                  rgba(255,255,255,0.2) 200deg,
                  transparent 220deg
                )`
              }}
            />
          </div>
        )}

        {/* STYLES FÜR WELLEN-ANIMATION */}
        <style>{`
          @keyframes wavePulse {
            0% { transform: scale(0.7) translate(0, 0); opacity: 0.4; }
            50% { transform: scale(1.15) translate(3%, -3%); opacity: 0.85; }
            100% { transform: scale(0.7) translate(0, 0); opacity: 0.4; }
          }
        `}</style>

        {/* KLASSISCHES VINYL-LABEL */}
        {!cortexActive ? (
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-[3px] border-[#222] flex flex-col items-center justify-center relative z-30 shadow-[0_0_45px_rgba(0,0,0,0.8),_inset_0_0_15px_rgba(0,0,0,0.9)] transform-gpu">
            
             {/* Klassischer Label-Rand (Zierlinie) */}
            <div className="absolute inset-1.5 md:inset-2 rounded-full border border-white/20 pointer-events-none" />

            {/* LEUCHTENDE SCHRIFT (EVE Schriftzug im Neon-Stil) */}
            <span className="text-xs sm:text-sm md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-white to-[#ff007f] tracking-[0.25em] font-mono absolute top-4 md:top-8 drop-shadow-[0_0_12px_rgba(0,240,255,0.9)]">
              EVE
            </span>

             {/* Statusanzeige statt RPM */}
             <span className="text-[6px] sm:text-[7px] md:text-[9px] text-cyan-400 tracking-wider font-mono absolute bottom-6 md:bottom-10 uppercase drop-shadow-[0_0_5px_rgba(0,240,255,0.7)]">
              {currentStatus}
            </span>
            
            {/* Bohrung (Spindle Hole) */}
            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 rounded-full bg-[#020305] flex items-center justify-center relative z-40 shadow-[inset_0_3px_6px_rgba(0,0,0,0.95)]">
               <div className="absolute inset-0 rounded-full border border-white/10" />
            </div>

          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full relative z-20 cursor-grab" />
        )}

        {/* Hover-HUD */}
        {hoveredNodeInfo && cortexActive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#030406]/95 border border-[#00f0ff]/50 px-3 py-1 rounded-xl backdrop-blur-xl text-[10px] text-cyan-400 font-mono z-40 pointer-events-none shadow-[0_4px_25px_rgba(0,240,255,0.5)]">
            Klick: <span className="font-bold text-white">{hoveredNodeInfo.label}</span> ansteuern
          </div>
        )}
      </div>
    </div>
  );
}