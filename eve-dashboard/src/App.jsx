import React, { useState, useEffect } from 'react';
import { EVEProvider, useEVE } from './context/EVEContext';

// Standard Desktop / Fallback Szenen
import AmbientScene from './scenes/AmbientScene';
import ChatScene from './scenes/ChatScene';
import ResearchScene from './scenes/ResearchScene';
import BazaarScene from './scenes/BazaarScene';
import FileBrowserScene from './scenes/FileBrowserScene';
import LibraryScene from './scenes/LibraryScene';
import CalendarScene from './scenes/CalendarScene';
import TodoScene from './scenes/TodoScene';
import ServiceScene from './scenes/ServiceScene';
import TerminalScene from './scenes/TerminalScene';
import PiholeScene from './scenes/PiholeScene';
import SearchScene from './scenes/SearchScene';
import VSCodeScene from './scenes/VSCodeScene';
import AppsScene from './scenes/AppsScene';
import VideoStudioScene from './scenes/VideoStudioScene';
import RulesScene from './scenes/RulesScene';
import ServerControlScene from './scenes/ServerControlScene';

// Mobile-Optimierte Szenen (Hier nach und nach deine PWA-Varianten importieren)
import AmbientSceneMobile from './mobileview/AmbientMobile'; 
import ChatMobile from './mobileview/ChatMobile';
import CalendarMobile from './mobileview/CalendarMobile';
import LibraryMobile from './mobileview/LibraryMobile';
 
import BottomBar from './components/BottomBar';
import LoginModal from './components/LoginModal';

/**
 * Custom Hook zur Geräte-Erkennung (Mobile Breakpoint < 768px)
 */
function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile };
}

function DashboardContent() {
  const { isAuthenticated, setIsAuthenticated, activeScene, setActiveScene } = useEVE();
  const { isMobile } = useDeviceDetect();

  /**
   * Szenen-Weiche mit gerätespezifischer Auswertung
   */
  const renderScene = () => {
    switch (activeScene) {
      case 'ambient': 
        return isMobile ? <AmbientSceneMobile /> : <AmbientScene />;

      case 'chat': 
        return isMobile ? <ChatMobile /> : <ChatScene />;

      case 'calendar':
        return isMobile ? <CalendarMobile /> : <CalendarScene />;

      case 'library': 
        return isMobile ? <LibraryMobile /> : <LibraryScene />;

      case 'research': return <ResearchScene />;
      case 'bazaar': return <BazaarScene />;
      case 'files': return <FileBrowserScene />;
      case 'todos': return <TodoScene />;
      case 'service': return <ServiceScene />;
      case 'terminal': return <TerminalScene />;
      case 'pihole': return <PiholeScene />;
      case 'search': return <SearchScene />;
      case 'vscode': return <VSCodeScene />;
      case 'apps': return <AppsScene />;
      case 'video': return <VideoStudioScene />;
      case 'rules': return <RulesScene />
      case 'server_control': return <ServerControlScene />;

      default: 
        return isMobile ? <AmbientMobile /> : <AmbientScene />;
    }
  };

  return (
    /* h-[100dvh] verhindert iOS Safari Adressleisten-Bugs im Vergleich zu h-screen */
    <div className="flex flex-col h-[100dvh] w-screen bg-[#0b0f19] text-slate-100 font-sans overflow-hidden select-none fixed inset-0 touch-none">
      {!isAuthenticated && (
        <LoginModal />
      )}

      {/* Dynamic Padding & Safe Areas für iPhones (Notch & Home Bar) */}
      <main className="flex-1 overflow-hidden relative h-full w-full p-2 md:p-4">
        {renderScene()}
      </main>

      <BottomBar
        activeScene={activeScene}
        onSelectScene={setActiveScene}
        onLock={() => setIsAuthenticated(false)}
        isMobile={isMobile} // Kannst du der BottomBar übergeben, falls sie sich auf Mobile anpassen soll
      />
    </div>
  );
}

export default function App() {
  return (
    <EVEProvider>
      <DashboardContent />
    </EVEProvider>
  );
}