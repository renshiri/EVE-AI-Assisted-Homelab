import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, 
  Clock, MapPin, Tag, Search, Briefcase, Home, Gamepad2, Cpu, Sparkles, Activity, X, List, Grid
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function CalendarScene() {
  const { calendarEvents, fetchCalendarEvents, NODE_SERVER } = useEVE();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  // Mobile Tab State ('grid' | 'details')
  const [mobileTab, setMobileTab] = useState('grid');

  // QoL States: Suche & Kategorie-Filter
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [category, setCategory] = useState('Business');
  const [priority, setPriority] = useState('Mittel');
  const [location, setLocation] = useState('');

  // Monat-Berechnungen
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Montag = 0

  const changeMonth = (offset) => {
    const newDate = new Date(year, month + offset, 1);
    const maxDaysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    if (selectedDay > maxDaysInNewMonth) {
      setSelectedDay(maxDaysInNewMonth);
    }
    setCurrentDate(newDate);
  };

  const prevMonth = () => changeMonth(-1);
  const nextMonth = () => changeMonth(1);

  // Modal für "Neuer Termin" öffnen
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    const formattedSelectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setDate(formattedSelectedDate);
    setTime('12:00');
    setCategory('Business');
    setPriority('Mittel');
    setLocation('');
    setShowModal(true);
  };

  // Modal für "Termin bearbeiten" öffnen
  const handleOpenEditModal = (evt) => {
    setEditingEvent(evt);
    setTitle(evt.title || '');
    if (evt.start_datetime) {
      const parts = evt.start_datetime.split('T');
      setDate(parts[0]);
      if (parts[1]) setTime(parts[1].substring(0, 5));
    }
    setCategory(evt.category || 'Business');
    setPriority(evt.priority || 'Mittel');
    setLocation(evt.location || '');
    setShowModal(true);
  };

  // Kategorie Icons Mapping
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Business': return <Briefcase className="w-3.5 h-3.5 text-[#00f0ff]" />;
      case 'Privat': return <Home className="w-3.5 h-3.5 text-[#00ffcc]" />;
      case 'Gaming': return <Gamepad2 className="w-3.5 h-3.5 text-[#6366f1]" />;
      case 'System': return <Cpu className="w-3.5 h-3.5 text-[#fbbf24]" />;
      default: return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Prioritäts-Styles
  const priorityStyles = {
    Hoch: {
      badge: "bg-[#ff3366]/20 text-[#ff3366] border-[#ff3366]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
      dot: "bg-[#ff3366] shadow-[0_0_8px_rgba(255,51,102,0.8)]",
      border: "border-l-[#ff3366]"
    },
    Mittel: {
      badge: "bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
      dot: "bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      border: "border-l-[#fbbf24]"
    },
    Niedrig: {
      badge: "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]",
      dot: "bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.8)]",
      border: "border-l-[#00f0ff]"
    }
  };

  // Speichern
  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !date) return;

    const start_datetime = `${date}T${time}:00`;
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
        setEditingEvent(null);
        setTitle('');
        setLocation('');
      }
    } catch (err) {
      console.error('Fehler beim Speichern des Termins:', err);
    }
  };

  // Löschen
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/calendar/events/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCalendarEvents();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  
  const filteredEvents = calendarEvents.filter(evt => {
    const matchesDay = evt.start_datetime && evt.start_datetime.startsWith(selectedDateStr);
    const matchesSearch = searchFilter === '' || evt.title.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = activeCategoryFilter === 'All' || evt.category === activeCategoryFilter;
    return matchesDay && matchesSearch && matchesCat;
  });

  const monthTotalEvents = calendarEvents.filter(evt => evt.start_datetime && evt.start_datetime.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col justify-between select-none overflow-hidden bg-[#030406] text-slate-100 font-mono"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
        paddingLeft: 'calc(env(safe-area-inset-left) + 0.75rem)',
        paddingRight: 'calc(env(safe-area-inset-right) + 0.75rem)'
      }}
    >
      
      {/* ─── HEADER BAR ─── */}
      <div className="bg-white/[0.03] p-3 md:p-4 rounded-2xl md:rounded-[2.5rem] border border-white/[0.09] backdrop-blur-2xl shadow-2xl relative overflow-hidden shrink-0 mb-2">
        <div className="flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center border bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]">
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[11px] md:text-xs font-bold text-slate-100 uppercase tracking-wider truncate">Schedule Matrix</h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] md:text-[9px] font-mono bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30">
                  <Activity className="w-2.5 h-2.5 animate-pulse" /> {monthTotalEvents}
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-[#00f0ff] font-bold">{monthNames[month]} {year}</p>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-1.5">
            <div className="flex bg-[#030406]/90 rounded-xl p-0.5 border border-white/[0.08]">
              <button type="button" onClick={prevMonth} className="p-1.5 text-slate-400 hover:text-[#00f0ff] active:scale-95" title="Vorheriger Monat">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={nextMonth} className="p-1.5 text-slate-400 hover:text-[#00f0ff] active:scale-95" title="Nächster Monat">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-4 md:py-2 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] text-[#030406] font-extrabold text-xs rounded-xl transition shadow-[0_0_15px_rgba(0,240,255,0.35)] active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden md:inline ml-1.5">Neuer Termin</span>
            </button>
          </div>

        </div>

        {/* Mobile View Switcher Tabs */}
        <div className="flex md:hidden items-center justify-between mt-2.5 pt-2 border-t border-white/[0.08]">
          <div className="flex gap-1 w-full">
            <button
              type="button"
              onClick={() => setMobileTab('grid')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                mobileTab === 'grid' 
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40' 
                  : 'bg-white/[0.02] text-slate-400 border border-white/[0.06]'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Kalender</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('details')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all relative ${
                mobileTab === 'details' 
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40' 
                  : 'bg-white/[0.02] text-slate-400 border border-white/[0.06]'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Events ({filteredEvents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid + Sidebar Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2.5 min-h-0 overflow-hidden">
        
        {/* Monats-Grid (Sichtbar auf Desktop ODER wenn Tab === 'grid' auf Mobile) */}
        <div className={`${mobileTab === 'grid' ? 'flex' : 'hidden'} md:flex md:col-span-2 bg-white/[0.025] border border-white/[0.08] backdrop-blur-2xl rounded-2xl md:rounded-[2.5rem] p-3 md:p-4 flex-col justify-between overflow-y-auto scrollbar-thin`}>
          {/* Wochentage Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] md:text-[10px] text-slate-500 font-bold mb-1.5 shrink-0">
            <span>MO</span><span>DI</span><span>MI</span><span>DO</span><span>FR</span><span>SA</span><span>SO</span>
          </div>

          {/* Tage Grid */}
          <div className="grid grid-cols-7 auto-rows-fr gap-1 md:gap-1.5 flex-1 min-h-0">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-transparent rounded-xl border border-transparent min-h-[40px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = calendarEvents.filter(e => e.start_datetime && e.start_datetime.startsWith(dateKey));
              const isSelected = selectedDay === dayNum;
              const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => {
                    setSelectedDay(dayNum);
                    // Auf Mobilgeräten direkt zur Tages-Detailansicht wechseln bei Tippen
                    if (window.innerWidth < 768) setMobileTab('details');
                  }}
                  className={`relative p-1.5 md:p-2 rounded-xl md:rounded-2xl border transition-all flex flex-col justify-between items-start min-h-[48px] md:min-h-[54px] cursor-pointer active:scale-95 ${
                    isSelected 
                      ? 'bg-[#00f0ff]/20 border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[11px] md:text-xs font-bold ${
                      isToday ? 'bg-[#00f0ff] text-[#030406] px-1.5 py-0.2 rounded font-extrabold' : 'text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[8px] md:text-[9px] bg-[#030406] border border-white/[0.1] text-[#00ffcc] px-1 py-0.2 rounded">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Priority Indicators */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {dayEvents.map((evt, idx) => {
                      const pStyle = priorityStyles[evt.priority] || priorityStyles.Mittel;
                      return (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} title={evt.title} />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tages-Details Sidebar (Sichtbar auf Desktop ODER wenn Tab === 'details' auf Mobile) */}
        <div className={`${mobileTab === 'details' ? 'flex' : 'hidden'} md:flex bg-white/[0.025] border border-white/[0.08] backdrop-blur-2xl rounded-2xl md:rounded-[2.5rem] p-3 md:p-4 flex-col justify-between overflow-y-auto scrollbar-thin`}>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 border-b border-white/[0.08] pb-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {selectedDay}. {monthNames[month]} {year}
                  </h3>
                  <span className="text-[9px] md:text-[10px] text-slate-400">{filteredEvents.length} Termine gelistet</span>
                </div>
              </div>

              {/* Kategorie-Filter Chips */}
              <div className="flex overflow-x-auto no-scrollbar gap-1 py-1">
                {['All', 'Business', 'Privat', 'Gaming', 'System'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`shrink-0 text-[8px] md:text-[9px] px-2 py-1 rounded-xl border transition-all active:scale-95 ${
                      activeCategoryFilter === cat
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 font-bold'
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    {cat === 'All' ? 'Alle' : cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-[11px] text-slate-500 bg-white/[0.015] rounded-2xl border border-white/[0.06]">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-600 opacity-60" />
                Keine Termine für diesen Tag.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEvents.map((evt) => {
                  const dt = new Date(evt.start_datetime);
                  const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const pStyle = priorityStyles[evt.priority] || priorityStyles.Mittel;

                  return (
                    <div 
                      key={evt.id || evt.title} 
                      className={`bg-white/[0.03] border border-white/[0.08] ${pStyle.border} border-l-4 p-3 rounded-xl md:rounded-2xl shadow-lg transition-all`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(evt.category)}
                          <span className="text-[9px] text-slate-300 tracking-wider uppercase font-bold">
                            {evt.category || 'Allgemein'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className={`text-[8px] px-2 py-0.5 rounded-lg border ${pStyle.badge}`}>
                            {evt.priority || 'Mittel'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(evt)}
                            className="text-slate-400 hover:text-[#00f0ff] p-1 active:scale-95"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(evt.id)}
                            className="text-slate-400 hover:text-[#ff3366] p-1 active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-100 text-xs tracking-wide">{evt.title}</h4>

                      <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-white/[0.06] pt-2">
                        <div className="flex items-center gap-1 text-[#00f0ff]">
                          <Clock className="w-3 h-3" />
                          <span>{timeStr} Uhr</span>
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-1 text-[#00ffcc] truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── MODAL / BOTTOM SHEET: ERSTELLEN & BEARBEITEN ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4 animate-fade-in">
          <div className="bg-[#030406] border-t md:border border-white/[0.12] p-5 md:p-6 rounded-t-3xl md:rounded-[2.5rem] max-w-md w-full shadow-2xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#00f0ff]" />
                <span>{editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 text-[9px] uppercase">Titel / Anlass</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Maintenance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 text-[9px] uppercase">Datum</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[9px] uppercase">Uhrzeit</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 text-[9px] uppercase">Kategorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                  >
                    <option value="Business" className="bg-[#030406]">Business</option>
                    <option value="Privat" className="bg-[#030406]">Privat</option>
                    <option value="Gaming" className="bg-[#030406]">Gaming</option>
                    <option value="System" className="bg-[#030406]">System</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[9px] uppercase">Priorität</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                  >
                    <option value="Hoch" className="text-[#ff3366] bg-[#030406]">Hoch</option>
                    <option value="Mittel" className="text-[#fbbf24] bg-[#030406]">Mittel</option>
                    <option value="Niedrig" className="text-[#00f0ff] bg-[#030406]">Niedrig</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[9px] uppercase">Ort (optional)</label>
                <input
                  type="text"
                  placeholder="z.B. Serverraum"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/[0.03] text-slate-300 py-2.5 rounded-xl font-semibold border border-white/[0.08] active:scale-95"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] text-[#030406] font-extrabold py-2.5 rounded-xl active:scale-95"
                >
                  {editingEvent ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}