import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TextInput, 
  Pressable, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { CheckSquare, Plus, Trash2, Flag, Clock } from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function TodoScene() {
  const { NODE_SERVER } = useEVE();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Mittel');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Saubere Basis-URL-Bereinigung
  const baseUrl = NODE_SERVER ? NODE_SERVER.replace(/\/+$/, '') : 'http://localhost:5000';

  const fetchTodos = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${baseUrl}/api/todos`);
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      } else {
        console.warn('[Todo] Konnte Tasks nicht laden, Status:', res.status);
      }
    } catch (err) {
      console.error('[Todo Fetch Error] Netzwerkfehler:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (baseUrl) {
      fetchTodos();
    }
  }, [baseUrl]);

  const handleAddTodo = async () => {
    if (!title || !title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          title: title.trim(), 
          priority: priority 
        })
      });

      const textResponse = await res.text();
      let data = {};
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
      } catch (e) {
        console.warn('[Todo] Konnte JSON nicht parsen:', textResponse);
      }

      if (res.ok) {
        setTitle('');
        setPriority('Mittel');
        fetchTodos(); // Liste sofort neu laden
      } else {
        console.error('[Todo Add Error] Server meldet Fehler:', data);
      }
    } catch (err) {
      console.error('[Todo Add Error] Netzwerk- oder Verbindungsproblem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${baseUrl}/api/todos/${id}`, { 
        method: 'DELETE' 
      });
      
      if (res.ok) {
        fetchTodos();
      } else {
        console.error('[Todo Delete Error] Konnte Task nicht löschen, Status:', res.status);
      }
    } catch (err) {
      console.error('[Todo Delete Error] Netzwerkfehler:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Bar */}
        <View style={[styles.headerCard, isLandscape && styles.headerCardLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <CheckSquare size={18} color="#22d3ee" />
            </View>
            <View>
              <Text style={styles.headerTitle}>System Task Manager</Text>
              <Text style={styles.headerSub}>Neo4j Datenbank Sync</Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{todos.length} Active</Text>
          </View>
        </View>

        {/* Eingabeformular */}
        <View style={styles.formCard}>
          <View style={styles.cardGlowLine} />
          <TextInput
            style={styles.input}
            placeholder="Neue Aufgabe eingeben..."
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />
          <View style={styles.formRow}>
            <View style={styles.prioritySelector}>
              {['Hoch', 'Mittel', 'Niedrig'].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                >
                  <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable 
              onPress={handleAddTodo}
              disabled={loading}
              style={[styles.addBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addBtnText}>Hinzufügen</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Aufgaben Liste */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {fetching && todos.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color="#22d3ee" />
              <Text style={styles.loadingText}>Lade Tasks aus Neo4j...</Text>
            </View>
          ) : todos.length === 0 ? (
            <View style={styles.centerBox}>
              <CheckSquare size={36} color="#334155" />
              <Text style={styles.emptyText}>Keine aktiven Aufgaben im System.</Text>
            </View>
          ) : (
            <View style={styles.listGrid}>
              {todos.map((todo) => {
                const isHigh = todo.priority === 'Hoch';
                const isMedium = todo.priority === 'Mittel';
                const pColor = isHigh ? '#f43f5e' : isMedium ? '#f59e0b' : '#22d3ee';

                return (
                  <View key={todo.id} style={[styles.todoCard, { borderLeftColor: pColor }]}>
                    <View style={styles.cardGlowLine} />
                    <View style={styles.todoHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.todoTitle} numberOfLines={2}>{todo.title}</Text>
                      </View>
                      <View style={[styles.priorityBadge, { backgroundColor: isHigh ? 'rgba(244,63,94,0.15)' : isMedium ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)', borderColor: pColor + '40' }]}>
                        <Flag size={10} color={pColor} />
                        <Text style={[styles.priorityBadgeText, { color: pColor }]}>{todo.priority}</Text>
                      </View>
                    </View>

                    <View style={styles.todoFooter}>
                      <View style={styles.dateRow}>
                        <Clock size={11} color="#64748b" />
                        <Text style={styles.dateText}>{todo.date ? new Date(todo.date).toLocaleDateString('de-DE') : 'Heute'}</Text>
                      </View>
                      <Pressable onPress={() => handleDelete(todo.id)} style={styles.deleteBtn}>
                        <Trash2 size={13} color="#f43f5e" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
  },
  badgeContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: 'bold',
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    color: '#f8fafc',
    fontSize: 11,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  prioritySelector: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  priorityBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  priorityText: {
    color: '#64748b',
    fontSize: 9,
  },
  priorityTextActive: {
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
  },
  listGrid: {
    gap: 8,
  },
  todoCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 3,
    borderRadius: 16,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todoTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 15,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#64748b',
    fontSize: 8.5,
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
  },
});