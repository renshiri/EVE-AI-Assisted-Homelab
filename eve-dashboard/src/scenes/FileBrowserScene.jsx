import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Folder, FileText, Download, HardDrive, ChevronRight, ArrowLeft, 
  RefreshCw, File, ShieldCheck, Upload, Loader2, FolderPlus, Trash2, X, Plus,
  MoveRight, FolderInput, Activity, Cpu, Layers, PieChart, CheckCircle2
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function FileBrowserScene() {
  const { NODE_SERVER, user, fileBrowserPath, setFileBrowserPath, fileBrowserItems, setFileBrowserItems } = useEVE();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMkdirModal, setShowMkdirModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload Progress & Modal States
  const [activeUploads, setActiveUploads] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Move-Modal States
  const [itemToMove, setItemToMove] = useState(null);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState('');
  const [moving, setMoving] = useState(false);

  const fileInputRef = useRef(null);

  const username = user?.username || 'guest';
  const isAdmin = username === 'renshiri';

  // Verzeichnisinhalte vom Server laden und im Context abspeichern
  const loadDirectory = useCallback(async (path = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/files?path=${encodeURIComponent(path)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const json = await res.json();
        setFileBrowserItems(json.files || []);
        setFileBrowserPath(json.current_path || '');
      }
    } catch (e) {
      console.error('[FileBrowser] Fehler beim Laden:', e);
    } finally {
      setLoading(false);
    }
  }, [NODE_SERVER, username, setFileBrowserItems, setFileBrowserPath]);

  // Initiales Laden nur, wenn der Context-State noch leer ist
  useEffect(() => {
    if (!fileBrowserItems || fileBrowserItems.length === 0) {
      loadDirectory('');
    }
  }, [loadDirectory, fileBrowserItems]);

  // Erweiterter Upload Handler mit Live-Vorschau, Geschwindigkeit und Dauer
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0 || !isAdmin) return;

    const fileList = Array.from(files);
    
    const initialUploads = fileList.map(file => ({
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: '0 KB/s',
      timeRemaining: 'Berechne...',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'uploading'
    }));

    setActiveUploads(initialUploads);
    setShowUploadModal(true);
    setUploading(true);

    const formData = new FormData();
    formData.append('target_path', fileBrowserPath);
    formData.append('username', username);
    fileList.forEach(file => formData.append('files', file));

    const startTime = Date.now();
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.floor(Math.random() * 15) + 5;
      if (simulatedProgress > 90) simulatedProgress = 90;

      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const transferredBytes = (simulatedProgress / 100) * fileList.reduce((acc, f) => acc + f.size, 0);
      const bytesPerSec = elapsedSeconds > 0 ? transferredBytes / elapsedSeconds : 0;
      
      const speedStr = bytesPerSec > 1024 * 1024 
        ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s` 
        : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;

      const remainingSecs = Math.max(1, Math.ceil((100 - simulatedProgress) / (simulatedProgress / elapsedSeconds || 1)));

      setActiveUploads(prev => prev.map(u => ({
        ...u,
        progress: simulatedProgress,
        speed: speedStr,
        timeRemaining: `ca. ${remainingSecs}s verbleibend`
      })));
    }, 300);

    try {
      const res = await fetch(`${NODE_SERVER}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (res.ok) {
        setActiveUploads(prev => prev.map(u => ({ ...u, progress: 100, speed: 'Abgeschlossen', timeRemaining: '0s', status: 'done' })));
        setTimeout(async () => {
          setShowUploadModal(false);
          setActiveUploads([]);
          await loadDirectory(fileBrowserPath);
        }, 1000);
      } else {
        let errorMsg = `Upload fehlgeschlagen (Status ${res.status})`;
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch (_) {
          if (res.status === 413) errorMsg = "Datei zu groß (413 Payload Too Large)!";
        }
        alert(errorMsg);
        setShowUploadModal(false);
      }
    } catch (e) {
      clearInterval(progressInterval);
      console.error('[FileBrowser] Upload-Fehler:', e);
      alert('Netzwerkfehler beim Datei-Upload.');
      setShowUploadModal(false);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Ordner erstellen
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !isAdmin) return;

    const formData = new FormData();
    formData.append('target_path', fileBrowserPath);
    formData.append('folder_name', newFolderName.trim());
    formData.append('username', username);

    try {
      const res = await fetch(`${NODE_SERVER}/api/files/mkdir`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setNewFolderName('');
        setShowMkdirModal(false);
        await loadDirectory(fileBrowserPath);
      } else {
        const errData = await res.json();
        alert(`Fehler: ${errData.detail || 'Ordner konnte nicht erstellt werden'}`);
      }
    } catch (e) {
      console.error('[FileBrowser] Mkdir-Fehler:', e);
    }
  };

  // Datei / Ordner verschieben
  const handleMoveItem = async (e) => {
    e.preventDefault();
    if (!itemToMove || !selectedMoveTarget.trim() || !isAdmin) return;

    setMoving(true);
    const srcPath = fileBrowserPath === '/' ? `/${itemToMove.name}` : `${fileBrowserPath}/${itemToMove.name}`;
    
    let destPath = selectedMoveTarget.trim();
    if (!destPath.startsWith('/')) {
      destPath = fileBrowserPath === '/' ? `/${destPath}` : `${fileBrowserPath}/${destPath}`;
    }

    const formData = new FormData();
    formData.append('src_path', srcPath);
    formData.append('dest_path', destPath);
    formData.append('username', username);

    try {
      const res = await fetch(`${NODE_SERVER}/api/files/move`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setItemToMove(null);
        setSelectedMoveTarget('');
        await loadDirectory(fileBrowserPath);
      } else {
        const errData = await res.json();
        alert(`Verschieben fehlgeschlagen: ${errData.detail || 'Fehler'}`);
      }
    } catch (e) {
      console.error('[FileBrowser] Move-Fehler:', e);
      alert('Fehler beim Verschieben des Elements.');
    } finally {
      setMoving(false);
    }
  };

  // Datei / Ordner löschen
  const handleDeleteItem = async (itemName, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!confirm(`Möchtest du "${itemName}" wirklich dauerhaft löschen?`)) return;

    const itemFullPath = fileBrowserPath === '/' ? `/${itemName}` : `${fileBrowserPath}/${itemName}`;
    try {
      const res = await fetch(`${NODE_SERVER}/api/files/delete?path=${encodeURIComponent(itemFullPath)}&username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadDirectory(fileBrowserPath);
      } else {
        const errData = await res.json();
        alert(`Löschen fehlgeschlagen: ${errData.detail || 'Fehler'}`);
      }
    } catch (e) {
      console.error('[FileBrowser] Delete-Fehler:', e);
    }
  };

  const handleOpenFolder = (folderName) => {
    const newPath = fileBrowserPath === '/' ? `/${folderName}` : `${fileBrowserPath}/${folderName}`;
    loadDirectory(newPath);
  };

  const handleGoBack = () => {
    if (!fileBrowserPath || fileBrowserPath === '/' || (!isAdmin && fileBrowserPath === '/nas/recherchen')) return;
    const pathParts = fileBrowserPath.split('/').filter(Boolean);
    pathParts.pop();
    const parentPath = '/' + pathParts.join('/');
    loadDirectory(parentPath);
  };

  const handleBreadcrumbClick = (index) => {
    const pathParts = fileBrowserPath.split('/').filter(Boolean);
    if (index === -1) {
      loadDirectory(isAdmin ? '/' : '');
      return;
    }
    const targetPath = '/' + pathParts.slice(0, index + 1).join('/');
    loadDirectory(targetPath);
  };

  const breadcrumbs = fileBrowserPath.split('/').filter(Boolean);
  const availableSubfolders = fileBrowserItems.filter(i => i.is_dir && i.name !== itemToMove?.name);

  // Metriken berechnen
  const totalItems = fileBrowserItems.length;
  const folderCount = fileBrowserItems.filter(i => i.is_dir).length;
  const fileCount = totalItems - folderCount;
  const folderRatio = totalItems > 0 ? (folderCount / totalItems) * 100 : 0;

  return (
    <div className="animate-fade-in h-[calc(100vh-100px)] flex flex-col gap-3.5 relative select-none pb-16 font-mono">
      {isAdmin && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
          multiple
          className="hidden"
        />
      )}

      {/* ─── HEADER & METRIKEN BAR (Mit fixiertem Clipping gegen Ecken-Glitches) ─── */}
      <div className="bg-white/[0.03] p-4 rounded-[2.5rem] border border-white/[0.09] backdrop-blur-2xl shadow-[16px_16px_40px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] flex flex-col gap-3.5 relative overflow-hidden shrink-0 transform-gpu [clip-path:inset(0_round_2.5rem)]">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#00f0ff]/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)] ${isAdmin ? 'bg-[#fbbf24]/10 border-[#fbbf24]/30 text-[#fbbf24]' : 'bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]'}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  {isAdmin ? 'System Root Explorer' : 'NAS File Explorer'}
                </h2>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[9px] font-mono bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                    <ShieldCheck className="w-3 h-3" /> Root Access
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Angemeldet als: <strong className="text-slate-200">{username}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setShowMkdirModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-mono rounded-xl text-xs transition border border-white/[0.08] shadow-[4px_4px_10px_rgba(0,0,0,0.4)] cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>Ordner +</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 disabled:opacity-40 text-[#030406] font-extrabold rounded-xl text-xs transition shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-[#00f0ff]/40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Lädt...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 rounded-xl text-xs transition border border-white/[0.08] shadow-[4px_4px_10px_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => loadDirectory(fileBrowserPath)}
              className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-[#00f0ff] rounded-xl transition border border-white/[0.08] shadow-[4px_4px_10px_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── LIVE METRIC BAR & LADEBALKEN ─── */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06] relative z-10">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00ffcc] animate-pulse" />
              <span>Directory Index Matrix ({totalItems} Elemente)</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[#00f0ff]">{folderCount} Ordner</span>
              <span className="text-white/20">|</span>
              <span className="text-[#6366f1]">{fileCount} Dateien</span>
            </div>
          </div>
          <div className="w-full h-2 bg-[#030406] rounded-full overflow-hidden border border-white/[0.04] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9)] flex">
            <div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] transition-all duration-500 shadow-[0_0_10px_rgba(0,240,255,0.7)]" style={{ width: `${folderRatio}%` }} />
            <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#00ffcc] transition-all duration-500 shadow-[0_0_10px_rgba(0,255,204,0.7)]" style={{ width: `${100 - folderRatio}%` }} />
          </div>
        </div>

        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs bg-[#030406]/90 px-3.5 py-2.5 rounded-2xl border border-white/[0.08] text-slate-400 overflow-x-auto shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] relative z-10">
          <button 
            type="button"
            onClick={() => handleBreadcrumbClick(-1)}
            className="hover:text-[#00f0ff] transition font-bold"
          >
            {isAdmin ? '/' : '/nas/recherchen'}
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:text-[#00f0ff] transition ${idx === breadcrumbs.length - 1 ? 'text-[#00f0ff] font-bold' : ''}`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── GRID VIEW ─── */}
      <div 
        className="flex-1 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-white/10 min-h-0"
        onDragOver={(e) => isAdmin && e.preventDefault()}
        onDrop={(e) => {
          if (!isAdmin) return;
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
          }
        }}
      >
        {fileBrowserItems.length === 0 ? (
          <div 
            onClick={() => isAdmin && fileInputRef.current?.click()}
            className={`h-full flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3 bg-white/[0.02] rounded-[2.5rem] border border-white/[0.07] backdrop-blur-2xl shadow-[12px_12px_32px_rgba(0,0,0,0.8)] transition-colors transform-gpu overflow-hidden ${isAdmin ? 'hover:border-[#00f0ff]/40 cursor-pointer' : ''}`}
          >
            <Folder className="w-9 h-9 text-slate-600" />
            <span>
              {isAdmin 
                ? 'Dieser Ordner ist leer. Klicke hier oder ziehe Dateien hinein, um sie hochzuladen.' 
                : 'Dieser Ordner ist leer.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fileBrowserItems.map((item, i) => {
              const itemRelativePath = fileBrowserPath === '/' ? `/${item.name}` : `${fileBrowserPath}/${item.name}`;

              return (
                <div
                  key={i}
                  className={`bg-white/[0.025] border border-white/[0.08] hover:border-[#00f0ff]/40 hover:bg-white/[0.05] p-4.5 rounded-[2.5rem] flex flex-col justify-between transition-all backdrop-blur-2xl shadow-[12px_12px_32px_rgba(0,0,0,0.85),-8px_-8px_24px_rgba(255,255,255,0.025)] group relative overflow-hidden transform-gpu [clip-path:inset(0_round_2.5rem)] ${
                    item.is_dir 
                      ? 'cursor-pointer' 
                      : ''
                  }`}
                  onClick={() => item.is_dir && handleOpenFolder(item.name)}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)] ${
                        item.is_dir 
                          ? 'bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24] group-hover:scale-105 transition-transform' 
                          : item.type === 'pdf'
                          ? 'bg-[#ff3366]/10 border-[#ff3366]/20 text-[#ff3366]'
                          : 'bg-[#00f0ff]/10 border-[#00f0ff]/20 text-[#00f0ff]'
                      }`}>
                        {item.is_dir ? (
                          <Folder className="w-5 h-5 fill-[#fbbf24]/20" />
                        ) : item.type === 'pdf' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <File className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-[#030406]/80 px-2.5 py-1 rounded-xl border border-white/[0.07] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                          {item.size}
                        </span>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToMove(item);
                                setSelectedMoveTarget('');
                              }}
                              className="p-1.5 hover:bg-[#6366f1]/20 text-slate-400 hover:text-[#6366f1] rounded-xl transition-colors cursor-pointer"
                              title="Verschieben"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(item.name, e)}
                              className="p-1.5 hover:bg-[#ff3366]/20 text-slate-400 hover:text-[#ff3366] rounded-xl transition-colors cursor-pointer"
                              title="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-xs text-slate-100 truncate mb-1" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500">
                      Geändert: {item.date}
                    </p>
                  </div>

                  {!item.is_dir && (
                    <a
                      href={`${NODE_SERVER}/api/files/download?path=${encodeURIComponent(itemRelativePath)}&username=${encodeURIComponent(username)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 w-full py-2.5 bg-white/[0.03] hover:bg-[#00f0ff]/15 hover:text-[#00f0ff] text-slate-300 rounded-xl text-[10px] font-mono font-bold transition flex items-center justify-center gap-1.5 border border-white/[0.08] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.6)]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── UPLOAD LIVE PROGRESS MODAL ─── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#030406] border border-white/[0.12] p-6 rounded-[2.5rem] max-w-lg w-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden transform-gpu [clip-path:inset(0_round_2.5rem)]">
            
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]">
                  <Upload className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wider">
                    Datei-Upload läuft
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Übertrage in <span className="text-[#00f0ff]">{fileBrowserPath || '/'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
              {activeUploads.map((up, index) => (
                <div key={index} className="bg-white/[0.025] border border-white/[0.08] p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)] overflow-hidden transform-gpu">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {up.preview ? (
                        <img src={up.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#00f0ff]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-100 truncate">{up.name}</span>
                        <span className="text-[10px] text-[#00ffcc] font-bold">{up.progress}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span className="text-[#00f0ff]">{up.speed}</span>
                        <span>{up.timeRemaining}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-[#030406] rounded-full overflow-hidden border border-white/[0.04] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.9)]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                      style={{ width: `${up.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] text-slate-500 font-mono italic">
                Bitte das Fenster während des Uploads nicht schließen.
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: ORDNER ERSTELLEN ─── */}
      {showMkdirModal && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#030406] border border-white/[0.12] p-6 rounded-[2.5rem] max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 overflow-hidden transform-gpu [clip-path:inset(0_round_2.5rem)]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#00f0ff]" />
                Neuen Ordner erstellen
              </h3>
              <button 
                type="button"
                onClick={() => setShowMkdirModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="flex flex-col gap-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ordnername eingeben..."
                autoFocus
                className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl py-3 px-4 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMkdirModal(false)}
                  className="px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 rounded-xl text-xs font-mono transition border border-white/[0.08]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 disabled:opacity-40 text-[#030406] font-extrabold rounded-xl text-xs font-mono transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ELEMENT VERSCHIEBEN ─── */}
      {itemToMove && (
        <div className="fixed inset-0 bg-[#030406]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#030406] border border-white/[0.12] p-6 rounded-[2.5rem] max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 overflow-hidden transform-gpu [clip-path:inset(0_round_2.5rem)]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-100 font-mono uppercase flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-[#6366f1]" />
                Element verschieben
              </h3>
              <button 
                type="button"
                onClick={() => setItemToMove(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-mono text-slate-300 bg-[#030406] p-3.5 rounded-2xl border border-white/[0.08] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
              Verschiebe: <strong className="text-[#00f0ff]">{itemToMove.name}</strong>
            </div>

            <form onSubmit={handleMoveItem} className="flex flex-col gap-3">
              {availableSubfolders.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-slate-400">Zielordner wählen:</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {availableSubfolders.map((folder, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMoveTarget(folder.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition flex items-center gap-1.5 cursor-pointer ${
                          selectedMoveTarget === folder.name
                            ? 'bg-[#6366f1]/25 text-[#00ffcc] border-[#6366f1]/50 font-bold shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]'
                            : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-[#fbbf24]" />
                        <span>{folder.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400">Oder Zielpfad eingeben:</label>
                <input
                  type="text"
                  value={selectedMoveTarget}
                  onChange={(e) => setSelectedMoveTarget(e.target.value)}
                  placeholder="Ordnername oder absoluter Pfad..."
                  className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl py-3 px-4 text-xs text-slate-100 font-mono focus:outline-none focus:border-[#6366f1]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToMove(null)}
                  className="px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 rounded-xl text-xs font-mono transition border border-white/[0.08]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!selectedMoveTarget.trim() || moving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#6366f1] to-[#00f0ff] hover:from-[#6366f1]/90 hover:to-[#00f0ff]/90 disabled:opacity-40 text-[#030406] font-extrabold rounded-xl text-xs font-mono transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  {moving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MoveRight className="w-3.5 h-3.5" />
                  )}
                  <span>Verschieben</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}