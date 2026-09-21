import React, { useState } from 'react';
import { Plus, Command, CheckSquare, StickyNote, Compass, Link2, ListTree } from 'lucide-react';

export default function CreateNodeForm({
  inputRef,
  nodeType,
  setNodeType,
  title,
  setTitle,
  priority,
  setPriority,
  category,
  setCategory,
  dependsOnId,
  setDependsOnId,
  assignedProject,
  setAssignedProject,
  projects = [],
  todos = [],
  categoriesList = [],
  loading,
  onSubmit
}) {
  const [isBulkMode, setIsBulkMode] = useState(false);

  return (
    <div className="bg-[#030408]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-2xl space-y-4 font-mono">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Plus className="w-4 h-4" /> KNOTEN / PROJEKTPLAN ERSTELLEN
        </h2>
        <span className="text-[10px] text-slate-500 border border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
          <Command className="w-2.5 h-2.5" /> K
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => { setNodeType('task'); setIsBulkMode(false); }}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
            nodeType === 'task' && !isBulkMode ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-bold' : 'text-slate-400'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" /> Aufgabe
        </button>
        <button
          type="button"
          onClick={() => setNodeType('note')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
            nodeType === 'note' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold' : 'text-slate-400'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" /> Notiz / Projektplan
        </button>
      </div>

      {nodeType === 'task' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsBulkMode(!isBulkMode)}
            className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer bg-pink-950/40 border border-pink-500/30 px-2 py-1 rounded-lg"
          >
            <ListTree className="w-3 h-3" /> {isBulkMode ? 'Einzelnen Task erstellen' : '📋 Bulk-Import (Mehrzeilig)'}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-[10px] text-slate-400">
            {isBulkMode ? 'Projektplan (Jede Zeile wird ein Subtask)' : nodeType === 'task' ? 'Titel der Aufgabe' : 'Notizinhalt'}
          </label>
          
          {isBulkMode || nodeType === 'note' ? (
            <textarea
              ref={inputRef}
              rows={isBulkMode ? 6 : 4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBulkMode ? "- Task 1: Setup DB\n- Task 2: API Endpunkte\n- Task 3: UI Design" : "Ausführliche Notiz..."}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition resize-y"
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Server einrichten..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {!isBulkMode && nodeType === 'task' && (
            <div>
              <label className="text-[10px] text-slate-400">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
              >
                <option value="Hoch">Hoch</option>
                <option value="Mittel">Mittel</option>
                <option value="Gering">Gering</option>
              </select>
            </div>
          )}

          <div className={isBulkMode || nodeType === 'note' ? 'col-span-2' : ''}>
            <label className="text-[10px] text-slate-400">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
            >
              {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 flex items-center gap-1">
            <Link2 className="w-3 h-3 text-indigo-400" /> Übergeordnetes Todo (Parent)
          </label>
          <select
            value={dependsOnId}
            onChange={(e) => setDependsOnId(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
          >
            <option value="">Kein Parent (Wurzel-Knoten)</option>
            {todos.filter(t => !t.completed).map(t => (
              <option key={t.id} value={t.id}>{t.is_note ? '📝 ' : '📌 '}{t.title}</option>
            ))}
          </select>
        </div>

        {projects.length > 0 && (
          <div className={`transition-opacity ${dependsOnId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <label className="text-[10px] text-slate-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-pink-400" /> Projekt zuordnen
            </label>
            <select
              value={assignedProject}
              onChange={(e) => setAssignedProject(e.target.value)}
              disabled={!!dependsOnId}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
            >
              <option value="">Kein Projekt (Frei)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full font-bold py-2.5 rounded-xl text-xs transition shadow-lg hover:brightness-110 active:scale-95 cursor-pointer ${
            nodeType === 'task' 
              ? 'bg-gradient-to-r from-[#00f0ff] to-[#6366f1] text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
          }`}
        >
          {loading ? 'Speichere...' : isBulkMode ? 'Projektplan importieren (Bulk)' : nodeType === 'task' ? 'Task Erstellen' : 'Notiz Speichern'}
        </button>
      </form>
    </div>
  );
}