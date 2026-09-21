import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Mic, 
  MicOff, 
  Activity, 
  Command, 
  Volume2, 
  VolumeX,
  Radio
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

const LOCAL_INTENTS = {
  bazaar: 'bazaar',
  skyblock: 'bazaar',
  hypixel: 'bazaar',
  topologie: 'overview',
  system: 'overview',
  hardware: 'overview',
  recherche: 'research',
  analyse: 'research',
  datei: 'files',
  nas: 'files',
  log: 'logs',
  bibliothek: 'library',
};

const COMMANDS = [
  { cmd: '/reload_brain', desc: 'Leert Caches und lädt den Persona-Prompt aus Neo4j neu' },
  { cmd: '/update_brain', desc: 'Synchronisiert das System-Gedächtnis mit Neo4j' },
  { cmd: '/weather', desc: 'Fragt minutengenaue Live-Wetterdaten ab' },
  { cmd: '/system', desc: 'Schaltet auf die Topologie- & Systemansicht um' },
  { cmd: '/bazaar', desc: 'Öffnet die Hypixel Live Bazaar Flips' },
  { cmd: '/recherche', desc: 'Startet eine enzyklopädische Tiefenanalyse' },
  { cmd: '/logs', desc: 'Zeigt aktuelle Systemctl-Logs an' },
];

