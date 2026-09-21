import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, 
  Pencil, Clock, MapPin, Tag, Search, Briefcase, Home, 
  Gamepad2, Cpu, Sparkles, Activity, Repeat 
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function CalendarScene() {
  const { calendarEvents, fetchCalendarEvents, NODE_SERVER } = useEVE();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
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
  const [recurrence, setRecurrence] = useState('none');

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
    setRecurrence('none');
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
    setRecurrence(evt.recurrence || 'none');
    setShowModal(true);
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Business': return <Briefcase className="w-3.5 h-3.5 text-[#00f0ff]" />;
      case 'Privat': return <Home className="w-3.5 h-3.5 text-[#00ffcc]" />;
      case 'Gaming': return <Gamepad2 className="w-3.5 h-3.5 text-[#6366f1]" />;
      case 'System': return <Cpu className="w-3.5 h-3.5 text-[#fbbf24]" />;
      default: return <Tag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const priorityStyles = {
    Hoch: {
      badge: "bg-[#ff3366]/20 text-[#ff3366] border-[#ff3366]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7),0_0_10px_rgba(255,51,102,0.3)]",
      dot: "bg-[#ff3366] shadow-[0_0_10px_rgba(255,51,102,0.8)]",
      border: "border-l-[#ff3366]"
    },
    Mittel: {
      badge: "bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7),0_0_10px_rgba(251,191,36,0.3)]",
      dot: "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.8)]",
      border: "border-l-[#fbbf24]"
    },
    Niedrig: {
      badge: "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7),0_0_10px_rgba(0,240,255,0.3)]",
      dot: "bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)]",
      border: "border-l-[#00f0ff]"
    }
  };

  // Speichern (JSON Payload an SQLite Backend senden)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !date) return;

    const start_datetime = `${date}T${time}:00`;
    const payload = {
      title,
      start_datetime,
      category,
      priority,
      location,
      recurrence
    };

    try {
      let res;
      if (editingEvent) {
        res = await fetch(`${NODE_SERVER}/api/calendar/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${NODE_SERVER}/api/calendar/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
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
    <div className="animate-fade-in h-[calc(100vh-100px)] flex flex-col gap-3.5 select-none overflow-hidden pb-16 font-mono">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap justify-between items-center bg-white/[0.03] p-4 rounded-[2.5rem] border border-white/[0.09] backdrop-blur-2xl shadow-[16px_16px_40px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] relative overflow-hidden shrink-0 gap-3">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center border bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Neural Schedule Matrix</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[9px] font-mono bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                <Activity className="w-3 h-3 animate-pulse" /> {monthTotalEvents} Events im Monat
              </span>
            </div>
            <p className="text-[11px] text-[#00f0ff] font-bold mt-0.5">{monthNames[month]} {year}</p>
          </div>
        </div>

        <div className="relative flex-1 max-w-xs hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Termine durchsuchen..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#030406]/90 border border-white/[0.08] rounded-2xl py-2.5 pl-10 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="flex bg-[#030406]/90 rounded-2xl p-1 border border-white/[0.08] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]">
            <button type="button" onClick={prevMonth} className="p-2 text-slate-400 hover:text-[#00f0ff] transition cursor-pointer" title="Vorheriger Monat">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={nextMonth} className="p-2 text-slate-400 hover:text-[#00f0ff] transition cursor-pointer" title="Nächster Monat">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold text-xs px-4 py-2.5 rounded-2xl transition shadow-[0_0_20px_rgba(0,240,255,0.35)] border border-[#00f0ff]/40 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Neuer Termin</span>
          </button>
        </div>
      </div>

      {/* Main Grid + Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3.5 overflow-hidden min-h-0">
        
        {/* Monats-Grid */}
        <div className="lg:col-span-2 bg-white/[0.025] border border-white/[0.08] backdrop-blur-2xl shadow-[12px_12px_32px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] rounded-[2.5rem] p-4 flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 font-bold mb-2 shrink-0 tracking-wider">
            <span>MO</span><span>DI</span><span>MI</span><span>DO</span><span>FR</span><span>SA</span><span>SO</span>
          </div>

          <div className="grid grid-cols-7 auto-rows-fr gap-1.5 flex-1 min-h-0">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-transparent rounded-2xl border border-transparent min-h-[46px]" />
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
                  onClick={() => setSelectedDay(dayNum)}
                  className={`relative p-2.5 rounded-2xl border transition-all flex flex-col justify-between items-start min-h-[54px] cursor-pointer group ${
                    isSelected 
                      ? 'bg-[#00f0ff]/20 border-[#00f0ff]/50 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.85),0_0_15px_rgba(0,240,255,0.3)]' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] shadow-[4px_4px_10px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${
                      isToday ? 'bg-[#00f0ff] text-[#030406] px-2 py-0.5 rounded-lg font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.8)]' : 'text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] bg-[#030406] border border-white/[0.1] text-[#00ffcc] px-1.5 py-0.5 rounded-md shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {dayEvents.map((evt, idx) => {
                      const pStyle = priorityStyles[evt.priority] || priorityStyles.Mittel;
                      return (
                        <span key={idx} className={`w-2 h-2 rounded-full ${pStyle.dot}`} title={evt.title} />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tages-Details Sidebar */}
        <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-2xl shadow-[12px_12px_32px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] rounded-[2.5rem] p-4 flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <div className="space-y-3.5">
            <div className="flex flex-col gap-2.5 border-b border-white/[0.08] pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {selectedDay}. {monthNames[month]} {year}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{filteredEvents.length} Einträge aktiv</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['All', 'Business', 'Privat', 'Gaming', 'System'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`text-[9px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      activeCategoryFilter === cat
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50 font-bold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]'
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    {cat === 'All' ? 'Alle' : cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-500 bg-white/[0.015] rounded-3xl border border-white/[0.06] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]">
                <Sparkles className="w-7 h-7 mx-auto mb-2.5 text-slate-600 opacity-60" />
                Keine Termine für diesen Filter gefunden.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((evt) => {
                  const dt = new Date(evt.start_datetime);
                  const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const pStyle = priorityStyles[evt.priority] || priorityStyles.Mittel;

                  return (
                    <div 
                      key={evt.id || evt.title} 
                      className={`bg-white/[0.03] border border-white/[0.08] ${pStyle.border} border-l-4 p-4 rounded-2xl shadow-[10px_10px_30px_rgba(0,0,0,0.7)] group hover:border-[#00f0ff]/40 transition-all`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(evt.category)}
                          <span className="text-[10px] text-slate-300 tracking-wider uppercase font-bold">
                            {evt.category || 'Allgemein'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {evt.recurrence && evt.recurrence !== 'none' && (
                            <span className="text-[9px] px-2 py-0.5 rounded-xl border bg-indigo-500/20 text-indigo-300 border-indigo-500/40 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5" />
                              {evt.recurrence}
                            </span>
                          )}
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-xl border ${pStyle.badge}`}>
                            {evt.priority || 'Mittel'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(evt)}
                            className="text-slate-400 hover:text-[#00f0ff] transition p-1 cursor-pointer"
                            title="Termin bearbeiten"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(evt.id)}
                            className="text-slate-400 hover:text-[#ff3366] transition p-1 cursor-pointer"
                            title="Termin löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-100 text-xs mt-1 tracking-wide">{evt.title}</h4>

                      <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                        <div className="flex items-center gap-1.5 text-[#00f0ff]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeStr} Uhr</span>
                        </div>
                        {evt.location && (
                          <div className="flex items-center gap-1.5 text-[#00ffcc] truncate max-w-[140px]">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
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

      {/* MODAL: ERSTELLEN & BEARBEITEN */}
      {showModal && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#030406] border border-white/[0.12] p-6 rounded-[2.5rem] max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-100 font-mono uppercase flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#00f0ff]" />
              <span>{editingEvent ? 'Termin bearbeiten' : 'Neuen Termin eintragen'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1.5 text-[10px]">Titel / Anlass</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. System Maintenance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Datum</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Uhrzeit</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Kategorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] cursor-pointer"
                  >
                    <option value="Business" className="bg-[#030406]">Business</option>
                    <option value="Privat" className="bg-[#030406]">Privat</option>
                    <option value="Gaming" className="bg-[#030406]">Gaming</option>
                    <option value="System" className="bg-[#030406]">System</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Priorität</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] font-semibold cursor-pointer"
                  >
                    <option value="Hoch" className="text-[#ff3366] bg-[#030406]">Hoch</option>
                    <option value="Mittel" className="text-[#fbbf24] bg-[#030406]">Mittel</option>
                    <option value="Niedrig" className="text-[#00f0ff] bg-[#030406]">Niedrig</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Wiederholung</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] cursor-pointer"
                  >
                    <option value="none" className="bg-[#030406]">Einmalig</option>
                    <option value="daily" className="bg-[#030406]">Täglich</option>
                    <option value="weekly" className="bg-[#030406]">Wöchentlich</option>
                    <option value="monthly" className="bg-[#030406]">Monatlich</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1.5 text-[10px]">Ort (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. Serverraum"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00f0ff]/60 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 py-2.5 rounded-xl font-semibold transition border border-white/[0.08] cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold py-2.5 rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
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