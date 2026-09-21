import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, PlusCircle, Activity, Terminal, BarChart3, Globe } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function PiholeScene() {
  const { NODE_SERVER } = useEVE();
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Statistiken (Top Geblockte Domains) vom Backend abrufen
  const fetchDailyStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/pihole/daily-stats`);
      const data = await res.json();
      if (data.status === 'success') {
        setDailyStats(data.stats);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Statistiken', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyStats();
    const interval = setInterval(fetchDailyStats, 15000);
    return () => clearInterval(interval);
  }, [NODE_SERVER]);

  const executePiholeAction = async (action, param = '') => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${NODE_SERVER}/api/pihole/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, param })
      });
      const data = await res.json();
      setMessage(data.message || 'Aktion ausgeführt');
      if (action === 'blacklist') setDomainInput('');
      fetchDailyStats();
    } catch (err) {
      setMessage('Fehler beim Ausführen der Aktion');
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...dailyStats.map(s => s.count), 1);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-2xl text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <ShieldCheck className="w-6 h-6 text-[#00f0ff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-mono text-[#00f0ff] uppercase">DNS SHIELD / PI-HOLE</h1>
            <p className="uppercase tracking-wider font-mono text-[10px] text-slate-400">EVE Graph Integration & Blocking Engine</p>
          </div>
        </div>

        <button
          onClick={fetchDailyStats}
          disabled={statsLoading}
          className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 text-[#00f0ff] ${statsLoading ? 'animate-spin' : ''}`} />
          <span className="uppercase tracking-wider">Aktualisieren</span>
        </button>
      </div>

      {/* Aktionen / Formular */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Domain Sperren Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
            <PlusCircle className="w-4 h-4 text-[#00f0ff]" />
            <span>DOMAIN SPERREN</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="z.B. ads.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="flex-1 bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] placeholder:text-slate-500"
            />
            <button
              onClick={() => executePiholeAction('blacklist', domainInput)}
              disabled={loading || !domainInput.trim()}
              className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-4 py-2 text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="uppercase tracking-wider">Blacklist</span>
            </button>
          </div>
        </div>

        {/* System Wartung Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
            <Activity className="w-4 h-4 text-[#00f0ff]" />
            <span>SYSTEM WARTUNG</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => executePiholeAction('gravity')}
              disabled={loading}
              className="w-full bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
              <span className="uppercase tracking-wider">Gravity Update</span>
            </button>
          </div>
        </div>

      </div>

      {/* Top Geblockte Domains Chart Card */}
      <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
            <BarChart3 className="w-4 h-4 text-[#00f0ff]" />
            <span>TOP GEBLOCKTE DOMAINS (NEO4J)</span>
          </div>
          <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400">HÄUFIGSTE BLOCK-EINTRÄGE</span>
        </div>

        <div className="flex flex-col gap-3">
          {dailyStats.length === 0 ? (
            <div className="p-6 text-center text-slate-500 uppercase tracking-wider font-mono text-[10px]">
              {statsLoading ? 'Lade Statistiken...' : 'Noch keine Block-Statistiken verfügbar.'}
            </div>
          ) : (
            dailyStats.map((stat, idx) => {
              const percentage = Math.round((stat.count / maxCount) * 100);
              return (
                <div key={idx} className="flex flex-col gap-1.5 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-100">
                    <span className="text-slate-100 font-semibold truncate max-w-[280px] sm:max-w-md flex items-center gap-2" title={stat.domain}>
                      <Globe className="w-4 h-4 text-[#00f0ff] shrink-0" />
                      <span className="font-mono text-xs">{stat.domain}</span>
                    </span>
                    <span className="text-[#00ffcc] font-mono text-xs font-bold shrink-0">{stat.count}× geblockt</span>
                  </div>
                  <div className="w-full bg-[#030406] h-2.5 rounded-full overflow-hidden border border-white/[0.08] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
                    <div 
                      className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(0,240,255,0.3)]" 
                      style={{ width: `${Math.max(percentage, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rückgabe / Status-Box (Modal/Card-Sunk-In hybrid) */}
      {message && (
        <div className="bg-[#030406] border border-[#00f0ff]/30 p-4 rounded-2xl text-xs text-[#00f0ff] font-mono shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8),0_0_15px_rgba(0,240,255,0.15)] flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <span className="tracking-wide">{message}</span>
        </div>
      )}

    </div>
  );
}