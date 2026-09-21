import React from 'react';
import { CheckSquare, List, Network, RefreshCw, Zap, Compass, FolderPlus } from 'lucide-react';

export default function TodoHeader({
  activeTab,
  setActiveTab,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  onOpenProjectModal,
  progressPercent,
  completedCount,
  totalCount,
  highPriorityCount
}) {
  return (
    <div className="bg-[#030408]/80 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,240,255,0.15)] relative overflow-hidden space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-white to-[#ff007f] tracking-wider font-mono flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-[#00f0ff]" />
            TODO 2.0 // CORTEX GRAPH & ANKER
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-3">
            <span>Graphenbasierte Tasks, Notizen & Routinen</span>
            {highPriorityCount > 0 && (
              <span className="text-pink-400 font-bold bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-full text-[10px]">
                🔥 {highPriorityCount} Hohe Prio
              </span>
            )}
          </p>
        </div>

        {/* Tab-Wechsler */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list' ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Liste
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'graph' ? 'bg-[#ff007f]/20 text-[#ff007f] border border-[#ff007f]/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" /> Graph View
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'routines' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Routinen
          </button>
        </div>
      </div>

      {/* Projekt-Anker Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 uppercase">
          <Compass className="w-3 h-3 text-cyan-400" /> Projekt-Anker:
        </span>
        
        <button
          onClick={() => setSelectedProjectId('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
            selectedProjectId === 'all' 
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]' 
              : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
          }`}
        >
          🌐 Alle Projekte
        </button>

        {projects.map(proj => (
          <button
            key={proj.id}
            onClick={() => setSelectedProjectId(proj.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border flex items-center gap-1.5 ${
              selectedProjectId === proj.id 
                ? 'bg-pink-500/20 text-pink-300 border-pink-400 font-bold shadow-[0_0_10px_rgba(255,0,127,0.3)]' 
                : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color || '#00f0ff' }} />
            {proj.title}
          </button>
        ))}

        <button
          onClick={onOpenProjectModal}
          className="px-2 py-1 rounded-lg text-xs font-mono text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition flex items-center gap-1 cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" /> Neu
        </button>
      </div>

      {/* Tages-Progressbar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" /> Tages-Fortschritt
          </span>
          <span className="text-[#00f0ff] font-bold">{progressPercent}% ({completedCount}/{totalCount})</span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff007f] rounded-full transition-all duration-500 shadow-[0_0_12px_#00f0ff]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}