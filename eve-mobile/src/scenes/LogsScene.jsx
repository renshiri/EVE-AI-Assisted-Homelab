import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { Terminal, RefreshCw, Cpu } from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

const SERVICES = ['eve-server', 'hypixel-worker'];

export default function LogsScene() {
  const { systemLogs, fetchLogs } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;

  const [selectedService, setSelectedService] = useState('eve-server');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs(selectedService);
  }, [selectedService, fetchLogs]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchLogs(selectedService);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Bar */}
        <View style={[styles.headerCard, isLandscape && styles.headerCardLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Terminal size={18} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Systemd Journal</Text>
                <Text style={styles.headerSub}>Live-Logs von Node 1</Text>
              </View>
            </View>

            <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
              <RefreshCw size={14} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Service Selector Tabs */}
          <View style={styles.serviceTabs}>
            {SERVICES.map((service) => {
              const isSelected = selectedService === service;
              return (
                <Pressable
                  key={service}
                  onPress={() => setSelectedService(service)}
                  style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                >
                  <Cpu size={12} color={isSelected ? '#818cf8' : '#64748b'} />
                  <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                    {service}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Terminal Output Stream */}
        <View style={styles.terminalBox}>
          <View style={styles.cardGlowLine} />
          <ScrollView 
            contentContainerStyle={styles.terminalContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && systemLogs.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#818cf8" />
                <Text style={styles.loadingText}>Lese Journalctl-Stream...</Text>
              </View>
            ) : systemLogs && systemLogs.length > 0 ? (
              systemLogs.map((log, idx) => {
                const isError = log.includes('error') || log.includes('Error') || log.includes('FAIL');
                return (
                  <View key={idx} style={styles.logLine}>
                    <Text style={styles.lineNumber}>{idx + 1}</Text>
                    <Text style={[styles.logText, isError && styles.errorLogText]}>
                      {log}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>Keine Logs für diesen Dienst verfügbar.</Text>
              </View>
            )}
          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    padding: 12,
  },
  headerCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlowLine: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: '30%',
    height: 1.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
  },
  headerCardLandscape: {
    paddingVertical: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 7,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
  },
  serviceTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tabBtnActive: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  tabBtnText: {
    color: '#64748b',
    fontSize: 10,
  },
  tabBtnTextActive: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  terminalBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  terminalContent: {
    padding: 12,
    paddingBottom: 40,
  },
  logLine: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 3,
  },
  lineNumber: {
    color: '#475569',
    fontSize: 9,
    width: 22,
    textAlign: 'right',
  },
  logText: {
    color: '#cbd5e1',
    fontSize: 9.5,
    flex: 1,
    lineHeight: 14,
  },
  errorLogText: {
    color: '#f43f5e',
    fontWeight: 'bold',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 10,
  },
});