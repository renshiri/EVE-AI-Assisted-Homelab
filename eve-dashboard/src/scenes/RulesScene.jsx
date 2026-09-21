import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, Plus, Pencil, Trash2, Shield, 
  Power, Layers, AlertTriangle, Cpu, Tag, Sparkles, Activity 
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function RulesScene() {
  const { NODE_SERVER } = useEVE();

  // State Management
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // QoL States: Suche & Kategorie-Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  // Form States
  const [key, setKey] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState(5);
  const [active, setActive] = useState(true);

  // 1. Regeln vom backend (Neo4j) abrufen
  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${NODE_SERVER}/api/rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Regeln:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [NODE_SERVER]);

  // Modal für "Neue Regel" öffnen
  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setKey('');
    setText('');
    setCategory('general');
    setPriority(5);
    setActive(true);
    setShowModal(true);
  };

  // Modal für "Regel bearbeiten" öffnen
  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setKey(rule.key || '');
    setText(rule.text || '');
    setCategory(rule.category || 'general');
    setPriority(rule.priority || 5);
    setActive(rule.active !== undefined ? rule.active : true);
    setShowModal(true);
  };

  // Status (Aktiv / Inaktiv) via PATCH schnell umschalten
  const handleToggleActive = async (ruleKey, currentStatus) => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/rules/${ruleKey}/toggle?active=${!currentStatus}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Fehler beim Umschalten der Regel:', err);
    }
  };

  // Speichern (Erstellen oder Aktualisieren)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!key || !text) return;

    const payload = {
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      text,
      category,
      priority: parseInt(priority, 10),
      active
    };

    try {
      const res = await fetch(`${NODE_SERVER}/api/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchRules();
        setShowModal(false);
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Regel:', err);
    }
  };

  // Kategorie Icon Mapping
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'hardware_guardrail': return <Cpu className="w-3.5 h-3.5 text-[#ff3366]" />;
      case 'system_awareness': return <Activity className="w-3.5 h-3.5 text-[#00f0ff]" />;
      case 'persona': return <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />;
      default: return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Prioritäts-Styles im Neo-Glass Design
  const getPriorityStyle = (prio) => {
    if (prio <= 2) {
      return {
        badge: "bg-[#ff3366]/20 text-[#ff3366] border-[#ff3366]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
        border: "border-l-[#ff3366]"
      };
    } else if (prio <= 5) {
      return {
        badge: "bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
        border: "border-l-[#fbbf24]"
      };
    }
    return {
      badge: "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
      border: "border-l-[#00f0ff]"
    };
  };

  // Filterung
  const filteredRules = rules.filter(r => {
    const matchesSearch = searchFilter === '' || 
      r.key.toLowerCase().includes(searchFilter.toLowerCase()) || 
      r.text.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = activeCategoryFilter === 'All' || r.category === activeCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const activeRulesCount = rules.filter(r => r.active).length;

  return (
    <div className="animate-fade-in h-[calc(100vh-100px)] flex flex-col gap-3.5 select-none overflow-hidden pb-16 font-mono">
      
      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-wrap justify-between items-center bg-white/[0.03] p-4 rounded-[2.5rem] border border-white/[0.09] backdrop-blur-2xl shadow-[16px_16px_40px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] relative overflow-hidden shrink-0 gap-3">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Neural Rule Governance</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[9px] font-mono bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                <Shield className="w-3 h-3 animate-pulse" /> {activeRulesCount} Aktiv / {rules.length} Gesamt
              </span>
            </div>
            <p className="text-[11px] text-[#00f0ff] font-bold mt-0.5">Neo4j Verhaltens- & Systemregeln</p>
          </div>
        </div>

        {/* Suchfeld in der Kopfzeile */}
        <div className="relative flex-1 max-w-xs hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Regeln durchsuchen..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#030406]/90 border border-white/[0.08] rounded-2xl py-2.5 pl-10 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold text-xs px-4 py-2.5 rounded-2xl transition shadow-[0_0_20px_rgba(0,240,255,0.35)] border border-[#00f0ff]/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Neue Regel</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-white/[0.025] border border-white/[0.08] backdrop-blur-2xl shadow-[12px_12px_32px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] rounded-[2.5rem] p-4 flex flex-col justify-between overflow-hidden min-h-0">
        
        {/* Kategorie Chips & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {['All', 'hardware_guardrail', 'system_awareness', 'persona', 'general'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`text-[9px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                  activeCategoryFilter === cat
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 font-bold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]'
                    : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                {cat === 'All' ? 'Alle Kategorien' : cat}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-500">{filteredRules.length} Regeln angezeigt</span>
        </div>

        {/* Rules Grid List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 mt-3.5 space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-20 text-xs text-slate-500 animate-pulse">
              Lade Regeln aus Neo4j Graph...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-500 bg-white/[0.015] rounded-3xl border border-white/[0.06] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
              Keine Verhaltensregeln für diesen Filter gefunden.
            </div>
          ) : (
            filteredRules.map((r) => {
              const prioStyle = getPriorityStyle(r.priority);

              return (
                <div
                  key={r.key}
                  className={`bg-white/[0.03] border border-white/[0.08] ${prioStyle.border} border-l-4 p-4 rounded-2xl shadow-[10px_10px_30px_rgba(0,0,0,0.7)] group hover:border-[#00f0ff]/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    !r.active ? 'opacity-40 grayscale-[0.5]' : ''
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-[#00f0ff] tracking-wide uppercase">
                        {r.key}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(r.category)}
                        <span className="text-[9px] text-slate-400 uppercase font-bold">
                          {r.category}
                        </span>
                      </div>

                      <span className={`text-[8px] px-2 py-0.5 rounded-lg border ${prioStyle.badge}`}>
                        Prio {r.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {r.text}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(r.key, r.active)}
                      className={`flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-xl border transition cursor-pointer font-bold ${
                        r.active
                          ? 'bg-[#00ffcc]/15 text-[#00ffcc] border-[#00ffcc]/40 shadow-[0_0_10px_rgba(0,255,204,0.2)]'
                          : 'bg-white/[0.02] text-slate-500 border-white/[0.08]'
                      }`}
                      title="Status umschalten"
                    >
                      <Power className="w-3 h-3" />
                      <span>{r.active ? 'Aktiv' : 'Inaktiv'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(r)}
                      className="p-2 text-slate-400 hover:text-[#00f0ff] bg-white/[0.02] border border-white/[0.06] hover:border-[#00f0ff]/40 rounded-xl transition cursor-pointer"
                      title="Regel bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MODAL: ERSTELLEN & BEARBEITEN ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#030406] border border-white/[0.12] p-6 rounded-[2.5rem] max-w-lg w-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-100 font-mono uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00f0ff]" />
              <span>{editingRule ? 'System-Regel bearbeiten' : 'Neue System-Regel anlegen'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1.5 text-[10px]">Regel Key (ID)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingRule}
                  placeholder="z.B. no_mac_telemetry_hallucination"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1.5 text-[10px]">Instruktion / Regeltext</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Beschreibe die genaue Anweisung für EVE..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Kategorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] cursor-pointer"
                  >
                    <option value="hardware_guardrail" className="bg-[#030406]">Hardware Guardrail</option>
                    <option value="system_awareness" className="bg-[#030406]">System Awareness</option>
                    <option value="persona" className="bg-[#030406]">Persona & Tonalität</option>
                    <option value="general" className="bg-[#030406]">Allgemein</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Priorität (1 = Höchste)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.1] bg-[#030406] text-[#00f0ff] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="activeCheck" className="text-slate-300 text-xs cursor-pointer">
                  Regel sofort im Graph aktivieren
                </label>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 py-2.5 rounded-xl font-semibold transition border border-white/[0.08] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold py-2.5 rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  {editingRule ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}