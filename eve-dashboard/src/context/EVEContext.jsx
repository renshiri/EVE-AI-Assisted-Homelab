import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const EVEContext = createContext(null);

export const EVEProvider = ({ children }) => {
  const [activeScene, setActiveScene] = useState('ambient');
  
  // --- VISITED SCENES STATE (Für ununterbrochenen Szenen-Zustand & WebSockets) ---
  const [visitedScenes, setVisitedScenes] = useState(['ambient']);

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('eve_token') || null;
    }
    return null;
  });

  // --- PERSISTENTER CHAT STATE (Mit Backend-Synchronisation) ---
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'eve',
      text: 'Bereit für Ihre Anweisungen, Sir. Wie kann ich Sie unterstützen?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // --- PERSISTENTER SEARCH STATE (Beim Szenenwechsel erhalten) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchCategory, setSearchCategory] = useState('general');
  const [searchHasSearched, setSearchHasSearched] = useState(false);

  // --- PERSISTENTER TERMINAL STATE (Überlebt Szenenwechsel im WebOS) ---
  const [terminalTabs, setTerminalTabs] = useState([{ id: 1, name: 'Bash 1' }]);
  const [activeTerminalTabId, setActiveTerminalTabId] = useState(1);
  const terminalNextIdRef = useRef(2);

  const addTerminalTab = useCallback(() => {
    const newId = terminalNextIdRef.current;
    terminalNextIdRef.current += 1;
    setTerminalTabs((prev) => [...prev, { id: newId, name: `Bash ${newId}` }]);
    setActiveTerminalTabId(newId);
  }, []);

  // --- PERSISTENTER FILEBROWSER STATE (Überlebt Szenenwechsel) ---
  const [fileBrowserPath, setFileBrowserPath] = useState('');
  const [fileBrowserItems, setFileBrowserItems] = useState([]);

  // Live States
  const [bazaarData, setBazaarData] = useState([]);
  const [bazaarLastUpdated, setBazaarLastUpdated] = useState('Lade...');
  const [topologyText, setTopologyText] = useState('Lade Topologie...');
  const [nasFiles, setNasFiles] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  
  // Vollständiger Initial State für alle Hardware-Parameter
  const [systemMetrics, setSystemMetrics] = useState({ 
    cpu_percent: 0, 
    cpu_temp: null,
    ram_percent: 0, 
    ram_used_gb: 0, 
    ram_total_gb: 0,
    disk_percent: 0,
    disk_used_gb: 0,
    disk_total_gb: 0,
    net_rx_kbs: 0,
    net_tx_kbs: 0
  });

  // Dynamische IP-Erkennung für Mehrmaschinen-Betrieb
  const NODE_IP = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const NODE_SERVER = `http://${NODE_IP}:5000`;
  const WORKER_SERVER = `http://${NODE_IP}:5001`;
  const WS_URL = `${NODE_SERVER.replace(/^http/, 'ws')}/ws/ui${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  // --- SESSION PERSISTENZ (PWA-Resume via sessionStorage) ---
  useEffect(() => {
    const checkStoredSession = async () => {
      const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem('eve_token') : null;
      if (!storedToken) return;

      try {
        const res = await fetch(`${NODE_SERVER}/api/auth/verify`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ username: data.username, role: data.role, permissions: data.permissions });
          setToken(data.token || storedToken);
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem('eve_token');
          setToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (e) {
        // Bei temporärem Verbindungsverlust nicht sofort abmelden
      }
    };

    checkStoredSession();
  }, [NODE_SERVER]);

  // --- ZENTRALER AUTH-FETCH HELPER ---
  const authFetch = useCallback((url, options = {}) => {
    const activeToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('eve_token') : null);
    const headers = {
      ...(options.headers || {}),
      ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
    };
    return fetch(url, { ...options, headers });
  }, [token]);

  // --- SERVER CONTROL ACTION ---
  const executeServerAction = useCallback(async (action, target = 'eve-server') => {
    try {
      const res = await authFetch(`${NODE_SERVER}/api/server/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Server-Steuerung nicht erreichbar' };
    }
  }, [NODE_SERVER, authFetch]);

  // --- LOGIN & LOGOUT HELPER ---
  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setUser({ username: data.username, role: data.role, permissions: data.permissions });
        setToken(data.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('eve_token', data.token);
        }
        setIsAuthenticated(true);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, message: err.detail || 'Login fehlgeschlagen' };
      }
    } catch (e) {
      return { success: false, message: 'Server nicht erreichbar' };
    }
  }, [NODE_SERVER]);

  const logout = useCallback(async () => {
    const activeToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('eve_token') : null);
    if (activeToken) {
      try {
        await fetch(`${NODE_SERVER}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
      } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('eve_token');
    }
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, [NODE_SERVER, token]);

  // --- CHAT VOM SERVER LADEN ---
  const fetchChatHistory = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/chat/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
      }
    } catch (e) {
      // Stiller Fallback bei Netzwerkfehlern
    }
  }, [NODE_SERVER]);

  // Helper zum Hinzufügen von Chat-Nachrichten mit serverseitiger Synchronisation
  const addChatMessage = useCallback(async (sender, text) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender, text, timestamp: timeStr };
    
    setChatMessages((prev) => [...prev, newMsg]);

    try {
      await fetch(`${NODE_SERVER}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      });
    } catch (e) {
      // Stiller Fallback
    }
  }, [NODE_SERVER]);

  // --- WEBSOCKET CONNECTION (AUTONOMER GERÄTE-MODUS) ---
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isSubscribed = true;

    const connectWebSocket = () => {
      if (!isSubscribed) return;
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (isSubscribed) {
            console.log('[EVE-WS] Verbunden mit SDUI Stream (Autonomer UI-Modus)');
            setIsConnected(true);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'PING') {
              if (isSubscribed) setIsConnected(true);
            }

            if (data.type === 'NEW_CHAT_MESSAGE' && data.message) {
              if (isSubscribed) {
                setChatMessages(prev => [...prev, data.message]);
              }
            }
          } catch (err) {
            console.error('[EVE-WS] Fehler beim Parsen:', err);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();
    fetchChatHistory();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [WS_URL, fetchChatHistory]);

  // REST Calls & Datenabruf
  const fetchBazaarData = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_SERVER}/api/skyblock/bazaar/top?limit=10`);
      if (res.ok) {
        const json = await res.json();
        setBazaarData(json.flips || []);
        setBazaarLastUpdated(json.last_updated || 'Live');
      }
    } catch (e) {}
  }, [WORKER_SERVER]);

  const fetchTopology = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/system/topology`);
      if (res.ok) {
        const text = await res.text();
        setTopologyText(text);
      }
    } catch (e) {
      setTopologyText('Knoten Node 1 nicht erreichbar.');
    }
  }, [NODE_SERVER]);

  const fetchNasFiles = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/files?username=${user?.username || 'guest'}`);
      if (res.ok) {
        const json = await res.json();
        setNasFiles(json.files || []);
      }
    } catch (e) {}
  }, [NODE_SERVER, user]);

  const fetchLogs = useCallback(async (service = 'eve-server') => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/logs?service=${service}`);
      if (res.ok) {
        const json = await res.json();
        setSystemLogs(json.logs || []);
      }
    } catch (e) {}
  }, [NODE_SERVER]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/reports`);
      if (res.ok) {
        const json = await res.json();
        setReportsList(json.reports || []);
      }
    } catch (e) {}
  }, [NODE_SERVER]);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/calendar/events`);
      if (res.ok) {
        const json = await res.json();
        setCalendarEvents(json.events || []);
      }
    } catch (e) {}
  }, [NODE_SERVER]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/system/metrics`);
      if (res.ok) {
        const json = await res.json();
        setSystemMetrics(json);
      }
    } catch (e) {
      // Stiller Fehler
    }
  }, [NODE_SERVER]);

  // Initiales Laden & Intervall-Polling
  useEffect(() => {
    fetchBazaarData();
    fetchTopology();
    fetchNasFiles();
    fetchLogs();
    fetchReports();
    fetchCalendarEvents();
    fetchMetrics();

    const interval15s = setInterval(() => {
      fetchBazaarData();
      fetchTopology();
    }, 15000);

    const interval5s = setInterval(() => {
      fetchMetrics();
    }, 5000);

    return () => {
      clearInterval(interval15s);
      clearInterval(interval5s);
    };
  }, [fetchBazaarData, fetchTopology, fetchNasFiles, fetchLogs, fetchReports, fetchCalendarEvents, fetchMetrics]);

  const switchSceneLocally = (sceneName) => {
    setActiveScene(sceneName);
    setVisitedScenes((prev) => 
      prev.includes(sceneName) ? prev : [...prev, sceneName]
    );
  };

  return (
    <EVEContext.Provider
      value={{
        activeScene,
        visitedScenes,
        setActiveScene: switchSceneLocally,
        isConnected,
        isAuthenticated,
        setIsAuthenticated,
        user,
        setUser,
        token,
        authFetch,
        login,
        logout,
        chatMessages,
        setChatMessages,
        addChatMessage,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        searchCategory,
        setSearchCategory,
        searchHasSearched,
        setSearchHasSearched,
        terminalTabs,
        setTerminalTabs,
        activeTerminalTabId,
        setActiveTerminalTabId,
        addTerminalTab,
        fileBrowserPath,
        setFileBrowserPath,
        fileBrowserItems,
        setFileBrowserItems,
        executeServerAction,
        bazaarData,
        bazaarLastUpdated,
        topologyText,
        nasFiles,
        systemLogs,
        reportsList,
        calendarEvents,
        systemMetrics,
        fetchCalendarEvents,
        fetchMetrics,
        fetchLogs,
        fetchReports,
        fetchNasFiles,
        refreshBazaar: fetchBazaarData,
        NODE_SERVER,
        WORKER_SERVER,
      }}
    >
      {children}
    </EVEContext.Provider>
  );
};

export const useEVE = () => useContext(EVEContext);