import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Modal,
  Linking,
  useWindowDimensions
} from 'react-native';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  BookOpen, 
  ExternalLink, 
  FolderOpen, 
  Calendar,
  X
} from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function ResearchScene() {
  const { reportsList, fetchReports, NODE_SERVER } = useEVE();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const reportSlug = selectedReport ? selectedReport.filename.replace('.html', '') : '';
  const htmlPreviewUrl = selectedReport ? `${NODE_SERVER}/preview/${reportSlug}` : '';
  const pdfDownloadUrl = selectedReport ? `${NODE_SERVER}/api/files/download?path=Eve_Enzyklopaedie_${reportSlug}.pdf` : '';

  const handleSelectReport = (rep) => {
    setSelectedReport(rep);
    setModalVisible(true);
  };

  const handleOpenBrowser = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("URL-Error:", err));
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchReports();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Bar */}
        <View style={[styles.headerCard, isLandscape && styles.headerCardLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <FileText size={18} color="#22d3ee" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Enzyklopädie & Recherche</Text>
              <Text style={styles.headerSub}>Verfügbare Berichte</Text>
            </View>
          </View>

          <Pressable onPress={handleRefresh} style={styles.actionBtn}>
            <RefreshCw size={14} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Berichte Liste */}
        <View style={styles.sidebarCard}>
          <View style={styles.cardGlowLine} />
          <View style={styles.sidebarHeader}>
            <FolderOpen size={14} color="#06b6d4" />
            <Text style={styles.sidebarTitle}>GESPEICHERTE BERICHTE</Text>
          </View>

          <ScrollView contentContainerStyle={styles.reportsList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="small" color="#22d3ee" style={{ paddingVertical: 20 }} />
            ) : reportsList.length === 0 ? (
              <Text style={styles.emptyText}>Keine Berichte gefunden</Text>
            ) : (
              reportsList.map((rep, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectReport(rep)}
                  style={styles.reportItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportItemTitle} numberOfLines={2}>
                      {rep.title}
                    </Text>
                    <View style={styles.reportMeta}>
                      <Calendar size={10} color="#06b6d4" />
                      <Text style={styles.reportMetaText}>{rep.date}</Text>
                    </View>
                  </View>
                  <ExternalLink size={14} color="#22d3ee" style={{ marginLeft: 8 }} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

      </View>

      {/* Modal / Eigenes Fenster für Ansicht & Download */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isLandscape && styles.modalCardLandscape]}>
            <View style={styles.sheetGlowLine} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>BERICHT DETAILS</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={16} color="#94a3b8" />
              </Pressable>
            </View>

            {selectedReport && (
              <View style={styles.modalContent}>
                <View style={styles.viewerBadge}>
                  <BookOpen size={26} color="#22d3ee" />
                </View>
                <Text style={styles.reportDetailTitle}>{selectedReport.title}</Text>
                <Text style={styles.reportDetailDate}>Erstellt am: {selectedReport.date}</Text>

                <View style={styles.actionGrid}>
                  <Pressable 
                    onPress={() => handleOpenBrowser(htmlPreviewUrl)} 
                    style={styles.openHtmlBtn}
                  >
                    <ExternalLink size={16} color="#ffffff" />
                    <Text style={styles.openHtmlBtnText}>Im Browser ansehen</Text>
                  </Pressable>

                  <Pressable 
                    onPress={() => handleOpenBrowser(pdfDownloadUrl)} 
                    style={styles.downloadPdfBtn}
                  >
                    <Download size={16} color="#ffffff" />
                    <Text style={styles.downloadPdfBtnText}>PDF Herunterladen</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
    paddingBottom: 110,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerCardLandscape: {
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
  },
  actionBtn: {
    padding: 7,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
  },
  sidebarCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 8,
  },
  sidebarTitle: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  reportsList: {
    gap: 6,
    paddingBottom: 20,
  },
  reportItem: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportItemTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 15,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  reportMetaText: {
    color: '#64748b',
    fontSize: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  modalCardLandscape: {
    maxWidth: 480,
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
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalHeaderTitle: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewerBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportDetailTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  reportDetailDate: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  actionGrid: {
    width: '100%',
    gap: 10,
  },
  openHtmlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06b6d4',
    borderRadius: 14,
    height: 42,
  },
  openHtmlBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 42,
  },
  downloadPdfBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});