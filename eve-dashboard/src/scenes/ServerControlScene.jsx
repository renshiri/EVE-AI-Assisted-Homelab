import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Server, RefreshCw, Power, Terminal, Users, Send, 
  Activity, Cpu, HardDrive, Play, Square, ShieldCheck, 
  Package, FileText, Upload, Plus, ExternalLink, Zap, Command, Check,
  Globe, MessageSquare, Map, UserCheck, ShieldAlert, Sliders, Layers
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

const PLUGIN_PRESETS = [
  { id: 'luckperms', label: 'LuckPerms', icon: ShieldCheck, desc: 'Rechte & Gruppen' },
  { id: 'geyser', label: 'Geyser & Crossplay', icon: Globe, desc: 'Bedrock Integration' },
  { id: 'tab', label: 'TAB & UI', icon: Layers, desc: 'Header, Footer & Scoreboard' },
  { id: 'worldguard', label: 'WorldGuard & Edit', icon: Map, desc: 'Regionen & Bauteile' },
  { id: 'chat', label: 'Chat & Moderation', icon: MessageSquare, desc: 'LPC & Server-Broadcasts' }
];

const COMMON_COMMANDS = [
  { cmd: 'lp user ', desc: 'LuckPerms Spielerverwaltung' },
  { cmd: 'lp group ', desc: 'LuckPerms Gruppenverwaltung' },
  { cmd: 'lp listgroups', desc: 'Existierende LuckPerms-Gruppen auflisten' },
  { cmd: 'lp editor', desc: 'LuckPerms Web-Editor Link generieren' },
  { cmd: 'geyser reload', desc: 'Geyser Config neu laden' },
  { cmd: 'tab reload', desc: 'TAB Config neu laden' },
  { cmd: 'rg define ', desc: 'WorldGuard Region erstellen' },
  { cmd: 'rg flag ', desc: 'WorldGuard Flag setzen' },
  { cmd: 'op ', desc: 'Operator-Rechte erteilen' },
  { cmd: 'deop ', desc: 'Operator-Rechte entziehen' },
  { cmd: 'title @a title ', desc: 'Serverweiten Titel einblenden' },
  { cmd: 'weather clear', desc: 'Wetter auf sonnig stellen' },
  { cmd: 'time set day', desc: 'Zeit auf Tag stellen' }
];

