import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  FlatList, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Keyboard,
  useWindowDimensions
} from 'react-native';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Command, 
  Volume2, 
  VolumeX,
  Activity 
} from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

const LOCAL_INTENTS = {
  bazaar: 'bazaar',
  skyblock: 'bazaar',
  hypixel: 'bazaar',
  topologie: 'ambient',
  system: 'ambient',
  hardware: 'ambient',
  recherche: 'research',
  analyse: 'research',
  datei: 'files',
  nas: 'files',
  log: 'logs',
  bibliothek: 'library',
  kalender: 'calendar',
  termin: 'calendar',
};

const COMMANDS = [
  { cmd: '/reload_brain', desc: 'Leert Caches und lädt den Persona-Prompt aus Neo4j neu' },
  { cmd: '/update_brain', desc: 'Synchronisiert das System-Gedächtnis mit Neo4j' },
  { cmd: '/weather', desc: 'Fragt minutengenaue Live-Wetterdaten ab' },
  { cmd: '/system', desc: 'Schaltet auf die Topologie- & Systemansicht um' },
  { cmd: '/bazaar', desc: 'Öffnet die Hypixel Live Bazaar Flips' },
  { cmd: '/recherche', desc: 'Startet eine enzyklopädische Tiefenanalyse' },
  { cmd: '/logs', desc: 'Zeigt aktuelle Systemctl-Logs an' },
];

