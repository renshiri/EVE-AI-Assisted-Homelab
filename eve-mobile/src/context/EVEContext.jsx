import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const EVEContext = createContext(null);

// 🌐 Tailscale IP deiner EVE Node1
const TAILSCALE_IP = '100.81.234.37';

const NODE_SERVER = `http://${TAILSCALE_IP}:5000`;
const WORKER_SERVER = `http://${TAILSCALE_IP}:5001`;
const WS_URL = `ws://${TAILSCALE_IP}:5000/ws/ui`;

export const EVEProvider = ({ children }) => {
  const [activeScene, setActiveScene] = useState('ambient');
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // --- PERSISTENTER CHAT STATE ---
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'eve',
      text: 'Bereit für Ihre Anweisungen, Sir. Wie kann ich Sie unterstützen?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Live States
  const [bazaarData, setBazaarData] = useState([]);
  const [bazaarLastUpdated, setBazaarLastUpdated] = useState('Lade...');
  const [topologyText, setTopologyText] = useState('Lade Topologie...');
  const [nasFiles, setNasFiles] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  
  // Hardware-Metriken Initial State
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
        const userData = { 
          username: data.username, 
          role: data.role, 
          permissions: data.permissions || ['read'] 
        };
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, message: err.detail || 'Login fehlgeschlagen' };
      }
    } catch (e) {
      return { success: false, message: 'Server nicht erreichbar' };
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // Chat Nachricht hinzufügen
  const addChatMessage = useCallback((sender, text) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender, text, timestamp: timeStr }]);
  }, []);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[EVE-WS] Verbunden mit Node1 via Tailscale');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PING') {
              setIsConnected(true);
            }
          } catch (err) {
            console.error('[EVE-WS] Fehler beim Parsen:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          setIsConnected(false);
          if (ws) ws.close();
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // REST Calls
  const fetchBazaarData = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_SERVER}/api/skyblock/bazaar/top?limit=10`);
      if (res.ok) {
        const json = await res.json();
        setBazaarData(json.flips || []);
        setBazaarLastUpdated(json.last_updated || 'Live');
      }
    } catch (e) {}
  }, []);

  const fetchTopology = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/system/topology`);
      if (res.ok) {
        const text = await res.text();
        setTopologyText(text);
      }
    } catch (e) {
      setTopologyText('Node 1 nicht erreichbar.');
    }
  }, []);

  const fetchNasFiles = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/files?username=${user?.username || 'guest'}`);
      if (res.ok) {
        const json = await res.json();
        setNasFiles(json.files || []);
      }
    } catch (e) {}
  }, [user]);

  const fetchLogs = useCallback(async (service = 'eve-server') => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/logs?service=${service}`);
      if (res.ok) {
        const json = await res.json();
        setSystemLogs(json.logs || []);
      }
    } catch (e) {}
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/reports`);
      if (res.ok) {
        const json = await res.json();
        setReportsList(json.reports || []);
      }
    } catch (e) {}
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/calendar/events`);
      if (res.ok) {
        const json = await res.json();
        setCalendarEvents(json.events || []);
      }
    } catch (e) {}
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/system/metrics`);
      if (res.ok) {
        const json = await res.json();
        setSystemMetrics(json);
      }
    } catch (e) {}
  }, []);

  // Polling
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

  return (
    <EVEContext.Provider
      value={{
        activeScene,
        setActiveScene,
        isConnected,
        isAuthenticated,
        setIsAuthenticated,
        user,
        setUser,
        login,
        logout,
        chatMessages,
        addChatMessage,
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