// src/utils/speech.js

// 🎙️ 1. SPRACHE ZU TEXT (STT - Speech Recognition)
export const createSpeechRecognizer = (onResultCallback, onErrorCallback) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("Web Speech API wird von diesem Browser nicht unterstützt.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (onResultCallback) onResultCallback(transcript);
  };

  recognition.onerror = (err) => {
    console.error("Spracherkennungsfehler:", err);
    if (onErrorCallback) onErrorCallback(err);
  };

  return recognition;
};

// 🔊 2. TEXT ZU SPRACHE (TTS - Speech Synthesis)
export const speakText = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Sprachausgabe wird von diesem Browser nicht unterstützt.");
    return;
  }

  // Stoppe eventuell laufende Sprachausgaben
  window.speechSynthesis.cancel();

  // Bereinige Markdown-Zeichen für eine flüssige Sprachausgabe
  const cleanText = text
    .replace(/[*_~`#>-]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'de-DE';
  utterance.rate = 1.0; // Geschwindigkeit
  utterance.pitch = 0.95; // Etwas tiefere, markantere JARVIS-Stimme

  // Versuche eine erweiterte/hochwertige Stimme zu wählen
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => v.lang.startsWith('de') && (v.name.includes('Viktor') || v.name.includes('Anna') || v.name.includes('Google') || v.name.includes('Enhanced'))
  ) || voices.find((v) => v.lang.startsWith('de'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
};