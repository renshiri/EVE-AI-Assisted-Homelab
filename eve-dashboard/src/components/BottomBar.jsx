import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  MessageSquareText, 
  BookOpenText, 
  TrendingUp, 
  Folder, 
  Terminal, 
  Library, 
  LogOut, 
  Calendar,
  CheckSquare,
  Server,
  Shield,
  ShieldCheck,
  Search,
  ChevronUp,
  Sliders,
  Briefcase,
  Coffee,
  Settings,
  EyeOff,
  X,
  Film,
  Cpu
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function BottomBar({ activeScene, onSelectScene, onLock, isMobile }) {
  const { user } = useEVE();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [isHidden, setIsHidden] = useState(false);
  const dockRef = useRef(null);

  // Schließe Submenüs bei Klick außerhalb des Docks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dockRef.current && !dockRef.current.contains(event.target)) {
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Definition aller Navigationspunkte
  const allNavs = [
    { id: 'ambient', label: 'Core', icon: Radio, group: 'main', requiredPermission: 'read' },
    { id: 'chat', label: 'Chat', icon: MessageSquareText, group: 'main', requiredPermission: 'read' },
    { id: 'search', label: 'Suche', icon: Search, group: 'main', requiredPermission: 'read' },
    
    // Productivity / Work Group
    { id: 'todos', label: 'Todos', icon: CheckSquare, group: 'work', subgroup: 'tasks', requiredPermission: 'read' },
    { id: 'calendar', label: 'Kalender', icon: Calendar, group: 'work', subgroup: 'tasks', requiredPermission: 'read' },
    { id: 'research', label: 'Reports', icon: BookOpenText, group: 'work', subgroup: 'analytics', requiredPermission: 'read' },
    { id: 'bazaar', label: 'Bazaar', icon: TrendingUp, group: 'work', subgroup: 'analytics', requiredPermission: 'read' },
    { id: 'video', label: 'Video Studio', icon: Film, group: 'work', subgroup: 'content', requiredPermission: 'read' },
    
    // Admin / System Suite
    { id: 'library', label: 'Medien', icon: Library, group: 'admin', subgroup: 'content', requiredRole: 'admin' },
    { id: 'files', label: 'Dateien', icon: Folder, group: 'admin', subgroup: 'content', requiredRole: 'admin' },
    { id: 'server_control', label: 'Core Control', icon: Cpu, group: 'admin', subgroup: 'dev', requiredRole: 'admin' },
    { id: 'service', label: 'Dienste', icon: Server, group: 'admin', subgroup: 'dev', requiredRole: 'admin' },
    { id: 'terminal', label: 'Terminal', icon: Terminal, group: 'admin', subgroup: 'dev', requiredRole: 'admin' },
    { id: 'vscode', label: 'VS Code', icon: Coffee, group: 'admin', subgroup: 'dev', requiredRole: 'admin' },
    { id: 'apps', label: 'Workspace', icon: Coffee, group: 'admin', subgroup: 'dev', requiredRole: 'admin' },
    { id: 'pihole', label: 'Pi-hole', icon: Shield, group: 'admin', subgroup: 'security', requiredRole: 'admin' },
    { id: 'rules', label: 'Regeln', icon: ShieldCheck, group: 'admin', subgroup: 'security', requiredRole: 'admin' },
  ];

  // Berechtigungsprüfung
  const checkAccess = (item) => {
    if (!user) return false;
    if (item.requiredRole && user.role !== item.requiredRole) return false;
    if (item.requiredPermission) {
      const userPermissions = user.permissions || [];
      const hasPermission = userPermissions.includes(item.requiredPermission) || userPermissions.includes('admin');
      if (!hasPermission) return false;
    }
    return true;
  };

  const mainItems = allNavs.filter(item => item.group === 'main' && checkAccess(item));
  const workItems = allNavs.filter(item => item.group === 'work' && checkAccess(item));
  const adminItems = allNavs.filter(item => item.group === 'admin' && checkAccess(item));

  const hasAdminAccess = adminItems.length > 0;
  const isWorkActive = workItems.some(i => i.id === activeScene);
  const isAdminActive = adminItems.some(i => i.id === activeScene);

  const toggleSubmenu = (menuName) => {
    setActiveSubmenu(activeSubmenu === menuName ? null : menuName);
  };

  // Verfeinerte Render-Funktion mit dynamischem Hover & Aktiv-Glow
  const renderSubmenuItems = (items, accentHex) => {
    let lastSubgroup = null;

    return items.map((item) => {
      const Icon = item.icon;
      const isActive = activeScene === item.id;
      const showDivider = lastSubgroup && item.subgroup && lastSubgroup !== item.subgroup;
      lastSubgroup = item.subgroup || lastSubgroup;

      return (
        <React.Fragment key={item.id}>
          {showDivider && <div className="my-1 border-t border-white/10" />}
          <button
            onClick={() => { onSelectScene(item.id); setActiveSubmenu(null); }}
            style={
              isActive 
                ? { 
                    backgroundColor: `${accentHex}1A`, 
                    borderColor: `${accentHex}60`, 
                    color: accentHex,
                    boxShadow: `0 0 12px ${accentHex}20`
                  } 
                : {}
            }
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 group ${
              isActive 
                ? 'border shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)] font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Icon 
              className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" 
              style={{ color: isActive ? accentHex : '#94a3b8' }} 
            />
            <span className="truncate">{item.label}</span>
          </button>
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {/* ─── MOBILE BOTTOM SHEET BACKDROP ─── */}
      {activeSubmenu && isMobile && (
        <div 
          onClick={() => setActiveSubmenu(null)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      <div 
        ref={dockRef}
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-50 transition-transform duration-500 ease-in-out max-w-full ${
          isHidden ? 'translate-y-[calc(100%-12px)] hover:translate-y-0' : 'translate-y-0'
        }`}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)'
        }}
      >
        {/* Visual Marker bei eingeklapptem Zustand */}
        {isHidden && (
          <div 
            onClick={() => setIsHidden(false)}
            className="w-16 h-1 bg-[#00f0ff]/50 hover:bg-[#00f0ff] rounded-full mx-auto mb-2 cursor-pointer animate-pulse transition-colors" 
          />
        )}

        {/* ─── MAIN DOCK CONTAINER ─── */}
        <nav className="bg-[#030406]/80 border border-white/[0.12] px-2 md:px-4 py-1.5 md:py-2.5 rounded-[1.75rem] md:rounded-[2rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center gap-1 md:gap-2 select-none relative">
          
          {/* Haupt-Apps */}
          <div className="flex items-center gap-1 border-r border-white/[0.08] pr-1.5 md:pr-2">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScene === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelectScene(item.id); setActiveSubmenu(null); }}
                  className={`group relative px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
                    isActive 
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]' : ''}`} />
                  <span className="text-[8px] md:text-[9px] font-semibold tracking-wider mt-0.5 md:mt-1">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Workspace Button */}
          {workItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => toggleSubmenu('work')}
                className={`group px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border active:scale-95 ${
                  isWorkActive || activeSubmenu === 'work'
                    ? 'bg-[#6366f1]/20 text-[#00ffcc] border-[#6366f1]/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border-transparent'
                }`}
              >
                <div className="flex items-center gap-0.5 md:gap-1">
                  <Briefcase className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${activeSubmenu === 'work' ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-[8px] md:text-[9px] font-semibold tracking-wider mt-0.5 md:mt-1">Work</span>
              </button>

              {/* Submenu Popover / Mobile Sheet */}
              {activeSubmenu === 'work' && (
                <div className={`
                  ${isMobile 
                    ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl p-5 bg-[#030406]/98 border-t border-white/20 z-50 animate-in slide-in-from-bottom duration-300' 
                    : 'absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#030406]/95 border border-white/15 p-2 rounded-2xl backdrop-blur-3xl shadow-2xl min-w-[170px] z-50'
                  }
                `}>
                  <div className="flex justify-between items-center px-2 py-1 border-b border-white/10 mb-2">
                    <span className="text-[10px] font-bold text-[#00ffcc] uppercase tracking-widest font-mono">Workspace</span>
                    {isMobile && <X className="w-4 h-4 text-slate-400 cursor-pointer" onClick={() => setActiveSubmenu(null)} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    {renderSubmenuItems(workItems, '#00ffcc')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Suite Button */}
          {hasAdminAccess && (
            <div className="relative">
              <button
                onClick={() => toggleSubmenu('admin')}
                className={`group px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border active:scale-95 ${
                  isAdminActive || activeSubmenu === 'admin'
                    ? 'bg-[#ff3366]/20 text-[#ff3366] border-[#ff3366]/50 shadow-[0_0_15px_rgba(255,51,102,0.3)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border-transparent'
                }`}
              >
                <div className="flex items-center gap-0.5 md:gap-1">
                  <Sliders className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${activeSubmenu === 'admin' ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-[8px] md:text-[9px] font-semibold tracking-wider mt-0.5 md:mt-1">Admin</span>
              </button>

              {/* Admin Submenu Popover / Mobile Sheet */}
              {activeSubmenu === 'admin' && (
                <div className={`
                  ${isMobile 
                    ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl p-5 bg-[#030406]/98 border-t border-white/20 z-50 animate-in slide-in-from-bottom duration-300' 
                    : 'absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#030406]/95 border border-white/15 p-2 rounded-2xl backdrop-blur-3xl shadow-2xl min-w-[180px] z-50'
                  }
                `}>
                  <div className="flex justify-between items-center px-2 py-1 border-b border-white/10 mb-2">
                    <span className="text-[10px] font-bold text-[#ff3366] uppercase tracking-widest font-mono">System Suite</span>
                    {isMobile && <X className="w-4 h-4 text-slate-400 cursor-pointer" onClick={() => setActiveSubmenu(null)} />}
                  </div>
                  <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
                    {renderSubmenuItems(adminItems, '#ff3366')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Button */}
          <div className="relative border-l border-white/[0.08] pl-1.5 md:pl-2">
            <button
              onClick={() => toggleSubmenu('system')}
              className={`group px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border active:scale-95 ${
                activeSubmenu === 'system'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border-transparent'
              }`}
            >
              <div className="flex items-center gap-0.5 md:gap-1">
                <Settings className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${activeSubmenu === 'system' ? 'rotate-180' : ''}`} />
              </div>
              <span className="text-[8px] md:text-[9px] font-semibold tracking-wider mt-0.5 md:mt-1">System</span>
            </button>

            {/* System Submenu Popover / Mobile Sheet */}
            {activeSubmenu === 'system' && (
              <div className={`
                ${isMobile 
                  ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl p-5 bg-[#030406]/98 border-t border-white/20 z-50 animate-in slide-in-from-bottom duration-300' 
                  : 'absolute bottom-16 right-0 bg-[#030406]/95 border border-white/15 p-2 rounded-2xl backdrop-blur-3xl shadow-2xl min-w-[170px] z-50'
                }
              `}>
                <div className="flex justify-between items-center px-2 py-1 border-b border-white/10 mb-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Optionen</span>
                  {isMobile && <X className="w-4 h-4 text-slate-400 cursor-pointer" onClick={() => setActiveSubmenu(null)} />}
                </div>
                
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { setIsHidden(true); setActiveSubmenu(null); }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer active:scale-95 group"
                  >
                    <EyeOff className="w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:scale-110" />
                    <span>Dock verbergen</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    onClick={() => { onLock(); setActiveSubmenu(null); }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#ff3366] hover:bg-[#ff3366]/10 transition-all cursor-pointer active:scale-95 group"
                  >
                    <LogOut className="w-4 h-4 text-[#ff3366] transition-transform duration-200 group-hover:scale-110" />
                    <span>Sperren</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </nav>
      </div>
    </>
  );
}