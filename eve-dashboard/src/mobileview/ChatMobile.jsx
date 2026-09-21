import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Terminal, 
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
  const { NODE_SERVER, user, chatMessages, addChatMessage, setActiveScene, isConnected } = useEVE();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  
  // States für psychologische Lebendigkeit & Immersion
  const [isTypingSimulated, setIsTypingSimulated] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Neuraler Link stabil');

  const [showCommands, setShowCommands] = useState(false);
  const [filteredCmds, setFilteredCmds] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, loading, isTypingSimulated]);

  // Dynamische Status-Rotation für psychologische Präsenz
  useEffect(() => {
    const statuses = [
      'Neuraler Link stabil',
      'Analysiere Vektor-Memory...',
      'Warte auf Befehl, Sir',
      'Subskripte aktiv & bereit',
      'Synapsen-Synchronisation optimal'
    ];
    const interval = setInterval(() => {
      if (!loading && !isTypingSimulated) {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        setStatusMessage(randomStatus);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [loading, isTypingSimulated]);

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
  };

  const selectCommand = (cmdText) => {
    setInput(cmdText + ' ');
    setShowCommands(false);
    inputRef.current?.focus();
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading || isTypingSimulated) return;

    const userText = input.trim();
    setInput('');
    setShowCommands(false);
    addChatMessage('user', userText);

    const lowerText = userText.toLowerCase();
    for (const [key, scene] of Object.entries(LOCAL_INTENTS)) {
      if (lowerText.includes(key)) {
        setActiveScene(scene);
        break;
      }
    }

    setLoading(true);
    setStatusMessage('Verarbeite Parameter & Inferenz...');

    try {
      const res = await fetch(`${NODE_SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema: userText, username: user?.username || 'renshiri' })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.response || `Anweisung verarbeitet, Sir.`;
        
        setLoading(false);
        setIsTypingSimulated(true);
        setStatusMessage('EVE formuliert Antwort...');

        setTimeout(() => {
          setIsTypingSimulated(false);
          setStatusMessage('Neuraler Link stabil');
          addChatMessage('eve', replyText);
          speakText(replyText);
        }, 800);

      } else {
        throw new Error(`Server Status: ${res.status}`);
      }
    } catch (err) {
      console.error('[Chat Error]', err);
      setLoading(false);
      setIsTypingSimulated(false);
      setStatusMessage('Verbindungsstörung');
      const errReply = 'Verbindungsfehler zum Core-Server. Bitte Status von Node 1 prüfen.';
      addChatMessage('eve', errReply);
      speakText(errReply);
    }
  };

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col justify-between select-none overflow-hidden bg-[#030406] text-slate-100 font-mono"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
        paddingLeft: 'calc(env(safe-area-inset-left) + 0.75rem)',
        paddingRight: 'calc(env(safe-area-inset-right) + 0.75rem)'
      }}
    >
      
      {/* Sci-Fi Top Header / Control Bar */}
      <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-2.5 md:p-3.5 shadow-2xl flex justify-between items-center relative overflow-hidden shrink-0 mb-2">
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#00f0ff]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-2.5 relative z-10 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#00f0ff] animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[10px] md:text-xs font-mono font-bold text-slate-100 tracking-wider uppercase truncate">
                EVE INTERFACE
              </h2>
              <span className="px-1 py-0.2 rounded text-[8px] md:text-[10px] font-mono bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                v2.5
              </span>
            </div>
            <p className="text-[9px] md:text-[10px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1 mt-0.5 truncate">
              <Radio className="w-2.5 h-2.5 text-[#00ffcc] animate-pulse shrink-0" />
              <span className="text-[#00ffcc] font-medium truncate">{statusMessage}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative z-10 shrink-0">
          <button
            onClick={() => setAutoVoice(!autoVoice)}
            className={`p-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              autoVoice 
                ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]' 
                : 'bg-white/[0.03] text-slate-400 border-white/[0.08]'
            }`}
            title="Automatische Sprachausgabe umschalten"
          >
            {autoVoice ? <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline uppercase tracking-wider text-[10px]">{autoVoice ? 'VOICE ON' : 'MUTED'}</span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-xs bg-[#030406] border border-white/[0.08] px-2 py-1.5 md:px-3 md:py-2 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ffcc] animate-pulse shadow-[0_0_8px_rgba(0,255,204,0.8)]' : 'bg-[#fbbf24]'}`}></span>
            <span className={isConnected ? 'text-[#00ffcc] font-mono text-[9px] md:text-[10px] uppercase tracking-wider hidden sm:inline' : 'text-[#fbbf24] font-mono text-[9px] md:text-[10px] uppercase tracking-wider hidden sm:inline'}>
              {isConnected ? 'ONLINE' : 'CACHE'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 min-h-0 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-3 md:p-4 overflow-y-auto shadow-2xl flex flex-col gap-3 scrollbar-thin scrollbar-thumb-white/10 mb-2">
        {chatMessages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-2.5 max-w-[90%] md:max-w-[85%] animate-fade-in ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xl ${
                  isUser
                    ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#00ffcc] shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-[#00f0ff]/20 border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </div>

              <div
                className={`p-3 md:p-4 rounded-2xl border text-[11px] md:text-xs leading-relaxed transition-all shadow-2xl ${
                  isUser
                    ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-slate-100 rounded-tr-none'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex justify-between items-center gap-4 mb-1.5 pb-1 border-b border-white/[0.08] font-mono text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400">
                  <span className={`font-bold ${isUser ? 'text-[#00ffcc]' : 'text-[#00f0ff]'}`}>
                    {isUser ? user?.username || 'Renshiri' : 'EVE Core'}
                  </span>
                  <span>{msg.timestamp || 'Live'}</span>
                </div>
                <p className="whitespace-pre-wrap select-text">{msg.text}</p>
              </div>
            </div>
          );
        })}

        {(loading || isTypingSimulated) && (
          <div className="flex gap-2.5 mr-auto items-center text-slate-300 font-mono text-xs bg-white/[0.03] p-2.5 md:p-3 rounded-2xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl animate-pulse">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-[#00f0ff] animate-spin" />
            </div>
            <span className="flex items-center gap-2">
              <span className="text-[#00f0ff] font-bold uppercase tracking-wider text-[9px] md:text-[10px]">EVE schreibt</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </span>
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Terminal Bar Input & Command Suggestions */}
      <div className="relative shrink-0 z-40">
        {showCommands && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#0a0d14] border border-[#00f0ff]/30 rounded-2xl p-2.5 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-md z-50 animate-fade-in">
            <div className="flex items-center gap-2 px-2 py-1 border-b border-white/10 uppercase tracking-wider font-mono text-[9px] text-[#00f0ff] mb-1.5">
              <Command className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>BEFEHLS-VORSCHLÄGE</span>
            </div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {filteredCmds.map((item, index) => (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => selectCommand(item.cmd)}
                  className={`flex items-center justify-between p-2 rounded-xl text-[11px] font-mono transition-all text-left cursor-pointer active:scale-98 ${
                    index === selectedIndex
                      ? 'bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'hover:bg-white/[0.06] text-slate-300 border border-transparent'
                  }`}
                >
                  <span className="font-bold text-[#00f0ff]">{item.cmd}</span>
                  <span className="uppercase tracking-wider font-mono text-[9px] text-slate-400 truncate max-w-[150px]">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 bg-white/[0.03] p-1.5 md:p-2 rounded-2xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
          <div className="relative flex-1 flex items-center">
            <Terminal className="w-3.5 h-3.5 text-[#00f0ff] absolute left-3" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Anweisung oder /..."
              className="w-full bg-[#030406] border border-white/[0.08] rounded-xl pl-8 pr-9 py-2 text-[11px] md:text-xs text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]/60 transition-all shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]"
            />

            <button
              type="button"
              onClick={toggleMic}
              className={`absolute right-2 p-1 rounded-lg transition-all cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/40 animate-pulse shadow-[0_0_15px_rgba(255,51,102,0.3)]'
                  : 'text-slate-500 hover:text-[#00f0ff]'
              }`}
              title={isListening ? 'Zuhören beenden' : 'Spracheingabe starten'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || isTypingSimulated || !input.trim()}
            className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-3.5 py-2 text-[10px] md:text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 active:scale-95"
          >
            <span className="uppercase tracking-wider hidden sm:inline">Senden</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}