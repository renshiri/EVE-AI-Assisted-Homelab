import React, { useState } from 'react';
import { X, CheckSquare } from 'lucide-react';

export default function SubtaskQuickInput({ parentNode, NODE_SERVER, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER || 'http://localhost:5000'}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          priority: 'Mittel',
          category: parentNode.category || 'System',
          depends_on_id: parentNode.id,
          project_id: parentNode.project_id || parentNode.id,
          is_note: false,
          relation_type: 'SUBTASK_OF'
        }),
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen');

      setTitle('');
      if (onCreated) onCreated();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-[#05070f]/95 border border-cyan-500/60 p-3 rounded-xl shadow-2xl w-60 font-mono text-xs backdrop-blur-xl pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-cyan-400 font-bold flex items-center gap-1 truncate max-w-[170px]">
          <CheckSquare className="w-3 h-3" /> Subtask für: {parentNode.title}
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subtask Titel..."
          className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
        />
        <div className="flex justify-end gap-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded-lg hover:brightness-110 cursor-pointer text-xs"
          >
            {loading ? '...' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}