export default function ServerControlScene() {
  const { NODE_SERVER } = useEVE();
  const [activeTab, setActiveTab] = useState('console');
  const [pluginSubTab, setPluginSubTab] = useState('luckperms');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Stats & Spieler
  const [mcStats, setMcStats] = useState({ online: false, playersOnline: 0, maxPlayers: 100, cpuPercent: 0, ramUsedMb: 0, ramTotalMb: 4096 });
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [manualPlayer, setManualPlayer] = useState('');

  // LuckPerms Existierende Gruppen State (Inkl. Fallbacks wie 'owner')
  const [existingGroups, setExistingGroups] = useState(['owner', 'admin', 'developer', 'moderator', 'default']);
  const [selectedGroup, setSelectedGroup] = useState('default');
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Konsole State
  const [commandInput, setCommandInput] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);

  // Plugin & Logs State
  const [dockerLogs, setDockerLogs] = useState([]);
  const [pluginsList, setPluginsList] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  // Plugin Formulare
  const [lpPermission, setLpPermission] = useState('');
  const [rgName, setRgName] = useState('');
  const [rgFlag, setRgFlag] = useState('passthrough');
  const [rgVal, setRgVal] = useState('deny');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [cmdResult, setCmdResult] = useState('');

  // RCON Executer
  const executeRcon = useCallback(async (cmd) => {
    if (!cmd.trim()) return '';
    setLoading(true);
    setCmdResult(`> ${cmd}`);
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/rcon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      const resp = data.response || 'Aktion ausgeführt.';
      setCmdResult(resp);
      setConsoleLogs((prev) => [...prev, { text: `> ${cmd}`, type: 'user' }, { text: resp, type: 'server' }]);
      return resp;
    } catch (err) {
      const errText = 'Fehler bei der RCON-Verbindung.';
      setCmdResult(errText);
      return errText;
    } finally {
      setLoading(false);
    }
  }, [NODE_SERVER]);

  // Existierende LuckPerms-Gruppen vom Server abfragen (Erweiterter Parser für z.B. Owner)
  const fetchLuckPermsGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/rcon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'lp listgroups' })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.response || '';
        
        // Erweiterter Regex: Findet Aufzählungspunkte, Bindestriche, Pfeile & "Group <name>"
        const matches = text.match(/(?:[-*•>]\s*|Group\s+)([a-zA-Z0-9_-]+)/gi);
        
        if (matches) {
          const parsedGroups = matches
            .map(m => m.replace(/^[-*•>]\s*|Group\s+/i, '').trim())
            .filter(g => g && !g.toLowerCase().includes('groups')); // Header-Zeilen filtern
          
          if (parsedGroups.length > 0) {
            // Kombiniere vorhandene Rollen inkl. Fallback wie 'owner' ohne Duplikate
            setExistingGroups((prev) => {
              const combined = Array.from(new Set([...prev, ...parsedGroups]));
              return combined;
            });
          }
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der LuckPerms Gruppen', e);
    } finally {
      setGroupsLoading(false);
    }
  }, [NODE_SERVER]);

  // Daten abfragen
  const fetchStatusAndPlayers = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/status`);
      if (res.ok) setMcStats(await res.json());

      const rconRes = await fetch(`${NODE_SERVER}/api/minecraft/rcon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'list' })
      });
      if (rconRes.ok) {
        const rconData = await rconRes.json();
        const text = rconData.response || '';
        if (text.includes(':')) {
          const names = text.split(':')[1].split(',').map(n => n.trim()).filter(Boolean);
          setOnlinePlayers(names);
          if (names.length > 0 && !selectedPlayer) setSelectedPlayer(names[0]);
        }
      }
    } catch (e) {
      setMcStats((prev) => ({ ...prev, online: false }));
    }
  }, [NODE_SERVER, selectedPlayer]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/logs`);
      if (res.ok) {
        const data = await res.json();
        setDockerLogs(data.logs || []);
      }
    } catch (e) {}
  }, [NODE_SERVER]);

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/plugins`);
      if (res.ok) {
        const data = await res.json();
        setPluginsList(data.plugins || []);
      }
    } catch (e) {}
  }, [NODE_SERVER]);

  useEffect(() => {
    fetchStatusAndPlayers();
    const interval = setInterval(fetchStatusAndPlayers, 5000);
    return () => clearInterval(interval);
  }, [fetchStatusAndPlayers]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'plugins') fetchPlugins();
    if (activeTab === 'plugins_suite' && pluginSubTab === 'luckperms') fetchLuckPermsGroups();
  }, [activeTab, pluginSubTab, fetchLogs, fetchPlugins, fetchLuckPermsGroups]);

  // Autocomplete
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommandInput(value);
    if (value.trim().length > 0) {
      const matches = COMMON_COMMANDS.filter(item => 
        item.cmd.toLowerCase().includes(value.toLowerCase()) ||
        item.desc.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (cmd) => {
    setCommandInput(cmd);
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const executeContainerAction = async (action) => {
    setLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/minecraft/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setMessage(data.message);
      fetchStatusAndPlayers();
    } catch (err) {
      setMessage('Aktion fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const activeTarget = manualPlayer.trim() || selectedPlayer;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100 font-sans">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-2xl text-[#00f0ff]">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-mono text-[#00f0ff] uppercase">ENTERPRISE SERVER SUITE</h1>
            <p className="uppercase tracking-wider font-mono text-[10px] text-slate-400">High-End Multi-Plugin Control Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#030406] px-4 py-2 rounded-2xl border border-white/10">
            <span className={`w-2.5 h-2.5 rounded-full ${mcStats.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-mono text-xs font-bold uppercase">{mcStats.online ? 'Online' : 'Offline'}</span>
          </div>
          <button onClick={fetchStatusAndPlayers} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer">
            <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { id: 'console', label: 'Live Konsole & Power', icon: Terminal },
          { id: 'plugins_suite', label: 'Plugin Control Suite', icon: Sliders },
          { id: 'plugins', label: 'Jar Manager', icon: Package },
          { id: 'logs', label: 'System Stack Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: LIVE KONSOLE & POWER --- */}
      {activeTab === 'console' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => executeContainerAction('start')} disabled={loading || mcStats.online} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 text-emerald-400 cursor-pointer disabled:opacity-30">
              <Play className="w-5 h-5" /><span className="font-mono text-xs font-bold uppercase">Starten</span>
            </button>
            <button onClick={() => executeContainerAction('restart')} disabled={loading} className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 text-amber-400 cursor-pointer disabled:opacity-30">
              <RefreshCw className="w-5 h-5" /><span className="font-mono text-xs font-bold uppercase">Neustart</span>
            </button>
            <button onClick={() => executeContainerAction('stop')} disabled={loading || !mcStats.online} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 text-red-400 cursor-pointer disabled:opacity-30">
              <Square className="w-5 h-5" /><span className="font-mono text-xs font-bold uppercase">Stoppen</span>
            </button>
          </div>

          <div className="bg-[#030406] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 relative">
            <div className="bg-black/60 border border-white/5 rounded-xl p-3 h-72 overflow-y-auto font-mono text-xs flex flex-col gap-1.5">
              {consoleLogs.map((log, i) => (
                <div key={i} className={log.type === 'user' ? 'text-[#00ffcc] font-bold' : log.type === 'error' ? 'text-red-400' : 'text-slate-200'}>
                  {log.text}
                </div>
              ))}
            </div>

            <div className="relative">
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#030406]/98 border border-[#00f0ff]/40 rounded-xl p-2 shadow-2xl backdrop-blur-md z-50 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((item, idx) => (
                    <div key={idx} onClick={() => applySuggestion(item.cmd)} className="flex justify-between items-center px-3 py-1.5 rounded-lg hover:bg-[#00f0ff]/20 cursor-pointer font-mono text-xs transition">
                      <span className="text-[#00f0ff] font-bold">{item.cmd}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); executeRcon(commandInput); setCommandInput(''); setShowSuggestions(false); }} className="flex gap-2">
                <input 
                  ref={inputRef} 
                  type="text" 
                  placeholder="Befehl eintippen ('lp', 'geyser', 'rg' für Autocomplete)..." 
                  value={commandInput} 
                  onChange={handleInputChange} 
                  onFocus={() => commandInput.trim() && setShowSuggestions(true)} 
                  disabled={!mcStats.online} 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00f0ff]" 
                />
                <button type="submit" disabled={!mcStats.online} className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 rounded-xl px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer">
                  <Send className="w-3.5 h-3.5" /> Senden
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: PLUGIN CONTROL SUITE --- */}
      {activeTab === 'plugins_suite' && (
        <div className="flex flex-col gap-6">
          
          {/* Sub Navigation Bar */}
          <div className="flex gap-2 bg-[#030406] p-2 rounded-2xl border border-white/10 overflow-x-auto">
            {PLUGIN_PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setPluginSubTab(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                    pluginSubTab === p.id 
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40' 
                      : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Player Selection Header */}
          <div className="bg-[#030406] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Users className="w-5 h-5 text-[#00f0ff]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Ziel-Spieler Auswählen:</span>
                <span className="text-sm font-mono font-bold text-[#00ffcc]">{activeTarget || 'Kein Spieler ausgewählt'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                value={selectedPlayer} 
                onChange={(e) => { setSelectedPlayer(e.target.value); setManualPlayer(''); }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none flex-1 md:w-48"
              >
                <option value="" className="bg-black">-- Online Spieler --</option>
                {onlinePlayers.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
              </select>

              <input 
                type="text" 
                placeholder="Manuell eingeben..." 
                value={manualPlayer} 
                onChange={(e) => setManualPlayer(e.target.value)} 
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none flex-1 md:w-48"
              />
            </div>
          </div>

          {/* SUB-PANEL 1: LUCKERMS */}
          {pluginSubTab === 'luckperms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Existierende Gruppen Matrix */}
              <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">Existierende Server-Rollen</span>
                  <button 
                    onClick={fetchLuckPermsGroups} 
                    disabled={groupsLoading}
                    className="text-[10px] font-mono text-slate-400 hover:text-[#00f0ff] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${groupsLoading ? 'animate-spin' : ''}`} /> Sync
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {existingGroups.map((g) => (
                    <button
                      key={g}
                      onClick={() => executeRcon(`lp user ${activeTarget} parent set ${g}`)}
                      disabled={!activeTarget || loading}
                      className="bg-white/5 hover:bg-[#00f0ff]/20 text-slate-200 hover:text-[#00f0ff] border border-white/10 rounded-xl p-2.5 text-xs font-mono transition text-left cursor-pointer disabled:opacity-30 flex items-center justify-between"
                    >
                      <span className="font-bold">{g}</span>
                      <span className="text-[10px] text-[#00f0ff] opacity-60">+ Zuweisen</span>
                    </button>
                  ))}
                </div>

                {/* Dropdown-Auswahl für explizites Setzen */}
                <div className="border-t border-white/10 pt-3 flex items-center gap-2">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none flex-1"
                  >
                    {existingGroups.map((g) => (
                      <option key={g} value={g} className="bg-black">{g}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => executeRcon(`lp user ${activeTarget} parent set ${selectedGroup}`)} 
                    disabled={!activeTarget || loading} 
                    className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30"
                  >
                    Rolle Setzen
                  </button>
                </div>
              </div>

              {/* Berechtigungs-Verwaltung & Editor */}
              <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">Direkte Berechtigungen (Node)</span>
                <div className="flex gap-2">
                  <input type="text" placeholder="z. B. essentials.fly" value={lpPermission} onChange={(e) => setLpPermission(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono flex-1" />
                  <button onClick={() => executeRcon(`lp user ${activeTarget} permission set ${lpPermission} true`)} disabled={!activeTarget || !lpPermission} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30">Geben</button>
                  <button onClick={() => executeRcon(`lp user ${activeTarget} permission set ${lpPermission} false`)} disabled={!activeTarget || !lpPermission} className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30">Entziehen</button>
                </div>

                <div className="flex gap-2 border-t border-white/10 pt-3">
                  <button onClick={() => executeRcon(`lp user ${activeTarget} info`)} disabled={!activeTarget} className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-mono flex-1 cursor-pointer disabled:opacity-30">User Details</button>
                  <button onClick={() => executeRcon('lp editor')} className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1 flex-1 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Web Editor</button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PANEL 2: GEYSER / CROSSPLAY */}
          {pluginSubTab === 'geyser' && (
            <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">Geyser & Floodgate Steuerung</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => executeRcon('geyser reload')} className="bg-white/5 hover:bg-[#00f0ff]/20 border border-white/10 p-3 rounded-xl font-mono text-xs text-left cursor-pointer">
                  <span className="text-[#00f0ff] font-bold block">Config Reload</span>
                  <span className="text-[10px] text-slate-400">Lädt die geyser-spigot Einstellungen neu</span>
                </button>
                <button onClick={() => executeRcon('geyser dump')} className="bg-white/5 hover:bg-[#00f0ff]/20 border border-white/10 p-3 rounded-xl font-mono text-xs text-left cursor-pointer">
                  <span className="text-[#00ffcc] font-bold block">Debug Dump</span>
                  <span className="text-[10px] text-slate-400">Erstellt einen Log-Dump für Support</span>
                </button>
                <button onClick={() => executeRcon('geyser offlineuser ' + (activeTarget || ''))} disabled={!activeTarget} className="bg-white/5 hover:bg-[#00f0ff]/20 border border-white/10 p-3 rounded-xl font-mono text-xs text-left cursor-pointer disabled:opacity-30">
                  <span className="text-amber-400 font-bold block">Bedrock UUID Check</span>
                  <span className="text-[10px] text-slate-400">Prüft Bedrock-Zuordnung des Spielers</span>
                </button>
              </div>
            </div>
          )}

          {/* SUB-PANEL 3: TAB & SCOREBOARD */}
          {pluginSubTab === 'tab' && (
            <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">TAB UI Control</span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => executeRcon('tab reload')} className="bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-[#00f0ff] px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer">TAB Config Reload</button>
                <button onClick={() => executeRcon(`tab player ${activeTarget} announce bar &aWillkommen! 5`)} disabled={!activeTarget} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-mono cursor-pointer disabled:opacity-30">Bossbar Nachricht (5s)</button>
                <button onClick={() => executeRcon('tab scoreboard show')} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-mono cursor-pointer">Scoreboard Einblenden</button>
              </div>
            </div>
          )}

          {/* SUB-PANEL 4: WORLDGUARD & WORLDEDIT */}
          {pluginSubTab === 'worldguard' && (
            <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">WorldGuard Regionen Schnellkonfiguration</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Region Name (z.B. spawn)" value={rgName} onChange={(e) => setRgName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono" />
                <select value={rgFlag} onChange={(e) => setRgFlag(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono">
                  <option value="passthrough" className="bg-black">passthrough (Bauen)</option>
                  <option value="pvp" className="bg-black">pvp (Kampf)</option>
                  <option value="mob-spawning" className="bg-black">mob-spawning</option>
                  <option value="chest-access" className="bg-black">chest-access</option>
                </select>
                <select value={rgVal} onChange={(e) => setRgVal(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono">
                  <option value="deny" className="bg-black">deny (Verbieten)</option>
                  <option value="allow" className="bg-black">allow (Erlauben)</option>
                </select>
                <button onClick={() => executeRcon(`rg flag ${rgName} ${rgFlag} ${rgVal}`)} disabled={!rgName} className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30">Flag Setzen</button>
              </div>
            </div>
          )}

          {/* SUB-PANEL 5: CHAT & BROADCASTS */}
          {pluginSubTab === 'chat' && (
            <div className="bg-[#030406] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-xs font-mono font-bold text-[#00f0ff] uppercase">Serverweite Ankündigungen</span>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input type="text" placeholder="Chat Nachrichten-Broadcast..." value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono flex-1" />
                  <button onClick={() => executeRcon(`say ${broadcastMsg}`)} disabled={!broadcastMsg} className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30">Chat Send</button>
                </div>

                <div className="flex gap-2">
                  <input type="text" placeholder="Bildschirm Titel..." value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono flex-1" />
                  <button onClick={() => executeRcon(`title @a title {"text":"${broadcastTitle}","color":"gold"}`)} disabled={!broadcastTitle} className="bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/40 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer disabled:opacity-30">Title Send</button>
                </div>
              </div>
            </div>
          )}

          {/* Live RCON Console Response Output */}
          {cmdResult && (
            <div className="bg-black/60 border border-[#00f0ff]/30 p-4 rounded-xl font-mono text-xs text-[#00ffcc] whitespace-pre-wrap">
              {cmdResult}
            </div>
          )}

        </div>
      )}

      {/* --- TAB 3: PLUGIN JAR MANAGER --- */}
      {activeTab === 'plugins' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#030406] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <span className="font-mono text-xs text-[#00f0ff] font-bold uppercase">Erkannte .jar Plugins</span>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {pluginsList.map((p, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl font-mono text-xs flex justify-between items-center">
                  <span>{p}</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Installiert</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#030406] border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
            <span className="font-mono text-xs text-[#00f0ff] font-bold uppercase">Plugin Upload (.jar)</span>
            <form onSubmit={(e) => { e.preventDefault(); }} className="flex flex-col gap-3">
              <input type="file" accept=".jar" onChange={(e) => setUploadFile(e.target.files[0])} className="text-xs font-mono text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#00f0ff]/20 file:text-[#00f0ff] cursor-pointer" />
              <button type="submit" disabled={!uploadFile} className="bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 rounded-xl p-2 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
                <Upload className="w-4 h-4" /> Datei Hochladen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB 4: SYSTEM STACK LOGS --- */}
      {activeTab === 'logs' && (
        <div className="bg-[#030406] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="font-mono text-xs text-[#00f0ff] font-bold">DOCKER CONTAINER LOGS</span>
            <button onClick={fetchLogs} className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <div className="bg-black/60 border border-white/5 rounded-xl p-4 h-96 overflow-y-auto font-mono text-[11px] text-slate-300 flex flex-col gap-1">
            {dockerLogs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Global Status Message */}
      {message && (
        <div className="bg-[#030406] border border-[#00f0ff]/30 p-3 rounded-2xl text-xs text-[#00f0ff] font-mono flex items-center gap-3">
          <Activity className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <span>{message}</span>
        </div>
      )}

    </div>
  );
}