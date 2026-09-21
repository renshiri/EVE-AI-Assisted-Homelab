import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  Image, 
  TextInput, 
  Modal, 
  ActivityIndicator, 
  Linking,
  useWindowDimensions 
} from 'react-native';
import { 
  Folder, 
  Film, 
  Image as ImageIcon, 
  Search, 
  Play, 
  Tv, 
  X, 
  Download, 
  Lock, 
  ArrowLeft, 
  FolderOpen 
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEVE } from '../context/EVEContext';

const MEDIA_POOLS = [
  { id: 'fotos', name: 'Fotos & Galerien', path: '/home/Fotos/', icon: ImageIcon },
  { id: 'serien', name: 'Serien & Episoden', path: '/home/Serien/', icon: Tv },
  { id: 'filme', name: 'Filme & Doku', path: '/home/Filme/', icon: Film },
];

const PLAYABLE_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.mkv',
  '.jpg', '.jpeg', '.png', '.webp', '.gif'
];

// Helper-Komponente für das native In-App Video-Player Modal mit Landscape-Vollbild
function NativeVideoPlayer({ videoUrl }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView 
      style={styles.nativeVideoView} 
      player={player} 
      allowsFullscreen={true}
      startsPictureInPictureAutomatically={true}
      nativeControls={true}
    />
  );
}

