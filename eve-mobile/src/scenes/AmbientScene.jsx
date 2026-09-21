import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  useWindowDimensions, 
  Pressable 
} from 'react-native';
import { 
  Clock, 
  Cloud, 
  Calendar, 
  Server, 
  Wifi,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Plus
} from 'lucide-react-native';

import EVEAvatar from '../components/EVEAvatar';
import { useEVE } from '../context/EVEContext';

export default function AmbientScene({ systemMetrics, calendarEvents, weatherData, isConnected }) {
  const { NODE_SERVER, setActiveScene } = useEVE();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Todos vom Backend laden für das Ambient-Widget
  useEffect(() => {
    const fetchAmbientTodos = async () => {
      if (!NODE_SERVER) return;
      try {
        const baseUrl = NODE_SERVER.replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/api/todos`);
        if (res.ok) {
          const data = await res.json();
          setTodos(data.todos || []);
        }
      } catch (err) {
        console.error('[Ambient] Fehler beim Laden der Todos:', err);
      }
    };
    fetchAmbientTodos();
  }, [NODE_SERVER]);

  const cpuVal = systemMetrics?.cpu_percent ?? 18;
  const ramVal = systemMetrics?.ram_percent ?? 45;
  const diskVal = systemMetrics?.disk_percent ?? 32;
  const netRx = systemMetrics?.net_rx_kbs ?? 0;
  const netTx = systemMetrics?.net_tx_kbs ?? 0;

  const formatTraffic = (val) => {
    if (val === undefined || val === null) return '0 KB/s';
    if (val > 1024) return `${(val / 1024).toFixed(1)} MB/s`;
    return `${Math.round(val)} KB/s`;
  };

  const urgentEvents = (calendarEvents || []).filter(evt => evt.priority === 'Hoch').slice(0, 2);
  const currentTodos = todos.slice(0, 3); // Maximal die top 3 aktiven Tasks im Widget anzeigen
  const weatherTemp = weatherData?.temp ?? '19°C';
  const weatherCondition = weatherData?.condition ?? 'Teilweise bewölkt';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* POCKET CLIENT HEADER */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#34d399' : '#f59e0b' }]} />
            <Text style={styles.headerTitle}>EVE POCKET CLIENT</Text>
          </View>
          <View style={styles.timeBadge}>
            <Clock size={12} color="#22d3ee" />
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>

        {/* ACTIVE EVE STREAM AVATAR */}
        <View style={styles.avatarSection}>
          <EVEAvatar onPress={() => console.log('EVE Stream Tap')} />
          <Text style={styles.hintText}>SYSTEM ONLINE · FREQUENCY STABLE</Text>
        </View>

        {/* WIDGETS GRID (5 KERN-BEREICHE) */}
        <View style={styles.widgetsGrid}>
          
          {/* 1. WETTER WIDGET */}
          <View style={styles.card}>
            <View style={styles.cardGlowLine} />
            <View style={[styles.cardRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Cloud size={16} color="#fbbf24" />
                <View>
                  <Text style={styles.cardTitle}>Aachen</Text>
                  <Text style={styles.cardSub}>{dateStr} · {weatherCondition}</Text>
                </View>
              </View>
              <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: 'bold' }}>{weatherTemp}</Text>
            </View>
          </View>

          {/* 2. AUSLASTUNG (TELEMETRIE) WIDGET */}
          <View style={styles.card}>
            <View style={styles.cardGlowLine} />
            <View style={[styles.cardRow, { justifyContent: 'space-between', marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Server size={15} color="#22d3ee" />
                <Text style={styles.cardTitle}>SYSTEM AUSLASTUNG</Text>
              </View>
              <Text style={styles.cardStatusOnline}>STABLE</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>CPU</Text>
                <Text style={[styles.metricVal, { color: '#22d3ee' }]}>{cpuVal}%</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>RAM</Text>
                <Text style={[styles.metricVal, { color: '#818cf8' }]}>{ramVal}%</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>DISK</Text>
                <Text style={[styles.metricVal, { color: '#34d399' }]}>{diskVal}%</Text>
              </View>
            </View>
          </View>

          {/* 3. NETZWERK TRAFFIC WIDGET */}
          <View style={styles.card}>
            <View style={styles.cardGlowLine} />
            <View style={[styles.cardRow, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Wifi size={15} color="#38bdf8" />
                <Text style={styles.cardTitle}>NETZWERK TRAFFIC</Text>
              </View>
              <Text style={{ color: '#38bdf8', fontSize: 9, fontWeight: 'bold' }}>LIVE</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                  <ArrowDown size={9} color="#34d399" />
                  <Text style={styles.metricLabel}>RX</Text>
                </View>
                <Text style={[styles.metricVal, { color: '#34d399', fontSize: 9.5 }]}>{formatTraffic(netRx)}</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                  <ArrowUp size={9} color="#f43f5e" />
                  <Text style={styles.metricLabel}>TX</Text>
                </View>
                <Text style={[styles.metricVal, { color: '#f43f5e', fontSize: 9.5 }]}>{formatTraffic(netTx)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>STATUS</Text>
                <Text style={[styles.metricVal, { color: '#22d3ee', fontSize: 9.5 }]}>OK</Text>
              </View>
            </View>
          </View>

          {/* 4. TERMINE WIDGET */}
          <View style={styles.card}>
            <View style={styles.cardGlowLine} />
            <View style={[styles.cardRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} color="#f43f5e" />
                <Text style={[styles.cardTitle, { color: '#f43f5e' }]}>Anstehende Termine</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 9 }}>{urgentEvents.length} aktiv</Text>
            </View>

            {urgentEvents.length === 0 ? (
              <Text style={styles.emptySubText}>Keine kritischen Termine heute.</Text>
            ) : (
              urgentEvents.map((evt, i) => (
                <View key={i} style={styles.eventRow}>
                  <Text style={styles.eventText} numberOfLines={1}>{evt.title}</Text>
                  <View style={styles.dot} />
                </View>
              ))
            )}
          </View>

          {/* 5. TODO-LISTE WIDGET (LIVE INTEGRIERT) */}
          <View style={styles.card}>
            <View style={styles.cardGlowLine} />
            <View style={[styles.cardRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={15} color="#34d399" />
                <Text style={[styles.cardTitle, { color: '#34d399' }]}>Todo-Liste ({todos.length})</Text>
              </View>
              <Pressable style={styles.addTodoBtn} onPress={() => setActiveScene('todos')}>
                <Plus size={12} color="#34d399" />
              </Pressable>
            </View>

            {currentTodos.length === 0 ? (
              <Text style={styles.emptySubText}>Keine offenen Aufgaben. Bereit.</Text>
            ) : (
              currentTodos.map((todo) => (
                <View key={todo.id} style={styles.eventRow}>
                  <Text style={styles.eventText} numberOfLines={1}>{todo.title}</Text>
                  <View style={[styles.todoDot, { backgroundColor: todo.priority === 'Hoch' ? '#f43f5e' : todo.priority === 'Mittel' ? '#f59e0b' : '#34d399' }]} />
                </View>
              ))
            )}
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#020617' 
  },
  scrollContainer: { 
    padding: 12, 
    paddingBottom: 110 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10, 
    paddingBottom: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1e293b' 
  },
  badgeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerTitle: { 
    color: '#f8fafc', 
    fontWeight: 'bold', 
    fontSize: 10.5, 
    letterSpacing: 1 
  },
  timeBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  timeText: { 
    color: '#94a3b8', 
    fontSize: 10.5, 
    fontWeight: '600' 
  },
  avatarSection: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%',
    marginBottom: 10,
  },
  hintText: { 
    color: '#06b6d4', 
    fontSize: 8, 
    letterSpacing: 1.2, 
    marginTop: 4, 
    fontWeight: 'bold' 
  },
  widgetsGrid: { 
    flexDirection: 'column', 
    gap: 8 
  },
  card: { 
    backgroundColor: 'rgba(15, 23, 42, 0.88)', 
    borderWidth: 1, 
    borderColor: '#1e293b', 
    borderRadius: 16, 
    padding: 12, 
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  cardGlowLine: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: '30%',
    height: 1.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
  },
  cardRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  cardTitle: { 
    color: '#f1f5f9', 
    fontWeight: 'bold', 
    fontSize: 10 
  },
  cardSub: {
    color: '#64748b',
    fontSize: 8.5,
    marginTop: 1,
  },
  cardStatusOnline: {
    color: '#34d399', 
    fontSize: 9, 
    fontWeight: 'bold'
  },
  metricsGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  metricItem: { 
    backgroundColor: '#020617', 
    borderRadius: 10, 
    padding: 7, 
    width: '31%', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#1e293b' 
  },
  metricLabel: { 
    color: '#64748b', 
    fontSize: 7.5, 
    marginBottom: 2 
  },
  metricVal: { 
    fontSize: 10.5, 
    fontWeight: 'bold' 
  },
  eventRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 5 
  },
  eventText: { 
    color: '#cbd5e1', 
    fontSize: 9.5, 
    flex: 1, 
    marginRight: 6 
  },
  emptySubText: {
    color: '#64748b',
    fontSize: 9.5,
    marginTop: 5,
  },
  dot: { 
    width: 5, 
    height: 5, 
    borderRadius: 2.5, 
    backgroundColor: '#f43f5e' 
  },
  todoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  addTodoBtn: {
    padding: 3,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
});