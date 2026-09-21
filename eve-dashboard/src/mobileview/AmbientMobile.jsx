import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Clock, MapPin, AlertTriangle, CloudSun, 
  ArrowDownLeft, ArrowUpRight, ArrowLeft, Brain, Sparkles, 
  Thermometer, CheckSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';
import EVEAvatar from '../components/EVEAvatar';

export default function AmbientScene() {
  const { NODE_SERVER, isConnected, topologyText, calendarEvents, bazaarData, systemMetrics, reportsList, nasFiles, systemLogs } = useEVE();
  const [viewMode, setViewMode] = useState('avatar'); // 'avatar' | 'cortex'
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Mobile UI States
  const [showMetricsMobile, setShowMetricsMobile] = useState(false);

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

  // POWER USER HOTKEYS
  const handleKeyDown = useCallback((e) => {
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
    <div 
      className="h-[100dvh] w-full flex flex-col justify-between items-center relative select-none bg-[#030406] text-slate-100 font-mono overflow-hidden"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
        paddingLeft: 'calc(env(safe-area-inset-left) + 1rem)',
        paddingRight: 'calc(env(safe-area-inset-right) + 1rem)'
      }}
    >
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[15%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-cyan-500/10 rounded-full blur-[100px] md:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-indigo-500/10 rounded-full blur-[120px] md:blur-[160px] pointer-events-none" />

      {/* HEADER SECTION (Mobile Stack / Desktop Split) */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-3 z-40 shrink-0">
        
        {/* Performance Top Bar / Mobile Dropdown Button */}
        <div className="w-full md:w-auto bg-white/[0.03] p-3 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]" />
              <span className="font-bold tracking-wider text-slate-100 text-[11px] md:text-xs">NODE 1</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold tracking-wider ${
                isServerOnline ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' : 'bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/30'
              }`}>
                {isServerOnline ? 'ONLINE' : 'OFFLINE'}
              </span>

              {/* Mobile Dropdown Toggle */}
              <button 
                onClick={() => setShowMetricsMobile(!showMetricsMobile)}
                className="md:hidden p-1 text-slate-400 hover:text-white"
                aria-label="Toggle Details"
              >
                {showMetricsMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Content for Mobile, Always Open on Desktop */}
          <div className={`${showMetricsMobile ? 'block' : 'hidden'} md:block space-y-2 mt-3 pt-3 border-t border-white/10 text-xs min-w-[280px]`}>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-medium">CPU Load</span>
                <div className="flex items-center gap-1.5">
                  {cpuTemp !== null && (
                    <span className="text-[9px] text-[#fbbf24] font-semibold bg-[#fbbf24]/10 px-1.5 py-0.5 rounded border border-[#fbbf24]/20">
                      {cpuTemp}°C
                    </span>
                  )}
                  <span className="font-bold text-[#00f0ff]">{cpuVal}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 md:h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] transition-all duration-500" style={{ width: `${Math.min(cpuVal, 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-medium">RAM</span>
                <span className="font-bold text-[#00ffcc]">{ramVal}%</span>
              </div>
              <div className="w-full h-1.5 md:h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#00ffcc] transition-all duration-500" style={{ width: `${Math.min(ramVal, 100)}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] md:text-xs text-slate-400 pt-1.5">
              <span className="font-medium">Traffic</span>
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-[#00f0ff] flex items-center gap-0.5"><ArrowDownLeft className="w-3 h-3" />{netRx > 1024 ? `${(netRx/1024).toFixed(1)}M` : `${netRx}K`}</span>
                <span className="text-[#00ffcc] flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{netTx > 1024 ? `${(netTx/1024).toFixed(1)}M` : `${netTx}K`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clock Top Right Widget */}
        <div className="w-full md:w-auto text-right text-xs md:text-sm text-slate-200 bg-white/[0.03] p-3 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center justify-between md:justify-end gap-2 font-bold text-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]" />
              <span className="text-xs md:text-sm">{timeStr || 'Lade...'}</span>
            </div>
            <span className="text-[#fbbf24] flex items-center gap-1 text-[10px] md:text-xs font-semibold bg-[#fbbf24]/10 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border border-[#fbbf24]/20">
              <Thermometer className="w-3 h-3" />
              {weather.temp}°C
            </span>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-2 text-[10px] md:text-[11px] text-slate-400 mt-1.5 font-medium">
            <div className="flex items-center gap-1">
              <CloudSun className="w-3 h-3 text-[#fbbf24]" />
              <span>{weather.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ZENTRALER INTERAKTIVER BEREICH */}
      <div className="flex-1 flex flex-col justify-center items-center w-full relative my-auto z-10 py-2">
        
        {viewMode === 'cortex' && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center mb-2 w-full">
            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-[#00f0ff] tracking-[0.15em] bg-[#00f0ff]/10 px-3 py-1.5 rounded-xl border border-[#00f0ff]/30 backdrop-blur-xl mb-2">
              <Brain className="w-3 h-3 animate-pulse text-[#00f0ff]" />
              EVE NEURAL CORTEX
            </div>

            {/* Kategorien mit Horizontal Scroll für Mobile */}
            <div className="flex w-full overflow-x-auto no-scrollbar justify-start md:justify-center gap-1.5 px-2 py-1 z-30">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] md:text-[10px] font-bold tracking-wider transition-all cursor-pointer backdrop-blur-xl border flex items-center gap-1 active:scale-95 ${
                    activeCategory === cat.id 
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/60 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]' 
                      : 'bg-white/[0.02] text-slate-400 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-[8px] px-1 bg-white/10 rounded font-mono text-slate-400 hidden md:inline">{cat.key}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EVE AVATAR */}
        <div className="scale-90 md:scale-100 transition-transform">
          <EVEAvatar 
            onClick={() => setViewMode(viewMode === 'avatar' ? 'cortex' : 'avatar')}
            cortexActive={viewMode === 'cortex'}
            activeCategory={activeCategory}
            onSelectCategory={(catId) => setActiveCategory(catId)}
            nodesData={nodesData}
          />
        </div>

        {/* INTERAKTIONS-BUTTON UNTER DEM AVATAR */}
        {viewMode === 'avatar' ? (
          <button
            onClick={() => setViewMode('cortex')}
            className="mt-4 md:mt-8 flex items-center gap-2 px-5 py-3 md:px-7 md:py-4 bg-white/[0.03] active:bg-white/[0.08] border border-white/10 rounded-2xl text-[10px] md:text-[11px] text-[#00f0ff] font-bold tracking-[0.2em] transition-all duration-300 backdrop-blur-2xl shadow-xl cursor-pointer group uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.3)] active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00f0ff] group-hover:rotate-12 transition-transform" />
            <span>GEHIRN ÖFFNEN</span>
            <span className="hidden md:inline-block text-[9px] px-1.5 py-0.5 bg-white/10 rounded font-mono text-slate-400 ml-1">SPACE</span>
          </button>
        ) : (
          <button
            onClick={() => { setViewMode('avatar'); setActiveCategory('all'); }}
            className="mt-3 md:mt-6 flex items-center gap-1.5 bg-white/[0.03] active:bg-white/[0.08] border border-white/10 text-slate-300 px-4 py-2.5 md:px-6 md:py-3 rounded-2xl text-[10px] md:text-[11px] font-bold tracking-wider transition-all backdrop-blur-xl cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>ZURÜCK ZUM AVATAR</span>
            <span className="hidden md:inline-block text-[9px] px-1.5 py-0.5 bg-white/10 rounded font-mono text-slate-400 ml-1">ESC</span>
          </button>
        )}
      </div>

      {/* BOTTOM PANEL WIDGETS (Mobile Responsive Grid / Bottom Cards) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 z-40 shrink-0">
        
        {/* Urgent Events Widget */}
        <div className="bg-white/[0.03] border border-white/10 p-3 md:p-5 rounded-2xl md:rounded-3xl backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#ff3366]/30 text-[#ff3366] font-bold text-[10px] md:text-[11px] tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            DRINGENDE TERMINE
          </div>
          {urgentEvents.length === 0 ? (
            <div className="text-[10px] md:text-[11px] text-slate-400 py-0.5 font-medium">Keine anstehenden Termine.</div>
          ) : (
            <div className="space-y-1">
              {urgentEvents.map(evt => (
                <div key={evt.title || evt.id} className="text-[10px] md:text-[11px] text-slate-300 flex justify-between items-center py-0.5 font-medium">
                  <span className="truncate max-w-[200px]">{evt.title}</span>
                  <span className="w-1.5 h-1.5 bg-[#ff3366] rounded-full shrink-0 drop-shadow-[0_0_6px_#ff3366]" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TODO Priorities Widget */}
        <div className="bg-white/[0.03] border border-white/10 p-3 md:p-5 rounded-2xl md:rounded-3xl backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#00f0ff]/30 text-[#00f0ff] font-bold text-[10px] md:text-[11px] tracking-wide">
            <CheckSquare className="w-3.5 h-3.5" />
            TODO PRIORITÄTEN
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-black/40 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border border-white/10">
              <span className="text-[8px] md:text-[9px] text-[#ff3366] block font-bold tracking-wider mb-0.5">HOCH</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.hoch}</span>
            </div>
            <div className="bg-black/40 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border border-white/10">
              <span className="text-[8px] md:text-[9px] text-[#fbbf24] block font-bold tracking-wider mb-0.5">MITTEL</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.mittel}</span>
            </div>
            <div className="bg-black/40 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border border-white/10">
              <span className="text-[8px] md:text-[9px] text-[#00ffcc] block font-bold tracking-wider mb-0.5">GERING</span>
              <span className="font-bold text-slate-100 text-xs">{todoStats.gering}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}