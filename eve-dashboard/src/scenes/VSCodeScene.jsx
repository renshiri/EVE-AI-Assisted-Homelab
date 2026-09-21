import React, { useState } from 'react';
import { Code2, Shield, ExternalLink, RefreshCw } from 'lucide-react';

export default function VSCodeScene() {
  const [iframeKey, setIframeKey] = useState(0);

  // Erzwingt das Neuladen des iFrames bei Proxy-Hängern
  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col gap-3 select-none">
      {/* =======================================================================
        HEADER BAR (Glassmorphism + Soft Neumorphic Inset Shadow)
        =======================================================================
      */}
      <div className="flex justify-between items-center p-3.5 rounded-2xl text-xs backdrop-blur-md transition-all duration-300
                      /* Glassmorphism Basis */
                      bg-slate-900/40 border border-slate-700/40 
                      /* Neumorphic Soft Glow & Outer/Inner Shadows */
                      shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_10px_20px_-5px_rgba(0,0,0,0.5)]">
        
        {/* Titel & Icon */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 shadow-[inset_0_0_8px_rgba(6,182,212,0.2)]">
            <Code2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <span className="font-bold text-slate-200 tracking-wide">EVE Code Editor</span>
            <span className="text-[10px] text-slate-400 ml-2 hidden sm:inline-block font-mono">
              [VS Code Server]
            </span>
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-2">
          {/* Reload-Button für das iFrame (Neumorphic Push Button) */}
          <button
            onClick={handleReload}
            title="Editor-Session neu laden"
            className="p-1.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-cyan-400 border border-slate-700/50 
                       hover:border-cyan-500/40 transition-all duration-200
                       shadow-[-2px_-2px_6px_rgba(255,255,255,0.03),_2px_2px_6px_rgba(0,0,0,0.6)]
                       active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Externer Link-Button */}
          <a
            href="/vscode/"
            target="_blank"
            rel="noopener noreferrer"
            title="In neuem Tab öffnen"
            className="p-1.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-cyan-400 border border-slate-700/50 
                       hover:border-cyan-500/40 transition-all duration-200
                       shadow-[-2px_-2px_6px_rgba(255,255,255,0.03),_2px_2px_6px_rgba(0,0,0,0.6)]
                       active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-cyan-950/70 text-cyan-400 px-2.5 py-1 rounded-xl border border-cyan-800/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold">Workspace Active</span>
          </div>
        </div>
      </div>

      {/* =======================================================================
        VS CODE CONTAINER (Neumorphic Frame with Embedded Glass Editor Screen)
        =======================================================================
      */}
      <div className="flex-1 bg-[#090d16]/90 border border-slate-800/80 rounded-2xl p-2.5 overflow-hidden relative flex flex-col backdrop-blur-xl
                      /* Kombination aus tiefer Neumorphic-Prägung und weichem Umgebungs-Glow */
                      shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),_0_20px_25px_-5px_rgba(0,0,0,0.7),_0_0_15px_rgba(6,182,212,0.05)]">
        
        {/* Der eigentliche iFrame Wrapper */}
        <div className="w-full h-full flex-1 rounded-xl overflow-hidden border border-slate-800/60 relative bg-[#1e1e1e]/90 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
          <iframe
            key={iframeKey}
            src="/vscode/?folder=/config/workspace"
            title="EVE VS Code Workspace"
            className="w-full h-full border-0 rounded-xl"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}