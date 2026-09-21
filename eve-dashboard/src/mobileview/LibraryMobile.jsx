import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, Film, Image as ImageIcon, Search, Play, Pause, Eye, 
  Tv, Filter, X, ArrowLeft, FolderOpen,
  RotateCcw, RotateCw, Gauge, Clock, Sparkles, History,
  Volume2, VolumeX, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

const MEDIA_POOLS = [
  { id: 'fotos', name: 'Fotos', path: '/home/Fotos', icon: ImageIcon },
  { id: 'serien', name: 'Serien', path: '/home/Serien', icon: Tv },
  { id: 'filme', name: 'Filme', path: '/home/Filme', icon: Film },
];

const PLAYABLE_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.mkv',
  '.jpg', '.jpeg', '.png', '.webp', '.gif'
];

export default function MobileLibraryScene() {
  const { NODE_SERVER, user } = useEVE();
  const [selectedPool, setSelectedPool] = useState(MEDIA_POOLS[0]);
  const [currentPath, setCurrentPath] = useState(MEDIA_POOLS[0].path);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [activeMedia, setActiveMedia] = useState(null); // Das gerade abgespielte Medium
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // SQLite Progress & Last Played States
  const [dbLastPlayed, setDbLastPlayed] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  // Video Player Ref & Controls States
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [savedTime, setSavedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
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
    if (activeMedia && activeMedia.type === 'video') {
      const filePath = activeMedia.path || activeMedia.url || activeMedia.name;
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
  }, [activeMedia, NODE_SERVER, username]);

  // Touch-Geste: Bedienelemente ein-/ausblenden (Auto-Fade nach 3.5s)
  const handleTouchScreen = () => {
    setShowControls(prev => !prev);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const saveProgress = (timeToSave) => {
    if (!activeMedia || activeMedia.type !== 'video') return;
    const filePath = activeMedia.path || activeMedia.url || activeMedia.name;

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

  const handleExitPlayer = () => {
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime);
    }
    setActiveMedia(null);
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

  // -------------------------------------------------------------
  // NATIVES VOLLBILD-PLAYER INTERFACE (Streaming-View)
  // -------------------------------------------------------------
  if (activeMedia) {
    return (
      <div 
        onClick={handleTouchScreen}
        className="fixed inset-0 z-50 bg-black w-screen h-[100dvh] flex items-center justify-center overflow-hidden animate-fade-in"
      >
        {/* Dynamic Island Safe Header */}
        <div className={`absolute top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top,20px)+8px)] px-4 pb-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex justify-between items-center transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExitPlayer();
            }}
            className="p-2.5 bg-slate-900/80 text-white rounded-full border border-slate-700/80 active:scale-90 transition backdrop-blur-md shadow-2xl flex items-center gap-1.5 px-3.5"
          >
            <ChevronLeft className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold font-mono">Zurück</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-[50%]">
            {activeMedia.name}
          </span>
        </div>

        {/* Video Player Render */}
        {activeMedia.type === 'video' ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPause={() => {
                setIsPlaying(false);
                if (videoRef.current) saveProgress(videoRef.current.currentTime);
              }}
              onPlay={() => setIsPlaying(true)}
              className="w-full h-full object-contain"
            >
              <source src={getMediaUrl(activeMedia.url)} />
            </video>

            {/* Bottom Safe Area Controls (iPhone Home-Bar Safe) */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 left-0 right-0 z-30 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-3 font-mono text-xs ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Progress Slider */}
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-300 font-bold w-9 text-right">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-slate-400 w-9">{formatTime(duration)}</span>
              </div>

              {/* Player Touch Controls */}
              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-3.5 bg-indigo-600 active:bg-indigo-500 text-white rounded-2xl active:scale-90 transition flex items-center justify-center shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>

                  <button
                    onClick={() => skipTime(-10)}
                    className="p-2.5 bg-slate-900/90 text-slate-300 rounded-xl border border-slate-800 active:scale-90 transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px]">-10s</span>
                  </button>

                  <button
                    onClick={() => skipTime(10)}
                    className="p-2.5 bg-slate-900/90 text-slate-300 rounded-xl border border-slate-800 active:scale-90 transition flex items-center gap-1"
                  >
                    <span className="text-[10px]">+10s</span>
                    <RotateCw className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>

                <button
                  onClick={togglePlaybackSpeed}
                  className="p-2.5 bg-slate-900/90 text-cyan-300 rounded-xl border border-slate-800 active:scale-90 transition flex items-center gap-1 font-bold text-[11px]"
                >
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span>{playbackSpeed}x</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <img
            src={getMediaUrl(activeMedia.url)}
            alt={activeMedia.name}
            className="w-full h-full object-contain"
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGULÄRE MOBILE MEDIEN-BIBLIOTHEK (Listen-Ansicht)
  // -------------------------------------------------------------
  return (
    <div className="animate-fade-in h-full flex flex-col gap-3 select-none relative overflow-y-auto pb-12 px-2">
      {/* Mobile Sticky Navigation */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl pt-2 pb-2.5 border-b border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {MEDIA_POOLS.map((pool) => {
            const IconComp = pool.icon;
            const isSelected = selectedPool.id === pool.id;
            return (
              <button
                key={pool.id}
                onClick={() => handlePoolSelect(pool)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{pool.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {!isAtRoot && (
              <button 
                onClick={handleNavigateUp}
                className="p-1.5 bg-slate-900 text-cyan-400 rounded-lg border border-slate-800 active:scale-90 transition cursor-pointer"
                title="Zurück"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] truncate flex-1 text-cyan-400 font-bold">
              {currentPath}
            </div>
          </div>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-lg border transition ${
              isSearchOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {isSearchOpen && (
          <div className="relative mt-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Medien durchsuchen..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {accessDenied ? (
        <div className="h-64 flex flex-col items-center justify-center text-rose-400 font-mono text-xs gap-2 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 text-center">
          <span className="font-bold">Zugriff verweigert</span>
          <span className="text-[10px] text-slate-500">Nur Administrator ({username}) hat Zugriff.</span>
        </div>
      ) : loading ? (
        <div className="h-64 flex items-center justify-center font-mono text-xs text-slate-500 animate-pulse bg-slate-950/60 rounded-2xl border border-slate-800">
          Wird geladen...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2 bg-slate-950/60 rounded-2xl border border-slate-800">
          <Filter className="w-8 h-8 text-slate-700" />
          <span>Keine Medien vorhanden</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spotlight Hero Banner */}
          {featuredItem && !searchQuery && (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-800/80 shadow-xl active:scale-[0.99] transition-transform">
              {featuredItem.poster_url || featuredItem.type === 'image' ? (
                <img 
                  src={getMediaUrl(featuredItem.poster_url || featuredItem.url)} 
                  alt={featuredItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 relative flex items-center justify-center">
                  <Film className="w-16 h-16 text-indigo-500/20" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  {lastPlayedVideoMatch ? (
                    <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/50 text-indigo-300 text-[9px] font-mono font-bold rounded-md uppercase flex items-center gap-1">
                      <History className="w-2.5 h-2.5 text-indigo-400" /> Zuletzt Gespielt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-[9px] font-mono font-bold rounded-md uppercase flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Highlight
                    </span>
                  )}
                </div>

                <h1 className="text-sm font-bold text-white tracking-wide truncate">
                  {featuredItem.name}
                </h1>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setActiveMedia(featuredItem)}
                    className="px-4 py-1.5 bg-indigo-600 active:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{featuredProgress > 0 ? 'Fortsetzen' : 'Wiedergeben'}</span>
                  </button>
                  {featuredProgress > 0 && (
                    <span className="text-[10px] font-mono text-indigo-300">{formatTime(featuredProgress)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unterordner */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                Ordner ({folders.length})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.path)}
                    className="bg-slate-900/80 active:bg-slate-800 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {folder.name}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Grid */}
          {videos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                Videos ({videos.length})
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {videos.map((item) => {
                  const filePath = item.path || item.url || item.name;
                  const currentProgress = progressMap[filePath] || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveMedia(item)}
                      className="bg-slate-900/80 active:scale-95 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col transition-transform cursor-pointer"
                    >
                      <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {item.poster_url ? (
                          <img
                            src={getMediaUrl(item.poster_url)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-8 h-8 text-indigo-500/30" />
                        )}

                        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/90 flex items-center justify-center text-white shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                        </div>

                        {currentProgress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${Math.min(100, (currentProgress / 300) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-2 flex flex-col gap-0.5 bg-slate-900">
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          {item.name}
                        </span>
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                          <span>{item.size}</span>
                          {currentProgress > 0 && (
                            <span className="text-indigo-400 font-bold">{formatTime(currentProgress)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fotos Grid */}
          {images.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                Fotos ({images.length})
              </span>
              <div className="grid grid-cols-3 gap-2">
                {images.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveMedia(item)}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden aspect-square active:scale-95 transition-transform cursor-pointer"
                  >
                    <img
                      src={getMediaUrl(item.url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}