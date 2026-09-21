import React, { useState } from 'react';
import { Code2, MessageSquare, Terminal as TerminalIcon, HardDrive, Shield, ExternalLink, RefreshCw, Power } from 'lucide-react';
import WhatsAppView from './WhatsAppView';
import TerminalScene from './TerminalScene';
import FileBrowserScene from './FileBrowserScene';

export default function AppsScene() {
  const [activeTab, setActiveTab] = useState('vscode'); // 'vscode' | 'whatsapp' | 'terminal' | 'files'
  const [iframeKey, setIframeKey] = useState(0);

  // Status, ob ein Modul aktiv (im Speicher geladen) ist oder nicht
  const [enabledApps, setEnabledApps] = useState({
    vscode: true,
    whatsapp: true,
    terminal: true,
    files: true,
  });

  const toggleAppModule = (appName, e) => {
    e.stopPropagation();
    setEnabledApps(prev => ({ ...prev, [appName]: !prev[appName] }));
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col gap-3 select-none">
      {/* =======================================================================
        HEADER DOCK / PROGRAMM PANEL LEISTE
        ======================================================================= */}
      <div className="flex justify-between items-center p-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
        
        {/* Programm Selector Tabs */}
        <div className="flex items-center gap-2">
          {/* VS Code Tab Button */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border font-mono text-xs ${
            activeTab === 'vscode'
              ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-100 hover:border-white/[0.12]'
          }`}>
            <button 
              onClick={() => setActiveTab('vscode')}
              className="flex items-center gap-2 font-bold cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-[#00f0ff]" />
              <span className="uppercase tracking-wider text-[11px]">VS Code</span>
            </button>
            
            <button
              onClick={(e) => toggleAppModule('vscode', e)}
              title={enabledApps.vscode ? "VSCode Modul entladen (RAM/CPU sparen)" : "VSCode Modul aktivieren"}
              className={`p-1 rounded-lg transition-colors ml-1 cursor-pointer ${
                enabledApps.vscode ? 'text-[#00f0ff] hover:bg-[#00f0ff]/20' : 'text-slate-600 hover:bg-white/[0.05]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* WhatsApp Tab Button */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border font-mono text-xs ${
            activeTab === 'whatsapp'
              ? 'bg-[#00ffcc]/10 border-[#00ffcc]/40 text-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.2)]'
              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-100 hover:border-white/[0.12]'
          }`}>
            <button 
              onClick={() => setActiveTab('whatsapp')}
              className="flex items-center gap-2 font-bold cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#00ffcc]" />
              <span className="uppercase tracking-wider text-[11px]">WhatsApp</span>
            </button>
            
            <button
              onClick={(e) => toggleAppModule('whatsapp', e)}
              title={enabledApps.whatsapp ? "WhatsApp Modul entladen" : "WhatsApp Modul aktivieren"}
              className={`p-1 rounded-lg transition-colors ml-1 cursor-pointer ${
                enabledApps.whatsapp ? 'text-[#00ffcc] hover:bg-[#00ffcc]/20' : 'text-slate-600 hover:bg-white/[0.05]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Terminal Tab Button */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border font-mono text-xs ${
            activeTab === 'terminal'
              ? 'bg-[#6366f1]/10 border-[#6366f1]/40 text-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-100 hover:border-white/[0.12]'
          }`}>
            <button 
              onClick={() => setActiveTab('terminal')}
              className="flex items-center gap-2 font-bold cursor-pointer"
            >
              <TerminalIcon className="w-4 h-4 text-[#6366f1]" />
              <span className="uppercase tracking-wider text-[11px]">Terminal</span>
            </button>
            
            <button
              onClick={(e) => toggleAppModule('terminal', e)}
              title={enabledApps.terminal ? "Terminal-Modul entladen" : "Terminal-Modul aktivieren"}
              className={`p-1 rounded-lg transition-colors ml-1 cursor-pointer ${
                enabledApps.terminal ? 'text-[#6366f1] hover:bg-[#6366f1]/20' : 'text-slate-600 hover:bg-white/[0.05]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Files Tab Button */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border font-mono text-xs ${
            activeTab === 'files'
              ? 'bg-[#fbbf24]/10 border-[#fbbf24]/40 text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.2)]'
              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-100 hover:border-white/[0.12]'
          }`}>
            <button 
              onClick={() => setActiveTab('files')}
              className="flex items-center gap-2 font-bold cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-[#fbbf24]" />
              <span className="uppercase tracking-wider text-[11px]">Files</span>
            </button>
            
            <button
              onClick={(e) => toggleAppModule('files', e)}
              title={enabledApps.files ? "Files-Modul entladen" : "Files-Modul aktivieren"}
              className={`p-1 rounded-lg transition-colors ml-1 cursor-pointer ${
                enabledApps.files ? 'text-[#fbbf24] hover:bg-[#fbbf24]/20' : 'text-slate-600 hover:bg-white/[0.05]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-2">
          {activeTab === 'vscode' && enabledApps.vscode && (
            <>
              <button
                onClick={handleReload}
                title="Editor neuladen"
                className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl p-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-[#00f0ff]" />
              </button>
              <a
                href="/vscode/"
                target="_blank"
                rel="noopener noreferrer"
                title="In neuem Tab öffnen"
                className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl p-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3 text-[#00f0ff]" />
              </a>
            </>
          )}

          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-[#030406] text-[#00f0ff] px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
            <Shield className="w-3 h-3 text-[#00f0ff]" />
            <span className="font-bold uppercase tracking-wider">
              {activeTab === 'vscode' && 'VSCode Server'}
              {activeTab === 'whatsapp' && 'WhatsApp Gateway'}
              {activeTab === 'terminal' && 'Terminal Daemon'}
              {activeTab === 'files' && 'File Explorer'}
            </span>
          </div>
        </div>
      </div>

      {/* =======================================================================
        APP CONTAINER / INHALTSBEREICH
        ======================================================================= */}
      <div className="flex-1 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-3 overflow-hidden relative flex flex-col shadow-2xl">
        
        {/* VS CODE ANZEIGE */}
        {activeTab === 'vscode' && (
          enabledApps.vscode ? (
            <div className="w-full h-full flex-1 rounded-xl overflow-hidden border border-white/[0.08] relative bg-[#030406] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
              <iframe
                key={iframeKey}
                src="/vscode/?folder=/config/workspace"
                title="EVE VS Code Workspace"
                className="w-full h-full border-0 rounded-xl"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-500 gap-3 font-mono">
              <Power className="w-8 h-8 text-slate-700" />
              <span className="text-xs uppercase tracking-wider">VSCode-Modul ist deaktiviert (Ressourcen gespart).</span>
            </div>
          )
        )}

        {/* WHATSAPP ANZEIGE */}
        {activeTab === 'whatsapp' && (
          enabledApps.whatsapp ? (
            <WhatsAppView />
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-500 gap-3 font-mono">
              <Power className="w-8 h-8 text-slate-700" />
              <span className="text-xs uppercase tracking-wider">WhatsApp-Modul ist deaktiviert.</span>
            </div>
          )
        )}

        {/* TERMINAL ANZEIGE */}
        {activeTab === 'terminal' && (
          enabledApps.terminal ? (
            <div className="w-full h-full flex-1 flex flex-col overflow-hidden relative">
              <TerminalScene />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-500 gap-3 font-mono">
              <Power className="w-8 h-8 text-slate-700" />
              <span className="text-xs uppercase tracking-wider">Terminal-Modul ist deaktiviert.</span>
            </div>
          )
        )}

        {/* FILE BROWSER ANZEIGE */}
        {activeTab === 'files' && (
          enabledApps.files ? (
            <div className="w-full h-full flex-1 flex flex-col overflow-hidden relative">
              <FileBrowserScene />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center text-slate-500 gap-3 font-mono">
              <Power className="w-8 h-8 text-slate-700" />
              <span className="text-xs uppercase tracking-wider">Files-Modul ist deaktiviert.</span>
            </div>
          )
        )}

      </div>
    </div>
  );
}