import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Clock, MapPin, AlertTriangle, CloudSun, 
  ArrowDownLeft, ArrowUpRight, ArrowLeft, Brain, Sparkles, 
  Thermometer, CheckSquare
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';
import EVEAvatar from '../components/EVEAvatar';

export default function AmbientScene() {
  const { NODE_SERVER, isConnected, topologyText, calendarEvents, bazaarData, systemMetrics, reportsList, nasFiles, systemLogs } = useEVE();
  const [viewMode, setViewMode] = useState('avatar'); // 'avatar' | 'cortex'
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Zeit & Wetter States
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [weather, setWeather] = useState({ temp: '--', location: 'Lade...' });
  const [todos, setTodos] = useState([]);

  const categories = [
    { id: 'all', label: 'Alle', key: '1' },
    { id: 'ai-core', label: 'AI & Skills', key: '2' },
    { id: 'knowledge', label: 'Knowledge', key: '3' },
    { id: 'infra', label: 'Infrastructure', key: '4' },
    { id: 'security', label: 'DNS Shield', key: '5' },
    { id: 'productivity', label: 'Productivity', key: '6' }
  ];

  const isServerOnline = isConnected || (topologyText && !topologyText.includes('nicht erreichbar'));

  // POWER USER HOTKEYS (Space/C für Cortex Toggle, 1-6 für Kategorien, Esc zum Schließen)
  const handleKeyDown = useCallback((e) => {
    // Falls Eingabefelder fokussiert sind, Hotkeys ignorieren
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space' || e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setViewMode(prev => (prev === 'avatar' ? 'cortex' : 'avatar'));
    } else if (e.key === 'Escape') {
      setViewMode('avatar');
      setActiveCategory('all');
    } else if (viewMode === 'cortex') {
      const match = categories.find(c => c.key === e.key);
      if (match) {
        setActiveCategory(match.id);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!NODE_SERVER) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${NODE_SERVER}/api/weather`);
        const data = await res.json();
        if (data.status === 'success' || data.temp !== undefined) {
          setWeather({ temp: data.temp ?? '--', location: data.location ?? 'Aachen' });
        }
      } catch (err) {
        setWeather({ temp: '21', location: 'Aachen' });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 60000);
    return () => clearInterval(interval);
  }, [NODE_SERVER]);

  useEffect(() => {
    if (!NODE_SERVER) return;
    const fetchTodos = async () => {
      try {
        const res = await fetch(`${NODE_SERVER}/api/todos`);
        const data = await res.json();
        if (data.status === 'success' || data.todos) {
          setTodos(data.todos || []);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Todos:', err);
      }
    };
    fetchTodos();
    const interval = setInterval(fetchTodos, 10000);
    return () => clearInterval(interval);
  }, [NODE_SERVER]);

  const todoStats = (todos || []).reduce((acc, todo) => {
    if (todo.completed) return acc;
    const p = (todo.priority || 'Mittel').toLowerCase();
    if (p.includes('hoch') || p.includes('high')) acc.hoch++;
    else if (p.includes('gering') || p.includes('low')) acc.gering++;
    else acc.mittel++;
    return acc;
  }, { hoch: 0, mittel: 0, gering: 0 });

  const nowTime = new Date();
  const futureEvents = (calendarEvents || []).filter(evt => !evt.start_datetime || new Date(evt.start_datetime) >= nowTime);
  const urgentEvents = futureEvents.filter(evt => evt.priority === 'Hoch').slice(0, 3);

  const nodesData = {
    reportsCount: (reportsList || []).length,
    nasFilesCount: (nasFiles || []).length,
    bazaarCount: (bazaarData || []).length,
    logsCount: (systemLogs || []).length,
    calendarCount: futureEvents.length,
    activeTodosCount: (todos || []).filter(t => !t.completed).length,
    todoStats,
    systemMetrics
  };

  const cpuVal = systemMetrics?.cpu_percent ?? 0;
  const cpuTemp = systemMetrics?.cpu_temp ?? null;
  const ramVal = systemMetrics?.ram_percent ?? 0;
  const netRx = systemMetrics?.net_rx_kbs ?? 0;
  const netTx = systemMetrics?.net_tx_kbs ?? 0;

  return (
    <div className="h-screen w-full flex flex-col justify-between items-center px-6 pt-6 pb-24 md:pb-20 relative select-none bg-[#030406] text-slate-100 font-mono overflow-hidden">
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Performance Top Left Widget */}
      <div className="hidden md:flex absolute top-6 left-6 flex-col gap-3.5 text-sm text-slate-200 bg-white/[0.03] p-5 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl z-40 min-w-[340px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]" />
            <span className="font-bold tracking-wider text-slate-100 text-xs">NODE 1 PERFORMANCE</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider ${
            isServerOnline ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' : 'bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/30'
          }`}>
            {isServerOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">CPU Load</span>
            <div className="flex items-center gap-2">
              {cpuTemp !== null && (
                <span className="text-[10px] text-[#fbbf24] font-semibold bg-[#fbbf24]/10 px-2 py-0.5 rounded-lg border border-[#fbbf24]/20">
                  {cpuTemp}°C
                </span>
              )}
              <span className="font-bold text-[#00f0ff] text-xs">{cpuVal}%</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] transition-all duration-500" style={{ width: `${Math.min(cpuVal, 100)}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">RAM</span>
            <span className="font-bold text-[#00ffcc] text-xs">{ramVal}%</span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#00ffcc] transition-all duration-500" style={{ width: `${Math.min(ramVal, 100)}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span className="font-medium">Traffic</span>
          <div className="flex items-center gap-3 font-semibold text-[11px]">
            <span className="text-[#00f0ff] flex items-center gap-1"><ArrowDownLeft className="w-3.5 h-3.5" />{netRx > 1024 ? `${(netRx/1024).toFixed(1)} MB/s` : `${netRx} KB/s`}</span>
            <span className="text-[#00ffcc] flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" />{netTx > 1024 ? `${(netTx/1024).toFixed(1)} MB/s` : `${netTx} KB/s`}</span>
          </div>
        </div>
      </div>

      {/* Clock Top Right Widget */}
      <div className="hidden md:block absolute top-6 right-6 text-right text-sm text-slate-200 bg-white/[0.03] p-5 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl z-40">
        <div className="flex items-center justify-end gap-2.5 text-sm font-bold text-slate-100">
          <Clock className="w-4 h-4 text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]" />
          <span>{timeStr || 'Lade Uhrzeit...'}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#fbbf24] flex items-center gap-1 text-xs font-semibold bg-[#fbbf24]/10 px-2.5 py-1 rounded-xl border border-[#fbbf24]/20">
            <Thermometer className="w-3.5 h-3.5" />
            {weather.temp}°C
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 mt-2 font-medium">
          <CloudSun className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span>{weather.location}</span>
          <span className="text-white/20">|</span>
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* ZENTRALER INTERAKTIVER BEREICH */}
      <div className="flex-1 flex flex-col justify-center items-center w-full relative my-auto z-10">
        
        {viewMode === 'cortex' && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center mb-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#00f0ff] tracking-[0.2em] bg-[#00f0ff]/10 px-4 py-2 rounded-2xl border border-[#00f0ff]/30 backdrop-blur-xl mb-3">
              <Brain className="w-3.5 h-3.5 animate-pulse text-[#00f0ff]" />
              EVE NEURAL CORTEX
            </div>

            {/* Kategorien mit Hotkey-Badges für Power-User */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg z-30">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all cursor-pointer backdrop-blur-xl border flex items-center gap-1.5 ${
                    activeCategory === cat.id 
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/60 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]' 
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-[9px] px-1 bg-white/10 rounded font-mono text-slate-400">{cat.key}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EVE AVATAR MIT POWER-USER KANONEN-CLICK & ROUTING */}
        <EVEAvatar 
          onClick={() => setViewMode(viewMode === 'avatar' ? 'cortex' : 'avatar')}
          cortexActive={viewMode === 'cortex'}
          activeCategory={activeCategory}
          onSelectCategory={(catId) => setActiveCategory(catId)}
          nodesData={nodesData}
        />

        {/* INTERAKTIONS-BUTTON UNTER DEM AVATAR */}
        {viewMode === 'avatar' ? (
          <button
            onClick={() => setViewMode('cortex')}
            className="mt-8 flex items-center gap-2.5 px-7 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl text-[11px] text-[#00f0ff] font-bold tracking-[0.25em] transition-all duration-300 backdrop-blur-2xl shadow-xl cursor-pointer group uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]"
          >
            <Sparkles className="w-4 h-4 text-[#00f0ff] group-hover:rotate-12 transition-transform" />
            <span>SYSTEM BEREIT &bull; GEHIRN ÖFFNEN</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded font-mono text-slate-400 ml-1">SPACE</span>
          </button>
        ) : (
          <button
            onClick={() => { setViewMode('avatar'); setActiveCategory('all'); }}
            className="mt-6 flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 px-6 py-3 rounded-2xl text-[11px] font-bold tracking-wider transition-all backdrop-blur-xl cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>ZURÜCK ZUM AVATAR</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded font-mono text-slate-400 ml-1">ESC</span>
          </button>
        )}
      </div>

      {/* Bottom Panel Widgets */}
      <div className="hidden md:block w-full">
        <div className="absolute bottom-6 left-6 bg-white/[0.03] border border-white/10 p-5 rounded-3xl backdrop-blur-2xl shadow-2xl z-40 min-w-[280px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#ff3366]/30 text-[#ff3366] font-bold text-[11px] tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            DRINGENDE TERMINE
          </div>
          {urgentEvents.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-1 font-medium">Keine anstehenden Termine.</div>
          ) : (
            urgentEvents.map(evt => (
              <div key={evt.title || evt.id} className="text-[11px] text-slate-300 flex justify-between items-center py-1.5 font-medium">
                <span className="truncate max-w-[200px]">{evt.title}</span>
                <span className="w-2 h-2 bg-[#ff3366] rounded-full shrink-0 drop-shadow-[0_0_6px_#ff3366]" />
              </div>
            ))
          )}
        </div>

        <div className="absolute bottom-6 right-6 bg-white/[0.03] border border-white/10 p-5 rounded-3xl backdrop-blur-2xl shadow-2xl z-40 min-w-[260px]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#00f0ff]/30 text-[#00f0ff] font-bold text-[11px] tracking-wide">
            <CheckSquare className="w-3.5 h-3.5" />
            TODO PRIORITÄTEN
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="bg-black/40 p-2.5 rounded-2xl border border-white/10">
              <span className="text-[9px] text-[#ff3366] block font-bold tracking-wider mb-1">HOCH</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.hoch}</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-2xl border border-white/10">
              <span className="text-[9px] text-[#fbbf24] block font-bold tracking-wider mb-1">MITTEL</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.mittel}</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-2xl border border-white/10">
              <span className="text-[9px] text-[#00ffcc] block font-bold tracking-wider mb-1">GERING</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.gering}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}