export default function LibraryScene() {
  const { NODE_SERVER, user } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [selectedPool, setSelectedPool] = useState(MEDIA_POOLS[0]);
  const [currentPath, setCurrentPath] = useState(MEDIA_POOLS[0].path);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

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
    setCurrentPath('/' + parentPath + '/');
  };

  useEffect(() => {
    const fetchMediaPool = async () => {
      setLoading(true);
      setAccessDenied(false);
      try {
        const username = user?.username || 'guest';
        const queryPath = encodeURIComponent(currentPath);
        
        const res = await fetch(`${NODE_SERVER}/api/media/pool?path=${queryPath}&username=${username}`);
        
        if (res.status === 403) {
          setAccessDenied(true);
          setMediaItems([]);
        } else if (res.ok) {
          const data = await res.json();
          setMediaItems(data.items || []);
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
  }, [currentPath, NODE_SERVER, user]);

  const filteredItems = mediaItems.filter(item => {
    if (item.is_dir) return true;

    const isZeroByte = item.size === '0 MB' || item.size === '0.0 MB' || item.size === '--' || item.size === '0 Bytes';
    if (isZeroByte) return false;

    const ext = '.' + item.name.split('.').pop().toLowerCase();
    if (!PLAYABLE_EXTENSIONS.includes(ext)) return false;

    const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getMediaUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) return relativeUrl;
    const baseUrl = NODE_SERVER.replace(/\/+$/, '');
    const pathUrl = relativeUrl.replace(/^\/+/, '');
    return `${baseUrl}/${pathUrl}`;
  };

  const isAtRoot = currentPath === selectedPool.path;

  // Dynamische Spaltenberechnung
  const getItemCardStyle = () => {
    if (isTablet && isLandscape) return styles.card4Col; // 4 Spalten auf iPad Querformat
    if (isTablet || isLandscape) return styles.card3Col; // 3 Spalten auf iPad Hochformat / Phone Querformat
    return styles.card2Col; // 2 Spalten auf Phone Hochformat
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Bar */}
        <View style={styles.headerCard}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Film size={20} color="#818cf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Media Vault</Text>
                <View style={styles.pathRow}>
                  {!isAtRoot && (
                    <Pressable onPress={handleNavigateUp} style={styles.backBtn}>
                      <ArrowLeft size={10} color="#22d3ee" />
                      <Text style={styles.backBtnText}>Zurück</Text>
                    </Pressable>
                  )}
                  <Text style={styles.pathText} numberOfLines={1}>{currentPath}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Filter & Suche */}
          <View style={styles.filterRow}>
            <View style={styles.filterTabs}>
              <Pressable 
                onPress={() => setActiveFilter('all')} 
                style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>Alle</Text>
              </Pressable>
              <Pressable 
                onPress={() => setActiveFilter('image')} 
                style={[styles.filterTab, activeFilter === 'image' && styles.filterTabActive]}
              >
                <ImageIcon size={12} color={activeFilter === 'image' ? '#22d3ee' : '#64748b'} />
                <Text style={[styles.filterTabText, activeFilter === 'image' && styles.filterTabTextActive]}>Fotos</Text>
              </Pressable>
              <Pressable 
                onPress={() => setActiveFilter('video')} 
                style={[styles.filterTab, activeFilter === 'video' && styles.filterTabActive]}
              >
                <Film size={12} color={activeFilter === 'video' ? '#f43f5e' : '#64748b'} />
                <Text style={[styles.filterTabText, activeFilter === 'video' && styles.filterTabTextActive]}>Videos</Text>
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Search size={14} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Suchen..."
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          {/* Medien-Pools Auswahl */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poolsScroll}>
            {MEDIA_POOLS.map((pool) => {
              const IconComp = pool.icon;
              const isSelected = selectedPool.id === pool.id;
              return (
                <Pressable
                  key={pool.id}
                  onPress={() => handlePoolSelect(pool)}
                  style={[styles.poolChip, isSelected && styles.poolChipSelected]}
                >
                  <IconComp size={14} color={isSelected ? '#818cf8' : '#64748b'} />
                  <Text style={[styles.poolChipText, isSelected && styles.poolChipTextSelected]}>
                    {pool.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Area / Grid */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#818cf8" />
              <Text style={styles.loadingText}>Indiziere Verzeichnis...</Text>
            </View>
          ) : accessDenied ? (
            <View style={styles.centerBox}>
              <Lock size={40} color="#f43f5e" />
              <Text style={styles.accessDeniedTitle}>Zugriff verweigert</Text>
              <Text style={styles.accessDeniedSub}>
                Nur der Administrator hat Zugriff auf die Medienbibliothek.
              </Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.centerBox}>
              <Film size={40} color="#334155" />
              <Text style={styles.emptyText}>Keine abspielbaren Medien vorhanden.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredItems.map((item) => {
                if (item.is_dir) {
                  return (
                    <Pressable
                      key={item.id || item.name}
                      onPress={() => handleFolderClick(item.path)}
                      style={[styles.folderCard, getItemCardStyle()]}
                    >
                      <View style={styles.folderIconBox}>
                        <FolderOpen size={24} color="#818cf8" />
                      </View>
                      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.folderTag}>ORDNER</Text>
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={item.id || item.name}
                    onPress={() => setPreviewItem(item)}
                    style={[styles.mediaCard, getItemCardStyle()]}
                  >
                    <View style={styles.mediaPreview}>
                      {item.type === 'image' ? (
                        <Image
                          source={{ uri: getMediaUrl(item.url) }}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Film size={22} color="#818cf8" />
                          <View style={styles.playBadge}>
                            <Play size={10} color="#ffffff" style={{ marginLeft: 2 }} />
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.mediaInfo}>
                      <Text style={styles.mediaName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.mediaMeta}>
                        <Text style={styles.mediaMetaText}>{item.size}</Text>
                        <Text style={styles.mediaMetaText}>{item.date}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

      </View>

      {/* Lightbox / In-App Video & Image Preview Modal */}
      <Modal visible={!!previewItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isLandscape && styles.modalCardLandscape]}>
            <View style={styles.sheetGlowLine} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{previewItem?.name}</Text>
              <Pressable onPress={() => setPreviewItem(null)} style={styles.modalCloseBtn}>
                <X size={18} color="#94a3b8" />
              </Pressable>
            </View>

            <View style={[styles.modalBody, isLandscape && !isTablet && styles.modalBodyLandscape]}>
              {previewItem?.type === 'image' ? (
                <Image
                  source={{ uri: getMediaUrl(previewItem?.url) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <NativeVideoPlayer videoUrl={getMediaUrl(previewItem?.url)} />
              )}
            </View>

            <View style={styles.modalFooter}>
              <Pressable 
                onPress={() => Linking.openURL(getMediaUrl(previewItem?.url))}
                style={styles.downloadBtn}
              >
                <Download size={14} color="#22d3ee" />
                <Text style={styles.downloadText}>Download</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    padding: 12,
  },
  headerCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlowLine: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: '30%',
    height: 1.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  backBtnText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: 'bold',
  },
  pathText: {
    color: '#64748b',
    fontSize: 9,
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  filterTabText: {
    color: '#64748b',
    fontSize: 10,
  },
  filterTabTextActive: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 32,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 10,
    marginLeft: 4,
  },
  poolsScroll: {
    flexDirection: 'row',
  },
  poolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  poolChipSelected: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  poolChipText: {
    color: '#64748b',
    fontSize: 10,
  },
  poolChipTextSelected: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 110, // Puffer für das schwebende Dock
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 10,
  },
  accessDeniedTitle: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
  },
  accessDeniedSub: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card2Col: {
    width: '48.5%',
  },
  card3Col: {
    width: '31.8%',
  },
  card4Col: {
    width: '23.8%',
  },
  folderCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  folderName: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: 'bold',
  },
  folderTag: {
    color: '#64748b',
    fontSize: 8,
    marginTop: 2,
  },
  mediaCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: 90,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  mediaInfo: {
    padding: 8,
  },
  mediaName: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mediaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  mediaMetaText: {
    color: '#64748b',
    fontSize: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  modalCardLandscape: {
    maxWidth: 520,
  },
  sheetGlowLine: {
    position: 'absolute',
    top: 0,
    left: '30%',
    width: '40%',
    height: 2,
    backgroundColor: '#06b6d4',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    height: 240,
    backgroundColor: '#020617',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalBodyLandscape: {
    height: 180,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  nativeVideoView: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  downloadText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: 'bold',
  },
});