import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, Film, Image as ImageIcon, Search, Play, Pause, Eye, 
  Tv, Filter, X, ArrowLeft, FolderOpen,
  RotateCcw, RotateCw, Maximize, Minimize, Gauge, Clock, Sparkles, History,
  Volume2, VolumeX
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

const MEDIA_POOLS = [
  { id: 'fotos', name: 'Fotos & Galerien', path: '/home/Fotos', icon: ImageIcon },
  { id: 'serien', name: 'Serien & Episoden', path: '/home/Serien', icon: Tv },
  { id: 'filme', name: 'Filme & Dokumentationen', path: '/home/Filme', icon: Film },
];

const PLAYABLE_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.mkv',
  '.jpg', '.jpeg', '.png', '.webp', '.gif'
];

export default function LibraryScene() {
  const { NODE_SERVER, user } = useEVE();
  const [selectedPool, setSelectedPool] = useState(MEDIA_POOLS[0]);
  const [currentPath, setCurrentPath] = useState(MEDIA_POOLS[0].path);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // SQLite Progress & Last Played States
  const [dbLastPlayed, setDbLastPlayed] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  // Video Player Ref & Controls States
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [savedTime, setSavedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const username = user?.username || 'guest';

  const handlePoolSelect = (pool) => {
    setSelectedPool(pool);
    setCurrentPath(pool.path);
  };

  const handleFolderClick = (folderPath) => {
    setCurrentPath(folderPath);
  };

  const handleNavigateUp = () => {
    if (currentPath === selectedPool.path) return;
    const parentPath = currentPath.split('/').filter(Boolean).slice(0, -1).join('/');
    setCurrentPath('/' + parentPath);
  };

  // Zuletzt abgespieltes Video ordnerspezifisch aus SQLite laden
  const fetchLastPlayed = async (path) => {
    try {
      const queryPath = encodeURIComponent(path || currentPath);
      const res = await fetch(`${NODE_SERVER}/api/media/last-played?username=${username}&folder_path=${queryPath}`);
      if (res.ok) {
        const data = await res.json();
        setDbLastPlayed(data.item || null);
      }
    } catch (e) {
      console.warn('[Fetch Last Played Error]', e);
    }
  };

  // Bei Ordnerwechsel oder User-Wechsel direkt aus der DB abrufen
  useEffect(() => {
    fetchLastPlayed(currentPath);
  }, [currentPath, NODE_SERVER, username]);

  useEffect(() => {
    const fetchMediaPool = async () => {
      setLoading(true);
      setAccessDenied(false);
      try {
        const queryPath = encodeURIComponent(currentPath);
        const res = await fetch(`${NODE_SERVER}/api/media/pool?path=${queryPath}&username=${username}`);
        
        if (res.status === 403) {
          setAccessDenied(true);
          setMediaItems([]);
        } else if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          setMediaItems(items);

          items.forEach(item => {
            if (!item.is_dir && item.type === 'video') {
              const filePath = item.path || item.url || item.name;
              fetch(`${NODE_SERVER}/api/media/progress?file_path=${encodeURIComponent(filePath)}&username=${username}`)
                .then(r => r.json())
                .then(pData => {
                  if (pData.position && pData.position > 0) {
                    setProgressMap(prev => ({ ...prev, [filePath]: pData.position }));
                  }
                })
                .catch(() => {});
            }
          });
        } else {
          setMediaItems([]);
        }
      } catch (e) {
        console.warn('[Media Pool Error]', e);
        setMediaItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaPool();
  }, [currentPath, NODE_SERVER, username]);

  useEffect(() => {
    if (previewItem && previewItem.type === 'video') {
      const filePath = previewItem.path || previewItem.url || previewItem.name;
      const queryPath = encodeURIComponent(filePath);

      fetch(`${NODE_SERVER}/api/media/progress?file_path=${queryPath}&username=${username}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.position) {
            setSavedTime(data.position);
          } else {
            setSavedTime(0);
          }
        })
        .catch(() => setSavedTime(0));
    }
  }, [previewItem, NODE_SERVER, username]);

  // Fullscreen Listener Sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-Fade Logic für die Bedienelemente
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const saveProgress = (timeToSave) => {
    if (!previewItem || previewItem.type !== 'video') return;
    const filePath = previewItem.path || previewItem.url || previewItem.name;

    setProgressMap(prev => ({ ...prev, [filePath]: timeToSave }));

    fetch(`${NODE_SERVER}/api/media/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: filePath,
        position: timeToSave,
        username: username,
      }),
    })
    .then(() => fetchLastPlayed(currentPath))
    .catch((err) => console.warn('[Progress Save Error]', err));
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setShowControls(true);
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (savedTime > 0) {
        videoRef.current.currentTime = savedTime;
      }
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (Math.floor(curr) % 5 === 0) {
        saveProgress(curr);
      }
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const togglePlaybackSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleCloseModal = () => {
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setPreviewItem(null);
  };

  const filteredItems = mediaItems.filter((item) => {
    if (item.is_dir) return true;
    const ext = '.' + item.name.split('.').pop().toLowerCase();
    if (!PLAYABLE_EXTENSIONS.includes(ext)) return false;
    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const folders = filteredItems.filter(i => i.is_dir);
  const videos = filteredItems.filter(i => !i.is_dir && i.type === 'video');
  const images = filteredItems.filter(i => !i.is_dir && i.type === 'image');

  const getDbMatchVideo = () => {
    if (!dbLastPlayed) return null;
    return videos.find(v => {
      const p = v.path || v.url || v.name;
      return p === dbLastPlayed.file_path;
    });
  };

  const lastPlayedVideoMatch = getDbMatchVideo();
  const featuredItem = lastPlayedVideoMatch || videos[0] || images[0] || null;
  const featuredPath = featuredItem ? (featuredItem.path || featuredItem.url || featuredItem.name) : '';
  
  const featuredProgress = (dbLastPlayed && dbLastPlayed.file_path === featuredPath) 
    ? dbLastPlayed.position 
    : (progressMap[featuredPath] || 0);

  const getMediaUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) return relativeUrl;
    const baseUrl = NODE_SERVER.replace(/\/+$/, '');
    const pathUrl = relativeUrl.replace(/^\/+/, '');
    return `${baseUrl}/${pathUrl}`;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isAtRoot = currentPath === selectedPool.path;

  return (
    <div className="animate-fade-in h-full flex flex-col gap-4 select-none relative overflow-y-auto pr-1">
      {/* Top Header / Navigation Bar */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {MEDIA_POOLS.map((pool) => {
            const IconComp = pool.icon;
            const isSelected = selectedPool.id === pool.id;
            return (
              <button
                key={pool.id}
                onClick={() => handlePoolSelect(pool)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{pool.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {!isAtRoot && (
            <button 
              onClick={handleNavigateUp}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-xl border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
              title="Zurück"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zurück</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px]">
            <span className="text-slate-500">Pfad:</span>
            <span className="text-cyan-400 font-bold truncate max-w-[160px] sm:max-w-xs">{currentPath}</span>
          </div>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen..."
              className="bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 w-32 sm:w-44 transition-all"
            />
          </div>
        </div>
      </div>

      {accessDenied ? (
        <div className="h-96 flex flex-col items-center justify-center text-rose-400 font-mono text-xs gap-3 bg-slate-950/80 rounded-3xl border border-slate-800 backdrop-blur-md">
          <Lock className="w-12 h-12 text-rose-500/80" />
          <span className="font-bold text-sm">Zugriff verweigert</span>
          <span className="text-[10px] text-slate-500">Nur der Administrator ({username}) hat Zugriff auf die Medienbibliothek.</span>
        </div>
      ) : loading ? (
        <div className="h-96 flex items-center justify-center font-mono text-xs text-slate-500 animate-pulse bg-slate-950/60 rounded-3xl border border-slate-800">
          Medienbibliothek wird geladen...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2 bg-slate-950/60 rounded-3xl border border-slate-800">
          <Filter className="w-10 h-10 text-slate-700" />
          <span>Keine abspielbaren Medien im aktuellen Ordner.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Spotlight Hero Banner */}
          {featuredItem && !searchQuery && (
            <div className="relative w-full h-72 sm:h-80 rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl group">
              {featuredItem.poster_url || featuredItem.type === 'image' ? (
                <img 
                  src={getMediaUrl(featuredItem.poster_url || featuredItem.url)} 
                  alt={featuredItem.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 relative flex items-center justify-center">
                  <Film className="w-24 h-24 text-indigo-500/20" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />

              <div className="absolute bottom-0 left-0 p-6 sm:p-8 flex flex-col gap-3 max-w-xl">
                <div className="flex items-center gap-2">
                  {lastPlayedVideoMatch ? (
                    <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                      <History className="w-3.5 h-3.5 text-indigo-400" /> Zuletzt Gespielt
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Highlight
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">{featuredItem.size}</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-md truncate">
                  {featuredItem.name}
                </h1>

                {featuredProgress > 0 && (
                  <div className="flex items-center gap-2 font-mono text-xs text-indigo-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Fortschritt gespeichert bei: <strong>{formatTime(featuredProgress)}</strong></span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setPreviewItem(featuredItem)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-105 duration-200"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{featuredProgress > 0 ? 'Fortsetzen' : 'Wiedergeben'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: Ordner */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                <Folder className="w-4 h-4 text-indigo-400" />
                <span>Unterordner ({folders.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.path)}
                    className="group bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 p-3.5 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 shadow-lg hover:-translate-y-1 duration-200"
                  >
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                      <FolderOpen className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 text-center truncate w-full group-hover:text-indigo-300">
                      {folder.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Videos */}
          {videos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  <Film className="w-4 h-4 text-pink-400" />
                  <span>Filme & Videos ({videos.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videos.map((item) => {
                  const filePath = item.path || item.url || item.name;
                  const currentProgress = progressMap[filePath] || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="group relative bg-slate-900/60 border border-slate-800 hover:border-indigo-500/60 rounded-2xl overflow-hidden cursor-pointer transition-all shadow-xl hover:shadow-indigo-500/10 flex flex-col hover:-translate-y-1 duration-200"
                    >
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {item.poster_url ? (
                          <img
                            src={getMediaUrl(item.poster_url)}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-950/20 flex items-center justify-center relative">
                            <Film className="w-10 h-10 text-indigo-500/30 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-indigo-600/90 border border-indigo-400/50 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-200">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>

                        <div className="absolute top-2 right-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        </div>

                        {currentProgress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                            <div 
                              className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" 
                              style={{ width: `${Math.min(100, (currentProgress / 300) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex flex-col gap-1 bg-slate-900/80 backdrop-blur-md flex-1 justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </span>
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                          <span>{item.size}</span>
                          {currentProgress > 0 ? (
                            <span className="text-indigo-400 font-bold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(currentProgress)}
                            </span>
                          ) : (
                            <span>{item.date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: Photos */}
          {images.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Fotos & Bilder ({images.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
                {images.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewItem(item)}
                    className="group relative bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all shadow-lg hover:-translate-y-1 duration-200"
                  >
                    <div className="aspect-square bg-slate-950 relative overflow-hidden">
                      <img
                        src={getMediaUrl(item.url)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 rounded-full bg-slate-900/80 border border-cyan-400/50 text-cyan-300">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/90 text-center">
                      <span className="text-[11px] font-bold text-slate-300 truncate block group-hover:text-cyan-300">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Interactive Lightbox Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div 
            ref={playerContainerRef}
            onMouseMove={handleMouseMove}
            className={`relative bg-slate-950 border border-slate-800 ${
              isFullscreen ? 'w-screen h-screen rounded-none border-none' : 'max-w-5xl w-full rounded-3xl max-h-[85vh]'
            } overflow-hidden shadow-2xl flex flex-col justify-center items-center group transition-all duration-300`}
          >
            {/* Minimalist Top Close Button */}
            <div className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              <button
                onClick={handleCloseModal}
                className="p-2.5 bg-slate-900/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-full transition cursor-pointer border border-slate-700/60 backdrop-blur-md shadow-lg"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video / Media Display Area */}
            <div className="w-full h-full flex items-center justify-center relative bg-black">
              {previewItem.type === 'video' ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    onClick={togglePlay}
                    onDoubleClick={toggleFullscreen}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => {
                      setIsPlaying(false);
                      if (videoRef.current) saveProgress(videoRef.current.currentTime);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    className="w-full h-full object-contain cursor-pointer max-h-[85vh]"
                  >
                    <source src={getMediaUrl(previewItem.url)} />
                    Browser unterstützt kein direktes Abspielen.
                  </video>

                  {/* Overlay Player Controls (unten) */}
                  <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent transition-opacity duration-300 flex flex-col gap-2 font-mono text-xs ${
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    {/* Progress Slider Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-300 font-bold w-12 text-right">{formatTime(currentTime)}</span>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                      />
                      <span className="text-[11px] text-slate-400 w-12">{formatTime(duration)}</span>
                    </div>

                    {/* Lower Buttons Bar */}
                    <div className="flex justify-between items-center gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause Button */}
                        <button
                          onClick={togglePlay}
                          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-lg"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                        </button>

                        <button
                          onClick={() => skipTime(-10)}
                          className="p-2 bg-slate-900/80 hover:bg-indigo-600/30 text-slate-300 rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-800"
                          title="-10s"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                          <span>-10s</span>
                        </button>

                        <button
                          onClick={() => skipTime(10)}
                          className="p-2 bg-slate-900/80 hover:bg-indigo-600/30 text-slate-300 rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-800"
                          title="+10s"
                        >
                          <span>+10s</span>
                          <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                        </button>

                        {/* Volume Control Slider */}
                        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
                          <button onClick={toggleMute} className="text-slate-400 hover:text-slate-200">
                            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={togglePlaybackSpeed}
                          className="p-2 bg-slate-900/80 hover:bg-indigo-600/30 text-cyan-300 rounded-xl transition flex items-center gap-1 cursor-pointer font-bold border border-slate-800"
                          title="Wiedergabegeschwindigkeit"
                        >
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{playbackSpeed}x</span>
                        </button>

                        <button
                          onClick={toggleFullscreen}
                          className="p-2 bg-slate-900/80 hover:bg-indigo-600/30 text-slate-300 rounded-xl transition cursor-pointer border border-slate-800"
                          title="Vollbild Umschalten"
                        >
                          {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-slate-300" /> : <Maximize className="w-3.5 h-3.5 text-slate-300" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={getMediaUrl(previewItem.url)}
                  alt={previewItem.name}
                  className="max-h-[80vh] w-auto object-contain rounded-2xl border border-slate-800 shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}