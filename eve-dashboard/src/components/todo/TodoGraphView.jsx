import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Network, RefreshCw, Plus, CheckSquare, StickyNote, AlertCircle, ZoomIn, ZoomOut, Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function TodoGraphView({ graphData, NODE_SERVER, selectedProjectId, onNodeCreated }) {
  const rawNodes = graphData?.nodes || [];
  const rawEdges = graphData?.edges || [];

  const containerRef = useRef(null);

  const width = 6000;
  const height = 5000;
  const cx = width / 2;
  const cy = 400;

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState({});

  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState('task');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  const centerView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - cx * scale,
        y: rect.height / 3 - cy * scale
      });
    }
  };

  useEffect(() => {
    centerView();
  }, [graphData]);

  // Transformiert relationale SQLite-Felder in Kanten für das Canvas
  const { nodes, edges } = useMemo(() => {
    const generatedEdges = [...rawEdges];
    
    rawNodes.forEach(node => {
      if (node.depends_on_id) {
        generatedEdges.push({
          source: node.id,
          target: node.depends_on_id,
          type: node.is_note ? 'NOTE_OF' : 'SUBTASK_OF'
        });
      }
      if (node.project_id && !node.depends_on_id) {
        generatedEdges.push({
          source: node.id,
          target: node.project_id,
          type: 'BELONGS_TO'
        });
      }
    });

    return { nodes: rawNodes, edges: generatedEdges };
  }, [rawNodes, rawEdges]);

  const handleMouseDown = (e) => {
    if (e.button === 0 || e.button === 1) {
      const isBg = e.target === containerRef.current || e.target.tagName === 'SVG' || e.target.classList.contains('canvas-bg');
      if (e.button === 1 || isBg) {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const newScale = e.deltaY < 0 
      ? Math.min(scale * (1 + zoomIntensity), 2.0) 
      : Math.max(scale * (1 - zoomIntensity), 0.4);
    setScale(newScale);
  };

  const toggleCollapse = (e, nodeId) => {
    e.stopPropagation();
    setCollapsed(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsSubmitting(true);
    setInlineError(null);

    try {
      const payload = {
        title: quickTitle.trim(),
        category: 'System',
        priority: quickType === 'note' ? 'Info' : 'Mittel',
        is_note: quickType === 'note',
        project_id: selectedProjectId !== 'all' ? selectedProjectId : null
      };

      const res = await fetch(`${NODE_SERVER || 'http://localhost:5000'}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen');

      setQuickTitle('');
      if (onNodeCreated) onNodeCreated();
    } catch (err) {
      setInlineError('Knoten konnte nicht erstellt werden.');
      setTimeout(() => setInlineError(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nodeCoords = useMemo(() => {
    const coords = {};
    const projects = nodes.filter(n => n.is_project);
    const nonProjects = nodes.filter(n => !n.is_project);

    projects.forEach((proj, idx) => {
      const spacingX = 800;
      const startX = cx - ((projects.length - 1) * spacingX) / 2;
      coords[proj.id] = { x: startX + idx * spacingX, y: cy };
    });

    nonProjects.forEach((node, idx) => {
      const parentId = node.depends_on_id || node.project_id;
      const parentCoord = coords[parentId] || { x: cx, y: cy };
      coords[node.id] = {
        x: parentCoord.x + ((idx % 5) - 2) * 220,
        y: parentCoord.y + 250 + Math.floor(idx / 5) * 150
      };
    });

    return coords;
  }, [nodes]);

  return (
    <div className="bg-[#030408]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-2xl space-y-4 font-mono select-none relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-xs font-bold text-pink-400 flex items-center gap-2">
          <Network className="w-4 h-4" /> UNENDLICHE MINDMAP-HIERARCHIE
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-white/10 px-2 py-1 rounded-lg text-xs text-slate-300">
            <button onClick={() => setScale(s => Math.min(s + 0.2, 2.0))} className="hover:text-white cursor-pointer px-1"><ZoomIn className="w-3.5 h-3.5" /></button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.2, 0.4))} className="hover:text-white cursor-pointer px-1"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={centerView} className="hover:text-cyan-400 cursor-pointer px-1 flex items-center gap-1 text-[10px]"><Target className="w-3.5 h-3.5" /> Mitte</button>
          </div>
          <button onClick={onNodeCreated} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-lg">
            <RefreshCw className="w-3 h-3" /> Neu laden
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="canvas-bg w-full h-[750px] bg-slate-950/95 rounded-xl border border-white/10 relative overflow-hidden shadow-inner cursor-grab active:cursor-grabbing"
      >
        <div className="absolute top-4 left-4 z-40 bg-[#05070f]/95 border border-cyan-500/30 p-3 rounded-xl backdrop-blur-md shadow-2xl space-y-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
            <Plus className="w-3 h-3" /> Quick-Add im Canvas:
          </div>
          <form onSubmit={handleQuickCreate} className="flex items-center gap-2">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Task Name..."
              className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 w-44"
            />
            <button type="submit" disabled={isSubmitting} className="bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs hover:brightness-110 cursor-pointer">+</button>
          </form>
        </div>

        <div className="absolute origin-top-left pointer-events-none" style={{ width: `${width}px`, height: `${height}px`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
          <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox={`0 0 ${width} ${height}`}>
            {edges.map((edge, idx) => {
              const source = nodeCoords[edge.source];
              const target = nodeCoords[edge.target];
              if (!source || !target) return null;

              return (
                <line key={idx} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#00f0ff" strokeWidth="1.5" opacity="0.6" />
              );
            })}
          </svg>

          <div className="absolute inset-0 w-full h-full pointer-events-auto">
            {nodes.map((node) => {
              const coord = nodeCoords[node.id] || { x: cx, y: cy };
              const isProject = node.is_project;

              return (
                <div
                  key={node.id}
                  style={{ left: `${coord.x}px`, top: `${coord.y}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-3 rounded-xl border text-xs flex flex-col items-start gap-1 shadow-2xl transition max-w-[240px] ${
                    isProject
                      ? 'bg-pink-950/90 border-pink-500 text-pink-300 font-bold'
                      : 'bg-[#080d1a]/95 border-cyan-500/50 text-cyan-300'
                  }`}
                >
                  <span className="truncate w-full">{isProject ? '🚀 ' : '📌 '}{node.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}