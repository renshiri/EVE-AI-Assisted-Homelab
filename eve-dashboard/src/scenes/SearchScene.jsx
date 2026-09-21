import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ExternalLink, Compass, ArrowLeft, Loader2, Globe, Image as ImageIcon, Video, FileText, Cpu, BookOpen, Sparkles, Play, X, History, Clock, Activity, Zap } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function SearchScene() {
  const { 
    NODE_SERVER, setActiveScene, 
    searchQuery, setSearchQuery, 
    searchResults, setSearchResults, 
    searchCategory, setSearchCategory, 
    searchHasSearched, setSearchHasSearched 
  } = useEVE();
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingPhase, setLoadingPhase] = useState('INITIALIZING_LINK');

  const existingUrlsRef = useRef(new Set());
  const sentinelRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('eve_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.error('Fehler beim Laden der Historie:', e);
    }
  }, []);

  const categories = [
    { id: 'general', label: 'Universal', icon: Globe },
    { id: 'it', label: 'Tech & Code', icon: Cpu },
    { id: 'science', label: 'Research', icon: BookOpen },
    { id: 'news', label: 'Chronicle', icon: FileText },
    { id: 'images', label: 'Visuals', icon: ImageIcon },
    { id: 'videos', label: 'Streams', icon: Video },
  ];

  // Garantierte rhythmische Bento-Verteilung ohne Löcher
  const balanceBentoItems = (items) => {
    const withImg = [];
    const textOnly = [];

    items.forEach((item) => {
      const hasThumb = Boolean(item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http'));
      if (hasThumb) withImg.push(item);
      else textOnly.push(item);
    });

    const balanced = [];
    while (withImg.length > 0 || textOnly.length > 0) {
      if (withImg.length > 0) balanced.push(withImg.shift());
      if (textOnly.length > 0) balanced.push(textOnly.shift());
      if (textOnly.length > 0) balanced.push(textOnly.shift());
    }
    return balanced;
  };

  // Fragt das optimierte Backend ab
  const fetchSinglePage = async (query, category, targetPage) => {
    setLoadingPhase(`QUERYING_PARALLEL_NODES_PAGE_${targetPage}...`);
    try {
      const res = await fetch(`${NODE_SERVER}/api/search?q=${encodeURIComponent(query)}&category=${category}&pageno=${targetPage}`);
      if (!res.ok) return { items: [], isEnd: true };
      
      const data = await res.json();
      const raw = data.results || [];

      if (raw.length === 0) return { items: [], isEnd: true };

      const filtered = raw.filter(item => {
        if (!item.url || existingUrlsRef.current.has(item.url)) return false;
        existingUrlsRef.current.add(item.url);
        return true;
      });

      return { items: filtered, isEnd: false };
    } catch (err) {
      console.error(`Fehler bei Seite ${targetPage}:`, err);
      return { items: [], isEnd: true };
    }
  };

  const handleSearch = async (e, categoryOverride = null, customQuery = null) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery !== null ? customQuery : searchQuery;
    if (!queryToUse.trim()) return;

    if (customQuery !== null) setSearchQuery(queryToUse);

    const cat = categoryOverride || searchCategory;
    setLoading(true);
    setSearchHasSearched(true);
    setPage(1);
    setHasMore(true);
    setLoadingPhase('CONNECTING_NEURAL_NODES');
    
    if (existingUrlsRef?.current) {
      existingUrlsRef.current.clear();
    }

    try {
      const updatedHistory = [queryToUse, ...recentSearches.filter(item => item !== queryToUse)].slice(0, 5);
      setRecentSearches(updatedHistory);
      localStorage.setItem('eve_recent_searches', JSON.stringify(updatedHistory));
    } catch (e) {}

    try {
      setLoadingPhase('SYNCHRONIZING_MULTI_INSTANCE_SEARCH');
      const { items, isEnd } = await fetchSinglePage(queryToUse, cat, 1);
      const layoutOptimized = balanceBentoItems(items);
      
      setSearchResults(layoutOptimized);
      setHasMore(!isEnd && items.length > 0);
    } catch (err) {
      console.error('Fehler bei der initialen Suche:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreResults = useCallback(async () => {
    if (loadingMore || !hasMore || !searchQuery.trim() || loading) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const { items, isEnd } = await fetchSinglePage(searchQuery, searchCategory, nextPage);

      if (items && items.length > 0) {
        setSearchResults(prev => balanceBentoItems([...prev, ...items]));
        setPage(nextPage);
      }
      
      if (isEnd || items.length === 0) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Fehler beim Hintergrund-Nachladen:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, searchQuery, searchCategory, page, loading, NODE_SERVER]);

  // Vorausschauender Infinite-Scroll Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !searchHasSearched || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreResults();
        }
      },
      { threshold: 0.01, rootMargin: '1200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [searchHasSearched, loading, hasMore, loadingMore, loadMoreResults]);

  const handleCategoryChange = (catId) => {
    setSearchCategory(catId);
    if (searchHasSearched && searchQuery.trim()) {
      handleSearch(null, catId);
    }
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('eve_recent_searches');
  };

  const getDomain = (url) => {
    try { return new URL(url).hostname; } catch (e) { return ''; }
  };

  const isMediaCategory = searchCategory === 'images' || searchCategory === 'videos';

  const getBentoSpan = (res, index) => {
    if (isMediaCategory) {
      if (index % 7 === 0) return 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-2';
      if (index % 4 === 0) return 'col-span-1 sm:col-span-2 row-span-1';
      return 'col-span-1 row-span-1';
    }

    const hasValidThumbnail = Boolean(res.thumbnail && typeof res.thumbnail === 'string' && res.thumbnail.startsWith('http'));
    const hasLongText = Boolean(res.content && res.content.length > 150);

    if (hasValidThumbnail && index % 5 === 0) return 'col-span-1 sm:col-span-2 lg:col-span-2 row-span-2';
    if (hasValidThumbnail) return 'col-span-1 sm:col-span-2 row-span-1';
    if (hasLongText && index % 3 === 0) return 'col-span-1 sm:col-span-2 row-span-1';

    return 'col-span-1 row-span-1';
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#030406] text-slate-100 font-mono relative overflow-hidden select-none selection:bg-[#00f0ff] selection:text-[#030406]">
      
      {/* Glow-Sphären */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-[#00f0ff]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#6366f1]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-[#00ffcc]/10 rounded-full blur-[150px] pointer-events-none" />

      {!searchHasSearched ? (
        <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-2xl mx-auto w-full my-auto z-10 pb-20">
          
          {/* Header Pill */}
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-white/10 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
            <Activity className="w-4 h-4 text-[#00f0ff] animate-pulse" />
            <span>EVE MULTI-NODE GLASS ENGINE</span>
          </div>

          <div className="text-center mb-8 space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-white font-sans">
              Search with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#00ffcc] to-[#6366f1]">EVE</span>
            </h1>
            <p className="uppercase tracking-wider font-mono text-[10px] text-slate-400">
              Parallel multi-instance glassmorphic & neomorphic meta-search engine.
            </p>
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="w-full space-y-4">
            <div className="relative w-full group">
              <div className="relative flex items-center bg-[#030406] border border-white/[0.08] rounded-2xl p-2.5 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] focus-within:border-[#00f0ff]/60 transition-all">
                <Search className="w-4 h-4 text-[#00f0ff] ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Geben Sie einen Suchbefehl ein..."
                  autoFocus
                  className="w-full bg-transparent py-2.5 px-3 text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-white mr-2 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-4 py-2 text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center gap-2 shrink-0 uppercase tracking-wider disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-[#030406]" />}
                  Suche
                </button>
              </div>
            </div>

            {recentSearches.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-mono text-slate-400 px-1">
                  <span className="flex items-center gap-1.5"><History className="w-4 h-4 text-[#00f0ff]" /> Letzte Abfragen</span>
                  <button type="button" onClick={clearHistory} className="hover:text-[#00f0ff] transition-colors cursor-pointer">Verlauf löschen</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearch(null, null, item)}
                      className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer group"
                    >
                      <Clock className="w-4 h-4 text-slate-500 group-hover:text-[#00f0ff]" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSearchCategory(cat.id)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all border flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider ${
                      searchCategory === cat.id
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)] font-bold'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border-white/[0.08] hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#00f0ff]" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </form>

          <button
            onClick={() => setActiveScene('ambient')}
            className="mt-6 uppercase tracking-wider font-mono text-[10px] text-slate-400 hover:text-[#00f0ff] transition-colors flex items-center gap-2 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#00f0ff]" /> 
            Zurück zum Hub
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full w-full z-10">
          
          {/* Glassmorphic Command Header Bar */}
          <div className="w-full bg-[#030406]/90 border-b border-white/[0.08] px-6 py-3 flex flex-col gap-2.5 backdrop-blur-2xl shrink-0 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              
              <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => { setSearchHasSearched(false); setSearchQuery(''); }}>
                <div className="p-2 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-2xl">
                  <Compass className="w-4 h-4 text-[#00f0ff] animate-spin" style={{ animationDuration: '10s' }} />
                </div>
                <div>
                  <span className="font-bold text-xs tracking-wider uppercase font-mono text-slate-100 block">EVE <span className="text-[#00f0ff]">SEARCH</span></span>
                </div>
              </div>

              <form onSubmit={(e) => handleSearch(e)} className="flex-1 max-w-xl flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#00f0ff] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#030406] border border-white/[0.08] rounded-2xl pl-10 pr-8 py-2.5 text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-4 py-2 text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center justify-center min-w-[75px] shrink-0 uppercase tracking-wider disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suchen'}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400 hidden sm:inline">
                  {!loading && `${searchResults.length} Knoten geladen`}
                </span>
                <button
                  onClick={() => setActiveScene('ambient')}
                  className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
                >
                  Hub
                </button>
              </div>
            </div>

            {/* Sub-Category Navigation Bar */}
            <div className="w-full flex flex-wrap gap-2 pt-1.5 border-t border-white/[0.08]">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border flex items-center gap-2 cursor-pointer uppercase tracking-wider ${
                      searchCategory === cat.id
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)] font-bold'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border-white/[0.08] hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#00f0ff]" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Bento Matrix Results Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 pb-24 w-full scrollbar-thin scrollbar-thumb-white/10">
            <div className="w-full">
              
              {loading && (
                <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400 font-mono">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/20 border-t-[#00f0ff] animate-spin" />
                    <Sparkles className="w-6 h-6 text-[#00f0ff] animate-pulse" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="uppercase tracking-wider font-mono text-[10px] text-[#00f0ff] font-bold animate-pulse">
                      {loadingPhase}
                    </p>
                    <span className="uppercase tracking-wider font-mono text-[10px] text-slate-500">
                      Synthesizing data streams across multiple instances...
                    </span>
                  </div>
                </div>
              )}

              {!loading && searchResults.length === 0 && (
                <div className="text-center text-slate-500 font-mono text-xs py-20 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl">
                  Keine verifizierten Knoten gefunden für "<span className="text-[#00f0ff]">{searchQuery}</span>".
                </div>
              )}

              {!loading && searchResults.length > 0 && (
                <>
                  {/* Bento Grid Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-[170px] grid-flow-dense">
                    {searchResults.map((res, index) => {
                      const domain = getDomain(res.url);
                      const isVideo = searchCategory === 'videos' || res.template === 'videos' || res.iframe_src || res.url?.includes('youtube') || res.url?.includes('vimeo');
                      const hasThumbnail = Boolean(res.thumbnail && typeof res.thumbnail === 'string' && res.thumbnail.startsWith('http'));
                      
                      const bentoSpan = getBentoSpan(res, index);

                      return (
                        <div 
                          key={`${res.url}-${index}`} 
                          className={`bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl hover:border-[#00f0ff]/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${bentoSpan}`}
                        >
                          {isMediaCategory ? (
                            <div className="relative w-full h-full flex flex-col justify-between">
                              <div className="absolute inset-0 bg-[#030406] rounded-xl overflow-hidden border border-white/[0.08]">
                                <img 
                                  src={res.thumbnail || res.img_src || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop'} 
                                  alt="" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" 
                                  onError={(e) => { 
                                    e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop'; 
                                  }}
                                />
                                {isVideo && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                    <div className="p-3 bg-[#00f0ff] text-[#030406] rounded-full shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                                      <Play className="w-5 h-5 fill-current" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="relative z-10 bg-[#030406]/90 backdrop-blur-2xl p-2.5 rounded-xl border border-white/[0.08] mt-auto">
                                <a 
                                  href={res.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-slate-100 group-hover:text-[#00f0ff] text-[11px] font-bold line-clamp-1 block transition-colors"
                                >
                                  {res.title}
                                </a>
                                <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400 truncate block">{domain}</span>
                              </div>
                            </div>
                          ) : (
                            <div className={`flex h-full w-full justify-between gap-3 ${hasThumbnail ? 'flex-row items-center' : 'flex-col'}`}>
                              
                              <div className="flex-1 flex flex-col justify-between h-full min-w-0 space-y-2">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between font-mono text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                                      {domain ? (
                                        <img 
                                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                                          alt="" 
                                          className="w-3.5 h-3.5 rounded-sm shrink-0"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      ) : (
                                        <Globe className="w-4 h-4 text-[#00f0ff] shrink-0" />
                                      )}
                                      <span className="truncate text-slate-300 font-medium text-xs">{domain || res.url}</span>
                                    </div>
                                    {res.engine && (
                                      <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08] shrink-0">
                                        {res.engine}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <h2>
                                    <a 
                                      href={res.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-slate-100 group-hover:text-[#00f0ff] text-xs font-bold flex items-start justify-between gap-2 transition-colors leading-snug line-clamp-2"
                                    >
                                      <span>{res.title}</span>
                                      <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 shrink-0 text-[#00f0ff] transition-opacity" />
                                    </a>
                                  </h2>

                                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 font-sans">
                                    {res.content}
                                  </p>
                                </div>
                              </div>

                              {hasThumbnail && (
                                <div className="w-32 sm:w-40 h-24 bg-[#030406] rounded-xl overflow-hidden border border-white/[0.08] relative shrink-0 aspect-video self-center backdrop-blur-2xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
                                  <img 
                                    src={res.thumbnail} 
                                    alt="" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 object-center" 
                                    onError={(e) => { 
                                      e.target.parentElement.style.display = 'none'; 
                                    }}
                                  />
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {/* Infinite Scroll Sentinel */}
                  <div ref={sentinelRef} className="w-full py-8 flex justify-center items-center">
                    {loadingMore && (
                      <div className="flex items-center gap-2.5 uppercase tracking-wider font-mono text-[10px] text-slate-300 bg-white/[0.03] border border-white/[0.08] px-5 py-2.5 rounded-2xl backdrop-blur-2xl shadow-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00f0ff]" />
                        <span>Prefetching neural grid streams...</span>
                      </div>
                    )}
                    {!hasMore && searchResults.length > 0 && (
                      <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400">
                        — End of Grid Index —
                      </span>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}