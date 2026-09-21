import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Terminal as TerminalIcon, Shield, Plus, X } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

// Globaler Store, damit XTerm-Instanzen und WebSockets beim Szenenwechsel im WebOS erhalten bleiben
const sessionStore = new Map();

function TerminalInstance({ tabId, isActive, nodeServer, token }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let session = sessionStore.get(tabId);

    if (!session) {
      // 1. XTerm Instanz initialisieren
      const term = new XTerm({
        cursorBlink: true,
        theme: {
          background: '#090d16',
          foreground: '#e2e8f0',
          cursor: '#06b6d4',
          selectionBackground: '#1e293b',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 12,
        allowTransparency: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);

      // 2. WebSocket Verbindung zum Backend aufbauen (gesichert mit Session-Token)
      const wsProtocol = nodeServer.startsWith('https') ? 'wss://' : 'ws://';
      const wsHost = nodeServer.replace(/^https?:\/\//, '');
      const activeToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('eve_token') : '');
      const tokenQuery = activeToken ? `?token=${encodeURIComponent(activeToken)}` : '';
      const ws = new WebSocket(`${wsProtocol}${wsHost}/ws/terminal${tokenQuery}`);

      ws.onopen = () => {
        term.writeln('\x1b[36m[EVE Terminal Connected to Node 1]\x1b[0m\r\n');
        
        requestAnimationFrame(() => {
          if (container.clientWidth > 0) {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions() || { cols: term.cols, rows: term.rows };
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          }
        });
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onclose = () => {
        term.writeln('\r\n\x1b[31m[Connection Closed]\x1b[0m');
      };

      // 3. Tasteneingaben an das Backend senden
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      session = { term, fitAddon, ws, container };
      sessionStore.set(tabId, session);
    } else {
      // Bereits existierende Session in den aktuellen DOM-Container umhängen
      if (session.term.element && session.container !== container) {
        container.appendChild(session.term.element);
        session.container = container;
      }
    }

    // ResizeObserver überwacht den Container und passt das Terminal dynamisch an
    const resizeObserver = new ResizeObserver(() => {
      if (isActive && session.fitAddon && container.clientWidth > 0) {
        try {
          session.fitAddon.fit();
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: 'resize', cols: session.term.cols, rows: session.term.rows }));
          }
        } catch (e) {
          // Ignorieren während des Unmounts
        }
      }
    });

    resizeObserver.observe(container);

    const handleWindowResize = () => {
      if (isActive && session.fitAddon) {
        session.fitAddon.fit();
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({ type: 'resize', cols: session.term.cols, rows: session.term.rows }));
        }
      }
    };
    
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [nodeServer, tabId, isActive]);

  // Wenn der Tab aktiv geschaltet wird, Layout sofort neu berechnen
  useEffect(() => {
    const session = sessionStore.get(tabId);
    if (isActive && session && session.fitAddon && containerRef.current && containerRef.current.clientWidth > 0) {
      requestAnimationFrame(() => {
        try {
          session.fitAddon.fit();
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ 
              type: 'resize', 
              cols: session.term.cols, 
              rows: session.term.rows 
            }));
          }
        } catch (e) {}
      });
    }
  }, [isActive, tabId]);

  return (
    <div ref={containerRef} className={`w-full h-full flex-1 relative ${isActive ? 'flex' : 'hidden'} flex-col overflow-hidden`}>
      <div className="w-full h-full flex-1 p-2" />
    </div>
  );
}

export default function TerminalScene() {
  const { 
    NODE_SERVER, 
    token,
    terminalTabs, 
    activeTerminalTabId, 
    setActiveTerminalTabId, 
    addTerminalTab, 
    setTerminalTabs 
  } = useEVE();

  const removeTab = (e, id) => {
    e.stopPropagation();
    if (terminalTabs.length === 1) return;
    
    // Session & WebSocket beim Schließen aufräumen
    const session = sessionStore.get(id);
    if (session) {
      if (session.ws) session.ws.close();
      if (session.term) session.term.dispose();
      sessionStore.delete(id);
    }

    const newTabs = terminalTabs.filter(tab => tab.id !== id);
    setTerminalTabs(newTabs);

    if (activeTerminalTabId === id) {
      setActiveTerminalTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="animate-fade-in h-full flex flex-col gap-3 select-none">
      {/* Header Bar & Tab Bar Container */}
      <div className="flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-md text-xs shadow-lg overflow-hidden">
        {/* Top Info Bar */}
        <div className="flex justify-between items-center p-3.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">EVE Live Terminal (Node 1)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-cyan-950/80 text-cyan-400 px-2.5 py-1 rounded-xl border border-cyan-800/60">
            <Shield className="w-3 h-3" />
            <span>Root / Bash aktiv</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-950/40 overflow-x-auto">
          {terminalTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTerminalTabId(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all border ${
                activeTerminalTabId === tab.id
                  ? 'bg-slate-800 text-cyan-400 border-slate-700 shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{tab.name}</span>
              {terminalTabs.length > 1 && (
                <button
                  onClick={(e) => removeTab(e, tab.id)}
                  className="p-0.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-slate-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTerminalTab}
            className="flex items-center justify-center p-1.5 rounded-xl bg-slate-900/40 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-all ml-1"
            title="Neues Terminal öffnen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 bg-[#090d16] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
        {terminalTabs.map((tab) => (
          <TerminalInstance 
            key={tab.id} 
            tabId={tab.id} 
            isActive={activeTerminalTabId === tab.id} 
            nodeServer={NODE_SERVER} 
            token={token}
          />
        ))}
      </div>
    </div>
  );
}