export default function ChatScene() {
  const { NODE_SERVER, user, chatMessages, setChatMessages, addChatMessage, setActiveScene, isConnected } = useEVE();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  
  const [statusMessage, setStatusMessage] = useState('Neuraler Link stabil');

  const [showCommands, setShowCommands] = useState(false);
  const [filteredCmds, setFilteredCmds] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, loading]);

  useEffect(() => {
    const statuses = [
      'Neuraler Link stabil',
      'Analysiere Vektor-Memory...',
      'Warte auf Befehl, Sir',
      'Subskripte aktiv & bereit',
      'Synapsen-Synchronisation optimal'
    ];
    const interval = setInterval(() => {
      if (!loading) {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        setStatusMessage(randomStatus);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (input.startsWith('/')) {
      const query = input.toLowerCase();
      const matches = COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(query));
      setFilteredCmds(matches);
      setShowCommands(matches.length > 0);
      setSelectedIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [input]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !autoVoice) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*_~`#>-]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('de') && (v.name.includes('Viktor') || v.name.includes('Anna') || v.name.includes('Google') || v.name.includes('Enhanced'))
    ) || voices.find((v) => v.lang.startsWith('de'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Spracherkennung wird auf diesem Gerät/Browser nicht unterstützt.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e) => {
    if (showCommands) {
      if (e.key === 'Tab' || (e.key === 'Enter' && filteredCmds.length > 0)) {
        e.preventDefault();
        selectCommand(filteredCmds[selectedIndex].cmd);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCmds.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCmds.length) % filteredCmds.length);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommands(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectCommand = (cmdText) => {
    setInput(cmdText + ' ');
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setShowCommands(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    addChatMessage('user', userText);

    const lowerText = userText.toLowerCase();
    for (const [key, scene] of Object.entries(LOCAL_INTENTS)) {
      if (lowerText.includes(key)) {
        setActiveScene(scene);
        break;
      }
    }

    setLoading(true);
    setStatusMessage('EVE schreibt...');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: 'eve', text: '', timestamp: timeStr }]);

    try {
      const response = await fetch(`${NODE_SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema: userText, username: user?.username || 'renshiri' })
      });

      if (!response.ok) throw new Error(`Server Status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let streamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n\n');
        
        // Den letzten (evtl. unvollständigen) Teil im Buffer behalten
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataContent = trimmed.replace(/^data:\s*/, '');

            if (dataContent === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(dataContent);
              if (parsed.token) {
                fullText += parsed.token;
                
                // UI ohne Datenverlust kontinuierlich aktualisieren
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].sender === 'eve') {
                    updated[lastIdx] = { ...updated[lastIdx], text: fullText };
                  }
                  return updated;
                });
              }
            } catch (err) {
              // Stille Ignorierung bei kaputten JSON-Teilen
            }
          }
        }
      }

      setLoading(false);
      setStatusMessage('Neuraler Link stabil');
      speakText(fullText);

      // Daten am Ende vollständig an den Server übergeben
      await fetch(`${NODE_SERVER}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'eve', text: fullText, timestamp: timeStr })
      });

    } catch (err) {
      console.error('[Chat Error]', err);
      setLoading(false);
      setStatusMessage('Verbindungsstörung');
      const errReply = 'Verbindungsfehler zum Core-Server. Bitte Status von Node 1 prüfen.';
      
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].sender === 'eve') {
          updated[lastIdx] = { ...updated[lastIdx], text: errReply };
        }
        return updated;
      });
      speakText(errReply);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#030406] text-slate-100 font-sans relative overflow-hidden select-text">
      
      {/* ChatGPT-Style Top Header Bar */}
      <header className="h-14 border-b border-white/[0.08] bg-[#030406]/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-wide text-slate-100 font-mono">EVE 2.5</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              Core
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <Radio className="w-3 h-3 text-[#00ffcc] animate-pulse" />
            <span className="text-[#00ffcc]">{statusMessage}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoVoice(!autoVoice)}
            className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              autoVoice 
                ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff]' 
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border-white/[0.08]'
            }`}
            title="Sprachausgabe umschalten"
          >
            {autoVoice ? <Volume2 className="w-4 h-4 text-[#00f0ff]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 font-mono text-xs bg-white/[0.03] border border-white/[0.08] px-2.5 py-1.5 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.8)]' : 'bg-[#fbbf24]'}`}></span>
            <span className="text-slate-400 text-[10px] uppercase font-bold hidden sm:inline">
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* ChatGPT Chat Log Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
          {chatMessages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? 'items-end max-w-[80%]' : 'items-start max-w-[88%]'}`}>
                  {isUser ? (
                    <div className="bg-[#6366f1]/20 border border-[#6366f1]/40 text-slate-100 p-3.5 px-4 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-md">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="text-slate-200 text-sm leading-relaxed py-1 space-y-2">
                      <p className="whitespace-pre-wrap">{msg.text || (loading && idx === chatMessages.length - 1 ? '' : '...')}</p>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                    {msg.timestamp || 'Live'}
                  </span>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#00ffcc] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && chatMessages[chatMessages.length - 1]?.text === '' && (
            <div className="flex gap-4 w-full justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                <span className="w-2 h-2 bg-[#00f0ff] rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-[#00f0ff] rounded-full animate-pulse [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-[#00f0ff] rounded-full animate-pulse [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ChatGPT Floating Input Bar */}
      <footer className="w-full shrink-0 p-4 bg-gradient-to-t from-[#030406] via-[#030406] to-transparent">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {showCommands && (
            <div className="absolute bottom-full mb-3 left-0 right-0 bg-[#0a0d14] border border-[#00f0ff]/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 font-mono text-[10px] text-[#00f0ff] mb-1">
                <Command className="w-3.5 h-3.5" />
                <span>BEFEHLE</span>
              </div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {filteredCmds.map((item, index) => (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => selectCommand(item.cmd)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all text-left cursor-pointer ${
                      index === selectedIndex
                        ? 'bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]'
                        : 'hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-[#00f0ff]">{item.cmd}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form 
            onSubmit={handleSend}
            className="relative flex items-end bg-[#0a0d14] border border-white/[0.12] focus-within:border-[#00f0ff]/50 rounded-3xl p-2.5 px-4 shadow-2xl transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht an EVE..."
              className="w-full bg-transparent border-none text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none resize-none max-h-48 min-h-[24px] py-1 font-sans leading-relaxed"
            />

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/40 animate-pulse'
                    : 'text-slate-400 hover:text-[#00f0ff] hover:bg-white/[0.06]'
                }`}
                title="Spracheingabe"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:opacity-90 text-[#030406] flex items-center justify-center transition-all shadow-md disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          <p className="text-[10px] text-center text-slate-600 mt-2 font-mono">
            EVE v2.5 Hybrid Core • Live SSE Engine Active
          </p>
        </div>
      </footer>
    </div>
  );
}