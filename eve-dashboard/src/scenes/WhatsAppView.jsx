import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  User, 
  Search, 
  Phone, 
  PhoneOff, 
  Paperclip, 
  Radio, 
  FileText, 
  Download,
  CheckCheck,
  AlertTriangle,
  Loader2,
  UserPlus
} from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function WhatsAppView() {
  const { NODE_SERVER } = useEVE();
  const [chats, setChats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' oder 'contacts'
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [sessionState, setSessionState] = useState('SYNCING');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const baseUrl = NODE_SERVER ? NODE_SERVER.replace(/\/$/, '') : '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatId = (chat) => {
    if (!chat) return '';
    if (typeof chat.id === 'object' && chat.id._serialized) return chat.id._serialized;
    if (typeof chat.id === 'string') return chat.id;
    return chat.id || '';
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchChats = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${baseUrl}/api/whatsapp/chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
        if (data.sessionState) {
          setSessionState(data.sessionState);
        }
      } else {
        setSessionState('UNREACHABLE');
      }
    } catch (e) {
      console.error('[WhatsApp] Fehler beim Laden der Chats:', e);
      setSessionState('UNREACHABLE');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Neu: Lädt die iCloud-Kontakte aus dem Backend
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/contacts/`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error('[WhatsApp] Fehler beim Laden der Kontakte:', e);
    }
  };

  const fetchMessages = async (chat) => {
    const cId = getChatId(chat);
    if (!cId) return;
    try {
      const res = await fetch(`${baseUrl}/api/whatsapp/messages/${encodeURIComponent(cId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('[WhatsApp] Fehler beim Laden der Nachrichten:', e);
    }
  };

  // Initiales Laden (Chats + Kontakte) und Polling (nur Chats)
  useEffect(() => {
    fetchChats();
    fetchContacts();
    const interval = setInterval(() => {
      fetchChats();
    }, 4000);
    return () => clearInterval(interval);
  }, [NODE_SERVER]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      const interval = setInterval(() => fetchMessages(selectedChat), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Neu: Chat aus Kontaktliste heraus starten
  const startNewChat = (contact) => {
    const newChatObj = {
      id: contact.phone,
      name: contact.name,
      lastMessage: { body: 'Neuer Chat', timestamp: Math.floor(Date.now() / 1000) }
    };
    setSelectedChat(newChatObj);
    setActiveTab('chats'); // Wechselt automatisch zurück zur Chat-Ansicht
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const cId = getChatId(selectedChat);
    if (!inputText.trim() || !cId) return;

    const textToSend = inputText;
    setInputText('');

    try {
      const res = await fetch(`${baseUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: cId, text: textToSend })
      });
      if (res.ok) {
        fetchMessages(selectedChat);
        fetchChats(); // Aktualisiert die Chat-Liste links (wichtig für neue Chats)
      }
    } catch (e) {
      console.error('Fehler beim Senden:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const cId = getChatId(selectedChat);
    if (!file || !cId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      const isImage = file.type.startsWith('image/');
      const endpoint = isImage ? '/api/whatsapp/send-image' : '/api/whatsapp/send-file';

      try {
        await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: cId,
            fileUrl: base64Data,
            caption: file.name,
            filename: file.name
          })
        });
        fetchMessages(selectedChat);
      } catch (err) {
        console.error('Upload Fehler:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredChats = chats.filter(c => {
    const name = c.name || c.pushname || getChatId(c);
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredContacts = contacts.filter(c => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
  });

  return (
    <div className="w-full h-full flex bg-[#050811]/90 rounded-xl overflow-hidden border border-slate-800/60 backdrop-blur-md relative shadow-2xl">
      
      {/* SEITENLEISTE */}
      <div className="w-1/3 border-r border-slate-800/80 flex flex-col bg-slate-950/60">
        
        <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${sessionState === 'WORKING' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="font-bold text-xs text-slate-200 tracking-wider uppercase font-mono">WhatsApp Live</span>
          </div>
          <button 
            onClick={fetchChats} 
            className="p-1.5 hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/40">
          <button 
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 text-xs font-semibold font-mono border-b-2 transition-all ${
              activeTab === 'chats' ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Chats ({chats.length})
          </button>
          <button 
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 text-xs font-semibold font-mono border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'contacts' ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Kontakte ({contacts.length})
          </button>
        </div>

        {/* STATUS BANNER */}
        {sessionState !== 'WORKING' && (
          <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] font-mono flex items-center gap-2">
            {sessionState === 'UNREACHABLE' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Gateway Offline (Port 3000 prüfen)</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                <span>Status: {sessionState} (Handy verbindet...)</span>
              </>
            )}
          </div>
        )}

        {/* Suche */}
        <div className="p-2.5 border-b border-slate-800/50">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <input
              type="text"
              placeholder={activeTab === 'chats' ? "Chat suchen..." : "Kontakt suchen..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-200 w-full placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Listen-Bereich (Chats ODER Kontakte) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30 custom-scrollbar">
          {activeTab === 'chats' ? (
            filteredChats.length > 0 ? (
              filteredChats.map((chat, idx) => {
                const cId = getChatId(chat);
                const isSelected = getChatId(selectedChat) === cId;
                const displayName = chat.name || chat.pushname || cId.split('@')[0];
                const lastMsgText = chat.lastMessage?.body || chat.lastMessage?.text || 'Keine Nachrichten';

                return (
                  <button
                    key={cId || idx}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-3 text-left flex items-center gap-3 transition-all cursor-pointer group ${
                      isSelected 
                        ? 'bg-emerald-950/40 border-l-2 border-emerald-400' 
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <div className={`p-2.5 rounded-2xl border ${
                      isSelected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {displayName}
                        </span>
                        {chat.lastMessage?.timestamp && (
                          <span className="text-[9px] font-mono text-slate-500">
                            {formatTime(chat.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate font-sans">
                        {lastMsgText}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                <span>Warte auf Synchronisation...</span>
              </div>
            )
          ) : (
            // Kontaktliste Rendering
            filteredContacts.length > 0 ? (
              filteredContacts.map((contact, idx) => (
                <button
                  key={contact.phone || idx}
                  onClick={() => startNewChat(contact)}
                  className="w-full p-3 text-left flex items-center gap-3 transition-all cursor-pointer hover:bg-slate-900/40"
                >
                  <div className="p-2.5 rounded-2xl border bg-slate-800/60 border-slate-700/50 text-emerald-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {contact.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block truncate">
                      {contact.phone}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">Keine Kontakte gefunden</div>
            )
          )}
        </div>
      </div>

      {/* CHATBEREICH */}
      <div className="flex-1 flex flex-col bg-slate-950/30 relative">
        {selectedChat ? (
          <>
            <div className="p-3 bg-slate-900/80 border-b border-slate-800/80 text-xs font-bold text-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-semibold">
                    {selectedChat.name || selectedChat.pushname || getChatId(selectedChat)}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online über Gateway
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsInCall(!isInCall)}
                className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isInCall ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                }`}
              >
                {isInCall ? <PhoneOff className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-mono">{isInCall ? 'Auflegen' : 'Anrufen'}</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              {messages.map((msg, idx) => {
                const isUser = msg.fromMe;
                const hasMedia = msg.hasMedia || msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.mediaUrl;
                const bodyText = msg.body || msg.text || '';
                const msgKey = typeof msg.id === 'object' ? msg.id._serialized : (msg.id || idx);

                return (
                  <div key={msgKey} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-xs backdrop-blur-md shadow-lg ${
                      isUser 
                        ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-100 rounded-tr-none' 
                        : 'bg-slate-900/90 border border-slate-700/60 text-slate-200 rounded-tl-none'
                    }`}>
                      {hasMedia && (msg.mediaUrl || bodyText.startsWith('http') || bodyText.startsWith('data:image')) ? (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
                          <img src={msg.mediaUrl || bodyText} alt="WhatsApp Media" className="max-h-60 w-full object-cover" />
                        </div>
                      ) : hasMedia ? (
                        <div className="mb-2 p-2 bg-slate-950/60 rounded-xl border border-white/10 flex items-center gap-2 text-slate-300 text-[11px]">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span className="flex-1 truncate">{msg.filename || 'Anhang / Datei'}</span>
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ) : null}

                      {bodyText && !bodyText.startsWith('data:image') && <p className="leading-relaxed whitespace-pre-wrap">{bodyText}</p>}
                      
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-mono text-slate-400/80">
                        <span>{formatTime(msg.timestamp)}</span>
                        {isUser && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,application/pdf"
            />

            <form onSubmit={handleSend} className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700/60"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="WhatsApp Nachricht schreiben..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600/30 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Senden</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 gap-3">
            <MessageSquare className="w-10 h-10 text-emerald-500/60" />
            <span className="text-xs font-mono text-slate-400 font-semibold">Wähle einen Chat oder starte einen neuen über 'Kontakte'</span>
          </div>
        )}
      </div>

    </div>
  );
}