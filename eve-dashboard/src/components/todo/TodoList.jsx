import React from 'react';
import { Zap, CheckCircle2, StickyNote, Link2, Trash2 } from 'lucide-react';

export default function TodoList({
  filterMode,
  setFilterMode,
  filterPriority,
  setFilterPriority,
  filterCategory,
  setFilterCategory,
  categoriesList,
  filteredTodos,
  onToggleTodo,
  onDeleteTodo
}) {
  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030408]/60 border border-white/10 p-3 rounded-xl backdrop-blur-xl">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setFilterMode('ready')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition flex items-center gap-1 cursor-pointer ${
              filterMode === 'ready' ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold' : 'text-slate-400'
            }`}
          >
            <Zap className="w-3 h-3" /> Verfügbar (Ready)
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition flex items-center gap-1 cursor-pointer ${
              filterMode === 'all' ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            Alle Knoten
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300"
          >
            <option value="all">Alle Prio</option>
            <option value="Hoch">Hoch</option>
            <option value="Mittel">Mittel</option>
            <option value="Gering">Gering</option>
            <option value="Info">Info/Notiz</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300"
          >
            <option value="all">Alle Kat.</option>
            {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Task & Note Cards */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs bg-slate-900/30 rounded-2xl border border-dashed border-white/10">
            Keine Tasks oder Notizen in diesem Modus gefunden.
          </div>
        ) : (
          filteredTodos.map(todo => {
            const isNote = todo.is_note || todo.priority === 'Info';

            return (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isNote
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60'
                    : todo.completed 
                    ? 'bg-slate-950/40 border-white/5 opacity-50' 
                    : 'bg-[#05070f]/90 border-white/10 hover:border-cyan-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                }`}
              >
                <div className="flex items-center gap-3 font-mono">
                  {!isNote ? (
                    <button
                      onClick={() => onToggleTodo(todo.id, todo.completed)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                        todo.completed 
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950' 
                          : 'border-white/30 hover:border-cyan-400'
                      }`}
                    >
                      {todo.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <StickyNote className="w-3 h-3" />
                    </div>
                  )}

                  <div>
                    <span className={`text-xs font-medium ${todo.completed ? 'line-through text-slate-500' : isNote ? 'text-emerald-200' : 'text-slate-100'}`}>
                      {todo.title}
                    </span>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
                        {todo.category || 'System'}
                      </span>
                      
                      {isNote ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold">
                          Notiz-Knoten
                        </span>
                      ) : (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          todo.priority === 'Hoch' ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 font-bold' : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}>
                          {todo.priority}
                        </span>
                      )}

                      {todo.dependsOnIds && todo.dependsOnIds.length > 0 && (
                        <span className="text-[9px] text-indigo-400 flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" /> Verknüpft
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="text-slate-500 hover:text-pink-400 p-1.5 rounded-lg hover:bg-pink-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}