import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { EVEProvider, useEVE } from './src/context/EVEContext';

// Szenen
import AmbientScene from './src/scenes/AmbientScene';
import CalendarScene from './src/scenes/CalendarScene';
import ChatScene from './src/scenes/ChatScene';
import FileBrowserScene from './src/scenes/FileBrowserScene';
import ResearchScene from './src/scenes/ResearchScene';
import LibraryScene from './src/scenes/LibraryScene';
import LogsScene from './src/scenes/LogsScene';
import TodoScene from './src/scenes/TodoScene';

// UI Komponenten
import BottomBar from './src/components/BottomBar';
import LoginModal from './src/components/LoginModal';

function MainApp() {
  const { 
    activeScene, 
    setActiveScene, 
    isAuthenticated, 
    user, 
    logout,
    systemMetrics,
    calendarEvents,
    bazaarData,
    isConnected
  } = useEVE();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Login Modal */}
      <LoginModal visible={!isAuthenticated} />

      {isAuthenticated && (
        <>
          {/* Haupt-Container für die aktive Szene mit globalem Puffer */}
          <View style={styles.sceneContainer}>
            {activeScene === 'ambient' && (
              <AmbientScene 
                systemMetrics={systemMetrics}
                calendarEvents={calendarEvents}
                bazaarData={bazaarData}
                isConnected={isConnected}
              />
            )}

            {activeScene === 'calendar' && <CalendarScene />}
            {activeScene === 'chat' && <ChatScene />}
            {activeScene === 'files' && <FileBrowserScene />}
            {activeScene === 'research' && <ResearchScene />}
            {activeScene === 'library' && <LibraryScene />}
            {activeScene === 'logs' && <LogsScene />}
            {activeScene === 'todos' && <TodoScene />}
          </View>

          {/* Schwebende Befehlsleiste (Floating Dock) */}
          <BottomBar 
            activeScene={activeScene} 
            onSelectScene={(sceneId) => setActiveScene(sceneId)} 
            onLock={logout}
            user={user}
          />
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <EVEProvider>
      <MainApp />
    </EVEProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
  },
  sceneContainer: {
    flex: 1,
    paddingBottom: 85, // Globaler Puffer: Schützt jede aktive Szene vor der BottomBar
  },
});