import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Modal, 
  useWindowDimensions,
  Platform 
} from 'react-native';
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
  MoreHorizontal,
  X,
  ShieldAlert,
  CheckSquare
} from 'lucide-react-native';

export default function BottomBar({ activeScene, onSelectScene, onLock, user }) {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const currentUser = user || { role: 'admin', permissions: ['read', 'logs', 'admin'] };

  const allNavs = [
    { id: 'ambient', label: 'Core', icon: Radio, requiredPermission: 'read', primary: true },
    { id: 'chat', label: 'Chat', icon: MessageSquareText, requiredPermission: 'read', primary: true },
    { id: 'todos', label: 'Todos', icon: CheckSquare, requiredPermission: 'read', primary: true },
    { id: 'calendar', label: 'Plan', icon: Calendar, requiredRole: 'admin', primary: true },
    
    // Sekundäre Items (auf Smartphones im schwebenden Drawer)
    { id: 'research', label: 'Reports', icon: BookOpenText, requiredPermission: 'read', primary: false },
    { id: 'library', label: 'Medien', icon: Library, requiredRole: 'admin', primary: false },
    { id: 'files', label: 'Files', icon: Folder, requiredPermission: 'read', primary: false },
    { id: 'logs', label: 'Logs', icon: Terminal, requiredPermission: 'logs', primary: false },
  ];

  // Rechte-Filterung
  const visibleNavs = allNavs.filter((item) => {
    if (!currentUser) return false;
    if (item.requiredRole && currentUser.role !== item.requiredRole) return false;
    if (item.requiredPermission) {
      const userPermissions = currentUser.permissions || [];
      const hasPermission = userPermissions.includes(item.requiredPermission) || userPermissions.includes('admin');
      if (!hasPermission) return false;
    }
    return true;
  });

  // Auf Tablets zeigen wir alle erlaubten Navs direkt im Dock; auf Smartphones die Primär-Items + "Mehr"
  const primaryNavs = isTablet ? visibleNavs : visibleNavs.filter(item => item.primary);
  const secondaryNavs = visibleNavs.filter(item => !item.primary);

  const handleSelect = (sceneId) => {
    onSelectScene(sceneId);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* 🚀 SCHWEBENDES COMMAND DOCK */}
      <View style={[styles.floatingDockWrapper, isLandscape && styles.dockWrapperLandscape]}>
        <View style={styles.dockContainer}>
          
          {primaryNavs.map((item) => {
            const Icon = item.icon;
            const isActive = activeScene === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => [
                  styles.navButton,
                  isActive && styles.activeNavButton,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Icon size={isLandscape ? 17 : 19} color={isActive ? '#22d3ee' : '#64748b'} />
                <Text style={[styles.navLabel, isActive && styles.activeNavLabel]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Smartphone: Mehr-Button */}
          {!isTablet && (
            <Pressable
              onPress={() => setIsMoreOpen(true)}
              style={({ pressed }) => [
                styles.navButton,
                secondaryNavs.some(n => n.id === activeScene) && styles.activeNavButton,
                pressed && { opacity: 0.7 }
              ]}
            >
              <MoreHorizontal 
                size={isLandscape ? 17 : 19} 
                color={secondaryNavs.some(n => n.id === activeScene) ? '#22d3ee' : '#64748b'} 
              />
              <Text style={[
                styles.navLabel, 
                secondaryNavs.some(n => n.id === activeScene) && styles.activeNavLabel
              ]}>
                Mehr
              </Text>
            </Pressable>
          )}

          {/* Trennstrich vor dem Lock-Button */}
          <View style={styles.dividerVertical} />

          {/* Lock / Sperren Button */}
          <Pressable
            onPress={onLock}
            style={({ pressed }) => [styles.navButton, styles.lockNavButton, pressed && { opacity: 0.7 }]}
          >
            <LogOut size={isLandscape ? 17 : 19} color="#f43f5e" />
            <Text style={styles.lockLabel}>Lock</Text>
          </Pressable>

        </View>
      </View>

      {/* 📱 FUTURISTISCHES COMMAND MENU (MODAL SHEET) */}
      <Modal
        visible={isMoreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMoreOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsMoreOpen(false)}>
          <View style={[styles.sheetContainer, isLandscape && styles.sheetContainerLandscape]}>
            
            {/* Top Cyan Glow Line */}
            <View style={styles.sheetGlowLine} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Terminal size={14} color="#06b6d4" />
                <Text style={styles.sheetTitle}>ERWEITERTE SYSTEM-TOOLS</Text>
              </View>
              <Pressable onPress={() => setIsMoreOpen(false)} style={styles.closeBtn}>
                <X size={16} color="#94a3b8" />
              </Pressable>
            </View>

            <View style={styles.sheetGrid}>
              {secondaryNavs.map((item) => {
                const Icon = item.icon;
                const isActive = activeScene === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelect(item.id)}
                    style={[
                      styles.sheetItem, 
                      isActive && styles.sheetItemActive,
                      isLandscape && styles.sheetItemLandscape
                    ]}
                  >
                    <View style={[styles.sheetIconBox, isActive && styles.sheetIconBoxActive]}>
                      <Icon size={18} color={isActive ? '#22d3ee' : '#cbd5e1'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sheetItemText, isActive && styles.sheetItemTextActive]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={styles.sheetItemSub} numberOfLines={1}>Subsystem aktiv</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingDockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 22 : 12,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 100,
  },
  dockWrapperLandscape: {
    bottom: 10,
    left: 40,
    right: 40,
  },
  dockContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    flex: 1,
  },
  activeNavButton: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 3,
  },
  activeNavLabel: {
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
    marginHorizontal: 4,
  },
  lockNavButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  lockLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#f43f5e',
    marginTop: 3,
  },

  // Modal / Drawer Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 90,
  },
  sheetContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  sheetContainerLandscape: {
    paddingBottom: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  sheetGlowLine: {
    position: 'absolute',
    top: 0,
    left: '30%',
    width: '40%',
    height: 2,
    backgroundColor: '#06b6d4',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
    sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetTitle: {
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
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetItem: {
    width: '48%',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetItemLandscape: {
    width: '32%',
  },
  sheetItemActive: {
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  sheetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sheetIconBoxActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  sheetItemText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  sheetItemTextActive: {
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  sheetItemSub: {
    color: '#64748b',
    fontSize: 8,
    marginTop: 1,
  },
});