export default function ChatScene() {
  const { NODE_SERVER, user, chatMessages, addChatMessage, setActiveScene, isConnected } = useEVE();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);

  const [showCommands, setShowCommands] = useState(false);
  const [filteredCmds, setFilteredCmds] = useState([]);

  const flatListRef = useRef(null);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, loading]);

  const handleInputChange = (text) => {
    setInput(text);
    if (text.startsWith('/')) {
      const query = text.toLowerCase();
      const matches = COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(query));
      setFilteredCmds(matches);
      setShowCommands(matches.length > 0);
    } else {
      setShowCommands(false);
    }
  };

  const selectCommand = (cmdText) => {
    setInput(cmdText + ' ');
    setShowCommands(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setShowCommands(false);
    Keyboard.dismiss();

    addChatMessage('user', userText);

    const lowerText = userText.toLowerCase();
    for (const [key, scene] of Object.entries(LOCAL_INTENTS)) {
      if (lowerText.includes(key)) {
        setActiveScene(scene);
        break;
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`${NODE_SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema: userText, username: user?.username || 'renshiri' })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.response || `Anweisung verarbeitet, Sir.`;
        addChatMessage('eve', replyText);
      } else {
        throw new Error(`Server Status: ${res.status}`);
      }
    } catch (err) {
      console.error('[Chat Error]', err);
      const errReply = 'Verbindungsfehler zum Core-Server. Bitte Status von Node 1 prüfen.';
      addChatMessage('eve', errReply);
    } finally {
      setLoading(false);
    }
  };

  const renderChatItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.msgRow, 
        isUser ? styles.msgRowUser : styles.msgRowEve,
        isLandscape && styles.msgRowLandscape
      ]}>
        <View style={[styles.avatarBox, isUser ? styles.avatarUser : styles.avatarEve]}>
          {isUser ? <User size={16} color="#818cf8" /> : <Bot size={16} color="#22d3ee" />}
        </View>

        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleEve]}>
          <View style={styles.msgHeader}>
            <Text style={[styles.senderName, { color: isUser ? '#818cf8' : '#22d3ee' }]}>
              {isUser ? user?.username || 'Renshiri' : 'EVE Core'}
            </Text>
            <Text style={styles.timestamp}>{item.timestamp || 'Live'}</Text>
          </View>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 85 : 0}
      >
        {/* Top Header */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerLeft}>
            <View style={styles.sphereBox}>
              <Activity size={16} color="#a5f3fc" />
            </View>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.titleText}>EVE NEURAL INTERFACE</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v2.5</Text>
                </View>
              </View>
              <View style={styles.subRow}>
                <Cpu size={12} color="#64748b" />
                <Text style={styles.subText}>Host: Node 1 Hybrid</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Pressable 
              onPress={() => setAutoVoice(!autoVoice)} 
              style={[styles.voiceBtn, autoVoice && styles.voiceBtnActive]}
            >
              {autoVoice ? <Volume2 size={16} color="#22d3ee" /> : <VolumeX size={16} color="#64748b" />}
            </Pressable>

            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#34d399' : '#f59e0b' }]} />
              <Text style={[styles.statusText, { color: isConnected ? '#34d399' : '#f59e0b' }]}>
                {isConnected ? 'ONLINE' : 'CACHE'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chat Nachrichten Liste */}
        <View style={styles.listContainer}>
          <View style={styles.cardGlowLine} />
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingBox}>
                  <Sparkles size={16} color="#22d3ee" />
                  <Text style={styles.loadingText}>Inferenz & Synthese laufen...</Text>
                  <ActivityIndicator size="small" color="#22d3ee" style={{ marginLeft: 8 }} />
                </View>
              ) : null
            }
          />
        </View>

        {/* Command Vorschläge Overlay */}
        {showCommands && (
          <View style={[styles.cmdOverlay, isLandscape && styles.cmdOverlayLandscape]}>
            <View style={styles.cmdHeader}>
              <Command size={12} color="#22d3ee" />
              <Text style={styles.cmdHeaderText}>BEFEHLS-VORSCHLÄGE</Text>
            </View>
            <FlatList
              data={filteredCmds}
              keyExtractor={(item) => item.cmd}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => selectCommand(item.cmd)}
                  style={styles.cmdItem}
                >
                  <Text style={styles.cmdText}>{item.cmd}</Text>
                  <Text style={styles.cmdDesc}>{item.desc}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Eingabeleiste unten (Sicher über dem Floating Dock platziert) */}
        <View style={[styles.inputBar, isLandscape && styles.inputBarLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.inputWrapper}>
            <Terminal size={16} color="#06b6d4" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={handleInputChange}
              placeholder="Anweisung eingeben oder / für Befehle..."
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Pressable 
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 }
            ]}
          >
            <Send size={16} color="#ffffff" />
          </Pressable>
        </View>

      </KeyboardAvoidingView>
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
    paddingBottom: 95, // Sichert den Abstand über dem schwebenden Dock ab
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
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
  headerLandscape: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sphereBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  versionBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  versionText: {
    color: '#22d3ee',
    fontSize: 8,
    fontWeight: 'bold',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  subText: {
    color: '#64748b',
    fontSize: 9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceBtn: {
    padding: 6,
    backgroundColor: '#020617',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  voiceBtnActive: {
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  listContent: {
    padding: 10,
    gap: 10,
  },
  msgRow: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '85%',
    marginBottom: 6,
  },
  msgRowLandscape: {
    maxWidth: '70%',
  },
  msgRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgRowEve: {
    alignSelf: 'flex-start',
  },
  avatarBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarUser: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  avatarEve: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  msgBubble: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 1,
  },
  msgBubbleUser: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderTopRightRadius: 2,
  },
  msgBubbleEve: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: '#1e293b',
    borderTopLeftRadius: 2,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 4,
    marginBottom: 4,
    gap: 12,
  },
  senderName: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#64748b',
    fontSize: 8,
  },
  msgText: {
    color: '#f1f5f9',
    fontSize: 11,
    lineHeight: 16,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 10,
    marginLeft: 6,
  },
  cmdOverlay: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 14,
    padding: 6,
    marginBottom: 6,
    maxHeight: 160,
  },
  cmdOverlayLandscape: {
    maxHeight: 110,
  },
  cmdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 4,
  },
  cmdHeaderText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cmdItem: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cmdText: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cmdDesc: {
    color: '#64748b',
    fontSize: 9,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 6,
    marginTop: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  inputBarLandscape: {
    padding: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    height: 38,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 11,
  },
  sendBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#06b6d4',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});