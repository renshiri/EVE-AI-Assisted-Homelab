import React, { useState, useEffect, useCallback } from 'react';
import { Server, Terminal, RefreshCw, AlertTriangle, CheckCircle2, Moon, X, ShieldAlert, Code2, FileCode, Activity } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function ServicesScene() {
  const { NODE_SERVER, user } = useEVE();
  const username = user?.username || 'guest';

  // Tabs: 'services' oder 'scripts'
  const [activeTab, setActiveTab] = useState('services');

  // Services State
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Python Scripts State
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [scriptContent, setScriptContent] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);

  const fetchServices = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/services/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setServices(data.services || []);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Dienste:", err);
    } finally {
      setFetching(false);
    }
  }, [NODE_SERVER]);

  const fetchScriptsList = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/backend/scripts?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setScripts(data.scripts || []);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Skripte:", err);
    }
  }, [NODE_SERVER, username]);

  useEffect(() => {
    fetchServices();
    fetchScriptsList();
    const interval = setInterval(fetchServices, 4000);
    return () => clearInterval(interval);
  }, [fetchServices, fetchScriptsList]);

  const fetchLogs = async (serviceName) => {
    setSelectedService(serviceName);
    setLoadingLogs(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/services/${serviceName}/logs?tail=150`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || 'Keine Logs vorhanden.');
      } else {
        setLogs('Keine Logs für diesen Dienst verfügbar.');
      }
    } catch (err) {
      setLogs('Fehler beim Abrufen der Logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadScriptContent = async (filename) => {
    setSelectedScript(filename);
    setLoadingScript(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/backend/scripts/view?filename=${encodeURIComponent(filename)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setScriptContent(data.content || 'Leeres Skript.');
      } else {
        setScriptContent('Fehler beim Laden des Skripts.');
      }
    } catch (err) {
      setScriptContent('Verbindungsfehler beim Laden.');
    } finally {
      setLoadingScript(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"><CheckCircle2 className="w-3 h-3" /> running</span>;
      case 'sleeping':
        return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-950/80 text-amber-400 border border-amber-800/60"><Moon className="w-3 h-3" /> sleeping</span>;
      case 'stopped':
        return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700"><AlertTriangle className="w-3 h-3" /> stopped</span>;
      case 'crashed':
      case 'exited':
        return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-950/80 text-rose-400 border border-rose-800/60 animate-pulse"><ShieldAlert className="w-3 h-3" /> crashed</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-900 text-slate-400 border border-slate-800">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col gap-3.5 select-none">
      {/* Header Bar & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-md text-xs shadow-lg gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200">EVE Debug & Backend-Zentrale</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'services' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dienste & Worker</span>
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scripts' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Backend Skripte (.py)</span>
          </button>
        </div>

        {activeTab === 'services' && (
          <button 
            onClick={fetchServices}
            disabled={fetching}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer text-slate-300 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} /> 
            <span>Aktualisieren</span>
          </button>
        )}
      </div>

      {/* TAB 1: Services & Worker Monitor */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1">
          {services.map((svc) => (
            <div 
              key={svc.name}
              onClick={() => fetchLogs(svc.name)}
              className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between gap-3 shadow-lg group backdrop-blur-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-cyan-500/80 uppercase font-mono tracking-wider">{svc.type}</span>
                  <h3 className="font-semibold text-xs text-slate-200 mt-0.5 group-hover:text-cyan-300 transition-colors">{svc.name}</h3>
                </div>
                {getStatusBadge(svc.status)}
              </div>
              
              <div className="text-[11px] text-slate-400 font-mono">
                {svc.details}
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono">
                <span>Systemd / Container Logs</span>
                <Terminal className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Python Backend Scripts Inspector */}
      {activeTab === 'scripts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
          {scripts.map((script) => (
            <div 
              key={script.name}
              onClick={() => loadScriptContent(script.name)}
              className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between gap-3 shadow-lg group backdrop-blur-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors">{script.name}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{script.size}</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono truncate bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                {script.path}
              </div>

              <div className="text-[10px] text-indigo-400/80 flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono">
                <span>Quellcode öffnen</span>
                <Code2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Terminal Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[75vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">Debug Logs: {selectedService}</span>
              </div>
              <button 
                onClick={() => setSelectedService(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto font-mono text-[11px] text-slate-300 bg-slate-950 whitespace-pre-wrap leading-relaxed">
              {loadingLogs ? 'Lade Logs...' : logs}
            </div>
          </div>
        </div>
      )}

      {/* Python Script Viewer Modal */}
      {selectedScript && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">Backend Skript: {selectedScript}</span>
              </div>
              <button 
                onClick={() => setSelectedScript(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto font-mono text-[11px] text-indigo-200 bg-slate-950 whitespace-pre leading-relaxed">
              {loadingScript ? 'Lade Quellcode...' : scriptContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}