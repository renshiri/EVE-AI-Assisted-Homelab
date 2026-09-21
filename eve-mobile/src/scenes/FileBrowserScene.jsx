import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Linking,
  useWindowDimensions 
} from 'react-native';
import { 
  Folder, 
  FileText, 
  Download, 
  HardDrive, 
  ChevronRight, 
  ArrowLeft, 
  RefreshCw, 
  File, 
  ShieldCheck 
} from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function FileBrowserScene() {
  const { NODE_SERVER, user } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const username = user?.username || 'guest';
  const isAdmin = username === 'renshiri' || username === 'root';

  // Verzeichnisinhalte vom Server laden
  const loadDirectory = useCallback(async (path = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${NODE_SERVER}/api/files?path=${encodeURIComponent(path)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.files || []);
        setCurrentPath(json.current_path || '');
      }
    } catch (e) {
      console.error('[FileBrowser] Fehler beim Laden:', e);
    } finally {
      setLoading(false);
    }
  }, [NODE_SERVER, username]);

  useEffect(() => {
    loadDirectory('');
  }, [loadDirectory]);

  const handleOpenFolder = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    loadDirectory(newPath);
  };

  const handleGoBack = () => {
    if (!currentPath || currentPath === '/' || (!isAdmin && currentPath === '/nas/recherchen')) return;
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const parentPath = '/' + pathParts.join('/');
    loadDirectory(parentPath);
  };

  const handleBreadcrumbClick = (index) => {
    const pathParts = currentPath.split('/').filter(Boolean);
    if (index === -1) {
      loadDirectory(isAdmin ? '/' : '');
      return;
    }
    const targetPath = '/' + pathParts.slice(0, index + 1).join('/');
    loadDirectory(targetPath);
  };

  const handleDownload = (itemRelativePath) => {
    const downloadUrl = `${NODE_SERVER}/api/files/download?path=${encodeURIComponent(itemRelativePath)}&username=${encodeURIComponent(username)}`;
    Linking.openURL(downloadUrl).catch(err => console.error("Download Error:", err));
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // Dynamische Spaltenberechnung
  const getItemCardStyle = () => {
    if (isTablet && isLandscape) return styles.itemCard4Col; // 4 Spalten auf iPad Querformat
    if (isTablet || isLandscape) return styles.itemCard3Col; // 3 Spalten auf iPad Hochformat / Phone Querformat
    return styles.itemCard2Col; // 2 Spalten auf Phone Hochformat
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header & Breadcrumb Bar */}
        <View style={styles.headerCard}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, isAdmin && styles.iconBoxAdmin]}>
                <HardDrive size={20} color={isAdmin ? '#f59e0b' : '#22d3ee'} />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>
                    {isAdmin ? 'System Root Explorer' : 'NAS File Explorer'}
                  </Text>
                  {isAdmin && (
                    <View style={styles.adminBadge}>
                      <ShieldCheck size={10} color="#f59e0b" />
                      <Text style={styles.adminBadgeText}>Root</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSub}>User: {username}</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable onPress={handleGoBack} style={styles.btnAction}>
                <ArrowLeft size={16} color="#94a3b8" />
              </Pressable>
              <Pressable onPress={() => loadDirectory(currentPath)} style={styles.btnAction}>
                <RefreshCw size={16} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          {/* Breadcrumbs Navigation */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbBar}>
            <Pressable onPress={() => handleBreadcrumbClick(-1)}>
              <Text style={styles.breadcrumbRoot}>{isAdmin ? '/' : '/nas/recherchen'}</Text>
            </Pressable>
            {breadcrumbs.map((crumb, idx) => (
              <View key={idx} style={styles.breadcrumbItem}>
                <ChevronRight size={14} color="#64748b" />
                <Pressable onPress={() => handleBreadcrumbClick(idx)}>
                  <Text style={[
                    styles.breadcrumbText, 
                    idx === breadcrumbs.length - 1 && styles.breadcrumbActive
                  ]}>
                    {crumb}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Content Area / File Grid */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#22d3ee" />
              <Text style={styles.loadingText}>Dateisystem wird gelesen...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerContainer}>
              <Folder size={48} color="#334155" />
              <Text style={styles.emptyText}>Dieser Ordner ist leer.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {items.map((item, i) => {
                const itemRelativePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;

                return (
                  <Pressable
                    key={i}
                    onPress={() => item.is_dir && handleOpenFolder(item.name)}
                    style={({ pressed }) => [
                      styles.itemCard,
                      getItemCardStyle(),
                      pressed && item.is_dir && { opacity: 0.8 }
                    ]}
                  >
                    <View style={styles.itemTop}>
                      <View style={[
                        styles.itemIconBox,
                        item.is_dir ? styles.folderIconBox : item.type === 'pdf' ? styles.pdfIconBox : styles.fileIconBox
                      ]}>
                        {item.is_dir ? (
                          <Folder size={20} color="#f59e0b" />
                        ) : item.type === 'pdf' ? (
                          <FileText size={20} color="#f43f5e" />
                        ) : (
                          <File size={20} color="#22d3ee" />
                        )}
                      </View>
                      <Text style={styles.itemSize}>{item.size}</Text>
                    </View>

                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemDate}>{item.date}</Text>

                    {!item.is_dir && (
                      <Pressable 
                        onPress={() => handleDownload(itemRelativePath)} 
                        style={styles.downloadBtn}
                      >
                        <Download size={13} color="#22d3ee" />
                        <Text style={styles.downloadText}>Download</Text>
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

      </View>
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
    marginBottom: 10,
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
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxAdmin: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  adminBadgeText: {
    color: '#f59e0b',
    fontSize: 8,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  btnAction: {
    padding: 7,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  breadcrumbRoot: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  breadcrumbText: {
    color: '#64748b',
    fontSize: 10,
  },
  breadcrumbActive: {
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 110, // Puffer für das schwebende Dock
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 10,
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
  itemCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
  },
  itemCard2Col: {
    width: '48.5%',
  },
  itemCard3Col: {
    width: '31.8%',
  },
  itemCard4Col: {
    width: '23.8%',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  folderIconBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pdfIconBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  fileIconBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  itemSize: {
    color: '#64748b',
    fontSize: 8,
    backgroundColor: '#020617',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  itemName: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemDate: {
    color: '#64748b',
    fontSize: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  downloadText: {
    color: '#22d3ee',
    fontSize: 9,
    fontWeight: 'bold',
  },
});