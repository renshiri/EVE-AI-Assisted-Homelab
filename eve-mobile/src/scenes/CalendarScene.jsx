import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Modal, 
  useWindowDimensions,
  Alert 
} from 'react-native';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Pencil, 
  Clock, 
  MapPin 
} from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function CalendarScene() {
  const { calendarEvents, fetchCalendarEvents, NODE_SERVER } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isTwoColumn = isTablet || isLandscape;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [title, setTitle] = useState('');
  const [dateStrInput, setDateStrInput] = useState('');
  const [timeStrInput, setTimeStrInput] = useState('12:00');
  const [category, setCategory] = useState('Business');
  const [priority, setPriority] = useState('Mittel');
  const [location, setLocation] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const changeMonth = (offset) => {
    const newDate = new Date(year, month + offset, 1);
    const maxDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
    setCurrentDate(newDate);
  };

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setDateStrInput(formatted);
    setTimeStrInput('12:00');
    setCategory('Business');
    setPriority('Mittel');
    setLocation('');
    setShowModal(true);
  };

  const handleOpenEditModal = (evt) => {
    setEditingEvent(evt);
    setTitle(evt.title || '');
    if (evt.start_datetime) {
      const parts = evt.start_datetime.split('T');
      setDateStrInput(parts[0]);
      if (parts[1]) setTimeStrInput(parts[1].substring(0, 5));
    }
    setCategory(evt.category || 'Business');
    setPriority(evt.priority || 'Mittel');
    setLocation(evt.location || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !dateStrInput.trim()) return;

    const start_datetime = `${dateStrInput}T${timeStrInput}:00`;
    const queryParams = `title=${encodeURIComponent(title)}&start_datetime=${encodeURIComponent(start_datetime)}&category=${encodeURIComponent(category)}&priority=${encodeURIComponent(priority)}&location=${encodeURIComponent(location)}`;

    try {
      let res;
      if (editingEvent) {
        res = await fetch(`${NODE_SERVER}/api/calendar/events/${editingEvent.id}?${queryParams}`, { method: 'PUT' });
      } else {
        res = await fetch(`${NODE_SERVER}/api/calendar/events?${queryParams}`, { method: 'POST' });
      }

      if (res.ok) {
        fetchCalendarEvents();
        setShowModal(false);
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Termin löschen', 'Möchtest du diesen Termin wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { 
        text: 'Löschen', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const res = await fetch(`${NODE_SERVER}/api/calendar/events/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCalendarEvents();
          } catch (err) {
            console.error('Fehler beim Löschen:', err);
          }
        } 
      }
    ]);
  };

  const selectedDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayEvents = (calendarEvents || []).filter(evt => evt.start_datetime && evt.start_datetime.startsWith(selectedDateKey));

  const getPriorityColor = (p) => {
    if (p === 'Hoch') return '#f43f5e';
    if (p === 'Mittel') return '#f59e0b';
    return '#22d3ee';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <CalendarIcon size={20} color="#22d3ee" />
            </View>
            <View>
              <Text style={styles.headerTitle}>System Kalender</Text>
              <Text style={styles.headerSub}>{monthNames[month]} {year}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.monthNav}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.navBtn}>
                <ChevronLeft size={16} color="#94a3b8" />
              </Pressable>
              <Pressable onPress={() => changeMonth(1)} style={styles.navBtn}>
                <ChevronRight size={16} color="#94a3b8" />
              </Pressable>
            </View>

            <Pressable onPress={handleOpenCreateModal} style={styles.addBtn}>
              <Plus size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Dynamic Grid Layout */}
        <View style={[styles.mainLayout, isTwoColumn && styles.rowLayout]}>
          
          {/* Kalender Monats-Grid */}
          <View style={[styles.gridCard, isTwoColumn && { flex: 1.2 }]}>
            <View style={styles.cardGlowLine} />
            
            {/* Wochentage Header */}
            <View style={styles.weekHeader}>
              {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map((d) => (
                <Text key={d} style={styles.weekText}>{d}</Text>
              ))}
            </View>

            {/* Tage Grid */}
            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.emptyDay} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = (calendarEvents || []).filter(e => e.start_datetime && e.start_datetime.startsWith(dateKey));
                const isSelected = selectedDay === dayNum;
                const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                  <Pressable
                    key={dayNum}
                    onPress={() => setSelectedDay(dayNum)}
                    style={[
                      styles.dayBox,
                      isLandscape && !isTablet && styles.compactDayBox,
                      isSelected && styles.dayBoxSelected
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      isToday && styles.todayText,
                      isSelected && styles.selectedDayText
                    ]}>
                      {dayNum}
                    </Text>

                    {/* Termine Indikator-Punkte */}
                    <View style={styles.dotsRow}>
                      {dayEvents.map((evt, idx) => (
                        <View 
                          key={idx} 
                          style={[styles.eventDot, { backgroundColor: getPriorityColor(evt.priority) }]} 
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>

          </View>

          {/* Tages-Details Sidebar */}
          <View style={[styles.detailsCard, isTwoColumn && { flex: 1 }]}>
            <View style={styles.cardGlowLine} />
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                Termine am {selectedDay}. {monthNames[month]}
              </Text>
              <Text style={styles.detailsCount}>({selectedDayEvents.length})</Text>
            </View>

            {selectedDayEvents.length === 0 ? (
              <Text style={styles.emptyText}>Keine Termine an diesem Tag.</Text>
            ) : (
              selectedDayEvents.map((evt) => {
                const dt = new Date(evt.start_datetime);
                const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const pColor = getPriorityColor(evt.priority);

                return (
                  <View key={evt.id || evt.title} style={[styles.eventCard, { borderLeftColor: pColor }]}>
                    <View style={styles.eventCardHeader}>
                      <View style={[styles.priorityBadge, { borderColor: pColor, backgroundColor: `${pColor}15` }]}>
                        <Text style={[styles.priorityBadgeText, { color: pColor }]}>{evt.priority || 'Mittel'}</Text>
                      </View>

                      <View style={styles.eventActions}>
                        <Pressable onPress={() => handleOpenEditModal(evt)} style={styles.actionIcon}>
                          <Pencil size={14} color="#64748b" />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(evt.id)} style={styles.actionIcon}>
                          <Trash2 size={14} color="#f43f5e" />
                        </Pressable>
                      </View>
                    </View>

                    <Text style={styles.eventTitle}>{evt.title}</Text>

                    <View style={styles.eventMeta}>
                      <View style={styles.metaRow}>
                        <Clock size={12} color="#818cf8" />
                        <Text style={styles.metaText}>{timeStr} Uhr</Text>
                      </View>
                      {!!evt.location && (
                        <View style={styles.metaRow}>
                          <MapPin size={12} color="#34d399" />
                          <Text style={styles.metaText}>{evt.location}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

        </View>

      </ScrollView>

      {/* Modal: Neuer Termin / Bearbeiten */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isLandscape && styles.modalCardLandscape]}>
            <View style={styles.sheetGlowLine} />
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Termin bearbeiten' : 'Neuen Termin eintragen'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Titel / Anlass</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. Meeting"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Datum (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dateStrInput}
                  onChangeText={setDateStrInput}
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Uhrzeit (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={timeStrInput}
                  onChangeText={setTimeStrInput}
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Priorität</Text>
              <View style={styles.prioritySelector}>
                {['Hoch', 'Mittel', 'Niedrig'].map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.pBtn,
                      priority === p && { backgroundColor: getPriorityColor(p), borderColor: getPriorityColor(p) }
                    ]}
                  >
                    <Text style={[styles.pBtnText, priority === p && { color: '#020617', fontWeight: 'bold' }]}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ort (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. Büro / Discord"
                placeholderTextColor="#64748b"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Speichern</Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContainer: {
    padding: 12,
    paddingBottom: 110, // Platz für das schwebende Dock
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
    marginBottom: 12,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    padding: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthNav: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 2,
  },
  navBtn: {
    padding: 6,
  },
  addBtn: {
    backgroundColor: '#06b6d4',
    padding: 8,
    borderRadius: 12,
  },
  mainLayout: {
    gap: 12,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emptyDay: {
    width: '13.2%',
    height: 40,
  },
  dayBox: {
    width: '13.2%',
    height: 40,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    justifyContent: 'space-between',
  },
  compactDayBox: {
    height: 36,
  },
  dayBoxSelected: {
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  dayText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 'bold',
  },
  todayText: {
    color: '#22d3ee',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 10,
  },
  detailsTitle: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsCount: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 16,
  },
  eventCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 2,
  },
  eventTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  eventMeta: {
    marginTop: 4,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  modalCardLandscape: {
    maxWidth: 480,
    padding: 14,
  },
  sheetGlowLine: {
    position: 'absolute',
    top: 0,
    left: '30%',
    width: '40%',
    height: 2,
    backgroundColor: '#06b6d4',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    color: '#64748b',
    fontSize: 9,
    marginBottom: 3,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    color: '#f1f5f9',
    fontSize: 11,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  pBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  pBtnText: {
    color: '#64748b',
    fontSize: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 11,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#06b6d4',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
});