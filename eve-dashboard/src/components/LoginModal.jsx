import React, { useState } from 'react';
import { ShieldCheck, User, Lock, AlertCircle, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function LoginModal() {
  const { isAuthenticated, login } = useEVE();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Nutzen der zentralen login-Funktion aus dem EVEContext
      const result = await login(username, password);

      if (!result.success) {
        setErrorMsg(result.message || 'Zugriff verweigert: Ungültige Zugangsdaten');
      }
    } catch (err) {
      console.error('[Auth Error]', err);
      setErrorMsg('Verbindungsfehler zum EVE-Auth-Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#030406]/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4 select-none animate-fade-in font-mono">
      
      {/* Ambient Glows im Hintergrund */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-sm bg-white/[0.03] border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-3xl text-center overflow-hidden">
        
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent drop-shadow-[0_0_8px_#00f0ff]" />

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 mb-6 drop-shadow-[0_0_8px_rgba(0,240,255,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]"></span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#00f0ff] font-semibold">
            EVE Auth Subsystem
          </span>
        </div>

        {/* Shield Icon Container */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00f0ff]/20 to-[#6366f1]/20 border border-[#00f0ff]/30 flex items-center justify-center mx-auto mb-5 drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <ShieldCheck className="w-8 h-8 text-[#00f0ff]" />
        </div>

        <h2 className="text-lg font-bold text-slate-100 tracking-wider">EVE System Access</h2>
        <p className="text-[11px] text-slate-400 mt-1 mb-6">PAM / Linux Konto Authentifizierung</p>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Username Input */}
          <div className="relative text-left">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
              required
              autoFocus
            />
          </div>

          {/* Password Input mit Toggle-Option */}
          <div className="relative text-left">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-[#ff3366] text-xs bg-[#ff3366]/10 border border-[#ff3366]/30 p-2.5 rounded-2xl text-left drop-shadow-[0_0_8px_rgba(255,51,102,0.2)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="leading-tight text-[11px]">{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:opacity-90 text-[#030406] py-3 rounded-2xl font-extrabold text-xs transition-all drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] border border-[#00f0ff]/50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Prüfe Konto...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Anmelden</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-white/10 text-[9px] text-slate-500">
          Gesicherte Sitzung &bull; 256-Bit Encrypted Link
        </div>

      </div>
    </div>
  );
}