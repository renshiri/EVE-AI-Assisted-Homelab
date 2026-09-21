import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, AlertCircle } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

import TodoHeader from '../components/todo/TodoHeader';
import CreateNodeForm from '../components/todo/CreateNodeForm';
import TodoList from '../components/todo/TodoList';
import TodoGraphView from '../components/todo/TodoGraphView';
import RoutineManager from '../components/todo/RoutineManager';

export default function TodoScene() {
  const eveContext = useEVE() || {};
  const NODE_SERVER = eveContext.NODE_SERVER || 'http://localhost:5000';

  const inputRef = useRef(null);

  // States
  const [todos, setTodos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [routines, setRoutines] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  
  // Controls & Error Management
  const [activeTab, setActiveTab] = useState('list');
  const [filterMode, setFilterMode] = useState('ready');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [routineFilter, setRoutineFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState(null);

  // Form States - Todo / Notiz
  const [nodeType, setNodeType] = useState('task');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Mittel');
  const [category, setCategory] = useState('System');
  const [dependsOnId, setDependsOnId] = useState('');
  const [assignedProject, setAssignedProject] = useState('');

  // Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjColor, setNewProjColor] = useState('#00f0ff');

  // Routine Form States
  const [routineTitle, setRoutineTitle] = useState('');
  const [routinePriority, setRoutinePriority] = useState('Mittel');
  const [routineCategory, setRoutineCategory] = useState('System');
  const [routineFrequency, setRoutineFrequency] = useState('daily');
  const [routineDayOfWeek, setRoutineDayOfWeek] = useState(1);
  const [routineDayOfMonth, setRoutineDayOfMonth] = useState(1);

  const [loading, setLoading] = useState(false);
  const categoriesList = ['System', 'Work', 'Privat', 'Allgemein', 'Techstack'];

  // Hilfsfunktion zum sicheren Setzen von Fehlern (Auto-Dismiss nach 6 Sekunden)
  const triggerError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // --- API CALL HANDLERS MIT ROBUSTEM ERROR HANDLING ---

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/projects`);
      if (!res.ok) throw new Error(`HTTP Fehler! Status: ${res.status}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Fehler beim Laden der Projekte:', err);
      triggerError('Projekt-Anker konnten nicht geladen werden (Server offline?).');
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/todos?mode=${filterMode}`);
      if (!res.ok) throw new Error(`HTTP Fehler! Status: ${res.status}`);
      const data = await res.json();
      setTodos(data.todos || []);
    } catch (err) {
      console.error('Fehler beim Laden der Todos:', err);
      triggerError('Aufgaben & Notizen konnten nicht synchronisiert werden.');
    }
  };

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/routines`);
      if (!res.ok) throw new Error(`HTTP Fehler! Status: ${res.status}`);
      const data = await res.json();
      setRoutines(data.routines || []);
    } catch (err) {
      console.error('Fehler beim Laden der Routinen:', err);
      triggerError('Routinen-Templates konnten nicht geladen werden.');
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/todos/graph?project_id=${selectedProjectId}`);
      if (!res.ok) throw new Error(`HTTP Fehler! Status: ${res.status}`);
      const data = await res.json();
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (err) {
      console.error('Fehler beim Laden des Graphen:', err);
      triggerError('Graphen-Topologie konnte nicht aufgebaut werden.');
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTodos();
    if (activeTab === 'routines') fetchRoutines();
    if (activeTab === 'graph') fetchGraph();
  }, [filterMode, activeTab, selectedProjectId]);

  // --- ACTIONS & MUTATIONS ---

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    try {
      const res = await fetch(`${NODE_SERVER}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjTitle.trim(), color: newProjColor }),
      });
      if (!res.ok) throw new Error('Fehler beim Erstellen des Projekts');
      
      setNewProjTitle('');
      setShowProjectModal(false);
      fetchProjects();
      if (activeTab === 'graph') fetchGraph();
    } catch (err) {
      console.error(err);
      triggerError('Projekt-Anker konnte nicht angelegt werden.');
    }
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        priority: nodeType === 'note' ? 'Info' : priority,
        is_note: nodeType === 'note',
        depends_on_id: dependsOnId || null,
        project_id: dependsOnId ? null : (assignedProject || (selectedProjectId !== 'all' ? selectedProjectId : null))
      };

      const res = await fetch(`${NODE_SERVER}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTitle('');
        setDependsOnId('');
        fetchTodos();
        if (activeTab === 'graph') fetchGraph();
      }
    } catch (err) {
      console.error('Fehler beim Erstellen:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;

    try {
      const res = await fetch(`${NODE_SERVER}/api/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: routineTitle,
          priority: routinePriority,
          category: routineCategory,
          frequency: routineFrequency,
          day_of_week: routineFrequency === 'weekly' ? Number(routineDayOfWeek) : 1,
          day_of_month: routineFrequency === 'monthly' ? Number(routineDayOfMonth) : 1
        }),
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen der Routine');

      setRoutineTitle('');
      fetchRoutines();
      fetchTodos();
    } catch (err) {
      console.error(err);
      triggerError('Routine konnte nicht aktiviert werden.');
    }
  };

  const handleTriggerWorker = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/routines/trigger`, { method: 'POST' });
      if (!res.ok) throw new Error('Worker-Trigger fehlgeschlagen');
      fetchTodos();
      fetchRoutines();
    } catch (err) {
      console.error(err);
      triggerError('Manueller Routine-Worker konnte nicht ausgeführt werden.');
    }
  };

  const handleToggleTodo = async (id, currentCompleted) => {
    try {
      const newStatus = !currentCompleted;
      const res = await fetch(`${NODE_SERVER}/api/todos/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newStatus, status: newStatus ? 'COMPLETED' : 'OPEN' }),
      });

      if (!res.ok) throw new Error('Statusänderung fehlgeschlagen');

      fetchTodos();
      if (activeTab === 'graph') fetchGraph();
    } catch (err) {
      console.error(err);
      triggerError('Status des Knotens konnte nicht aktualisiert werden.');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Löschen fehlgeschlagen');

      fetchTodos();
      if (activeTab === 'graph') fetchGraph();
    } catch (err) {
      console.error(err);
      triggerError('Knoten konnte nicht gelöscht werden.');
    }
  };

  const handleDeleteRoutine = async (id) => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/routines/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Routine löschen fehlgeschlagen');
      fetchRoutines();
    } catch (err) {
      console.error(err);
      triggerError('Routine konnte nicht entfernt werden.');
    }
  };

  // Calculations
  const taskTodos = todos.filter(t => !t.is_note && t.priority !== 'Info');
  const completedCount = taskTodos.filter(t => t.completed).length;
  const totalCount = taskTodos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const highPriorityCount = taskTodos.filter(t => !t.completed && t.priority === 'Hoch').length;

  const filteredTodos = todos.filter(todo => {
    if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && todo.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-slate-100 font-sans">
      
      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-[#030406] border border-[#ff3366]/40 p-4 rounded-2xl flex items-center gap-3 text-xs font-mono text-[#ff3366] shadow-[0_0_20px_rgba(255,51,102,0.15)] animate-pulse">
          <AlertCircle className="w-4 h-4 text-[#ff3366] shrink-0" />
          <span className="uppercase tracking-wider">{errorMessage}</span>
        </div>
      )}

      {/* 1. Header & Anker Bar */}
      <TodoHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        onOpenProjectModal={() => setShowProjectModal(true)}
        progressPercent={progressPercent}
        completedCount={completedCount}
        totalCount={totalCount}
        highPriorityCount={highPriorityCount}
      />

      {/* Projekt Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a0d14] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.9)] text-slate-100 space-y-4">
            
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
              <FolderPlus className="w-4 h-4 text-[#00f0ff]" />
              <span>NEUEN PROJEKT-ANKER ERSTELLEN</span>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 font-mono">
              <div className="space-y-1.5">
                <label className="uppercase tracking-wider font-mono text-[10px] text-slate-400">Projekt Name</label>
                <input
                  type="text"
                  value={newProjTitle}
                  onChange={(e) => setNewProjTitle(e.target.value)}
                  placeholder="z.B. EVE Core 2.0..."
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
                >
                  <span className="uppercase tracking-wider">Abbrechen</span>
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-4 py-2 text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center gap-2"
                >
                  <span className="uppercase tracking-wider">Anker Anlegen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Content Tabs */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CreateNodeForm
            inputRef={inputRef}
            nodeType={nodeType}
            setNodeType={setNodeType}
            title={title}
            setTitle={setTitle}
            priority={priority}
            setPriority={setPriority}
            category={category}
            setCategory={setCategory}
            dependsOnId={dependsOnId}
            setDependsOnId={setDependsOnId}
            assignedProject={assignedProject}
            setAssignedProject={setAssignedProject}
            projects={projects}
            todos={todos}
            categoriesList={categoriesList}
            loading={loading}
            onSubmit={handleCreateTodo}
          />
          <div className="lg:col-span-2">
            <TodoList
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              filterPriority={filterPriority}
              setFilterPriority={setFilterPriority}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              categoriesList={categoriesList}
              filteredTodos={filteredTodos}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
            />
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
        <TodoGraphView 
          graphData={graphData} 
          onRefresh={fetchGraph} 
          onNodeCreated={() => { fetchTodos(); fetchGraph(); }}
          selectedProjectId={selectedProjectId}
          NODE_SERVER={NODE_SERVER}
        />
      )}

      {activeTab === 'routines' && (
        <RoutineManager
          routineTitle={routineTitle}
          setRoutineTitle={setRoutineTitle}
          routineFrequency={routineFrequency}
          setRoutineFrequency={setRoutineFrequency}
          routineDayOfWeek={routineDayOfWeek}
          setRoutineDayOfWeek={setRoutineDayOfWeek}
          routineDayOfMonth={routineDayOfMonth}
          setRoutineDayOfMonth={setRoutineDayOfMonth}
          routinePriority={routinePriority}
          setRoutinePriority={setRoutinePriority}
          routineCategory={routineCategory}
          setRoutineCategory={setRoutineCategory}
          categoriesList={categoriesList}
          onCreateRoutine={handleCreateRoutine}
          onTriggerWorker={handleTriggerWorker}
          routineFilter={routineFilter}
          setRoutineFilter={setRoutineFilter}
          routines={routines}
          onDeleteRoutine={handleDeleteRoutine}
        />
      )}
    </div>
  );
}