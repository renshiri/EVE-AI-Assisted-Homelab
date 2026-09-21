import React from 'react';
import { RefreshCw, Zap, Trash2 } from 'lucide-react';

export default function RoutineManager({
  routineTitle,
  setRoutineTitle,
  routineFrequency,
  setRoutineFrequency,
  routineDayOfWeek,
  setRoutineDayOfWeek,
  routineDayOfMonth,
  setRoutineDayOfMonth,
  routinePriority,
  setRoutinePriority,
  routineCategory,
  setRoutineCategory,
  categoriesList,
  onCreateRoutine,
  onTriggerWorker,
  routineFilter,
  setRoutineFilter,
  routines,
  onDeleteRoutine
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
      {/* Formular */}
      <div className="lg:col-span-1 bg-[#030408]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-2xl space-y-4">
        <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> NEUE ROUTINE ANLEGEN
        </h2>

        <form onSubmit={onCreateRoutine} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400">Routine Name</label>
            <input
              type="text"
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              placeholder="z.B. Backup prüfen..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400">Intervall</label>
            <select
              value={routineFrequency}
              onChange={(e) => setRoutineFrequency(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
            >
              <option value="daily">☀️ Täglich</option>
              <option value="weekly">📅 Wöchentlich</option>
              <option value="monthly">📆 Monatlich</option>
            </select>
          </div>

          {routineFrequency === 'weekly' && (
            <div>
              <label className="text-[10px] text-slate-400">Wochentag</label>
              <select
                value={routineDayOfWeek}
                onChange={(e) => setRoutineDayOfWeek(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
              >
                <option value={1}>Jeden Montag</option>
                <option value={2}>Jeden Dienstag</option>
                <option value={3}>Jeden Mittwoch</option>
                <option value={4}>Jeden Donnerstag</option>
                <option value={5}>Jeden Freitag</option>
                <option value={6}>Jeden Samstag</option>
                <option value={7}>Jeden Sonntag</option>
              </select>
            </div>
          )}

          {routineFrequency === 'monthly' && (
            <div>
              <label className="text-[10px] text-slate-400">Tag des Monats (1 - 31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={routineDayOfMonth}
                onChange={(e) => setRoutineDayOfMonth(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Priorität</label>
              <select
                value={routinePriority}
                onChange={(e) => setRoutinePriority(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
              >
                <option value="Hoch">Hoch</option>
                <option value="Mittel">Mittel</option>
                <option value="Gering">Gering</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400">Kategorie</label>
              <select
                value={routineCategory}
                onChange={(e) => setRoutineCategory(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200"
              >
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:brightness-110 cursor-pointer"
          >
            Routine Aktivieren
          </button>
        </form>

        <button
          onClick={onTriggerWorker}
          className="w-full border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" /> Worker Manuell Triggern
        </button>
      </div>

      {/* Routine Templates Liste */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Aktive Routine-Templates</h3>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
            {['all', 'daily', 'weekly', 'monthly'].map((f) => (
              <button
                key={f}
                onClick={() => setRoutineFilter(f)}
                className={`px-2 py-1 rounded text-[10px] uppercase cursor-pointer transition ${
                  routineFilter === f ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'daily' ? 'Täglich' : f === 'weekly' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {routines
            .filter(r => routineFilter === 'all' || r.frequency === routineFilter)
            .map(routine => (
              <div
                key={routine.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#05070f]/90 border border-white/10 text-xs hover:border-amber-500/30 transition"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    {routine.title}
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase">
                      {routine.frequency === 'daily' ? '☀️ Täglich' : routine.frequency === 'weekly' ? `📅 Wöchentlich (Tag ${routine.day_of_week})` : `📆 Monatlich (Tag ${routine.day_of_month})`}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Kategorie: {routine.category} • Prio: {routine.priority} • Marker: {routine.last_generated || 'Noch nie'}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteRoutine(routine.id)}
                  className="text-slate-500 hover:text-pink-400 p-1.5 rounded-lg hover:bg-pink-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}