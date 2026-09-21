import React from 'react';
import { RefreshCw, ArrowUpRight, Coins, BarChart3, AlertCircle } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function BazaarScene() {
  const { bazaarData = [], bazaarLastUpdated, refreshBazaar } = useEVE();

  // Sicherstellen, dass bazaarData immer ein Array ist
  const flipsList = Array.isArray(bazaarData) ? bazaarData : bazaarData?.flips || [];

  // Hilfsfunktion zur sicheren Zahlenformatierung
  const formatCoins = (value) => {
    if (value === undefined || value === null) return '0';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0' : num.toLocaleString('de-DE');
  };

  return (
    <div className="animate-fade-in h-full flex flex-col gap-4 text-slate-100">
      
      {/* Header Bar Container */}
      <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffcc] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]"></span>
          </span>
          <span className="font-bold text-xs tracking-wider uppercase font-mono text-slate-200">
            Live Bazaar Monitor
          </span>
        </div>

        {/* Sekundär-Button / Refresh */}
        <button 
          onClick={refreshBazaar}
          className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
          <span className="uppercase tracking-wider text-[10px]">
            Stand: {bazaarLastUpdated || 'Live'}
          </span>
        </button>
      </div>

      {/* Live Grid */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1">
        {flipsList.length === 0 ? (
          /* Empty State / Fallback Card */
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 font-mono text-xs gap-3 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-5 shadow-2xl">
            <AlertCircle className="w-8 h-8 text-[#ff3366] animate-pulse" />
            <span className="uppercase tracking-wider font-bold text-slate-300">
              Lade Live-Marktdaten vom Worker (Port 5001)...
            </span>
            <span className="uppercase tracking-wider text-[10px] text-slate-500">
              Prüfe, ob der Service 'hypixel-worker' läuft.
            </span>
          </div>
        ) : (
          flipsList.map((f, i) => {
            // Normierung der API-Keys
            const itemName = f.item_name || f.itemName || f.item_id || f.itemId || 'Unbekanntes Item';
            const volume = f.volume || f.volume24h || 0;
            const marginPercent = f.margin_percent || f.marginPercent || f.margin_pct || 0;
            const buyPrice = f.buy_price ?? f.buyPrice ?? f.instant_buy ?? 0;
            const sellPrice = f.sell_price ?? f.sellPrice ?? f.instant_sell ?? 0;

            return (
              <div 
                key={f.item_id || f.itemId || i} 
                className="bg-white/[0.03] border border-white/[0.08] hover:border-[#00f0ff]/40 backdrop-blur-2xl rounded-2xl p-5 shadow-2xl hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all flex flex-col justify-between group"
              >
                {/* Card Header & Margin Badge */}
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    {/* Standard EVE Header Layout */}
                    <div className="flex items-center gap-2 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
                      <div className="p-1.5 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                        <Coins className="w-4 h-4 text-[#00f0ff]" />
                      </div>
                      <span className="truncate max-w-[160px] text-slate-100 group-hover:text-[#00f0ff] transition-colors">
                        {itemName}
                      </span>
                    </div>

                    {/* Status Margin Badge */}
                    <span className="inline-flex items-center gap-1 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 px-2.5 py-1 rounded-lg text-xs font-bold font-mono shrink-0 shadow-[0_0_10px_rgba(0,255,204,0.15)]">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      +{typeof marginPercent === 'number' ? marginPercent.toFixed(1) : marginPercent}%
                    </span>
                  </div>

                  {/* Volume Meta Info */}
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Volumen: <strong className="text-slate-300 font-mono">{formatCoins(volume)}</strong></span>
                  </div>
                </div>

                {/* Price Grid (Sunk-In Look Elements) */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
                  <div className="bg-[#030406] border border-white/[0.08] rounded-xl p-2.5 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
                    <span className="uppercase tracking-wider font-mono text-[10px] text-slate-500 block mb-0.5">
                      Buy (Instant)
                    </span>
                    <span className="text-[#00f0ff] font-bold text-xs font-mono block truncate">
                      {formatCoins(buyPrice)} <span className="text-[10px] text-slate-400 font-normal">Coins</span>
                    </span>
                  </div>

                  <div className="bg-[#030406] border border-white/[0.08] rounded-xl p-2.5 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
                    <span className="uppercase tracking-wider font-mono text-[10px] text-slate-500 block mb-0.5">
                      Sell (Instant)
                    </span>
                    <span className="text-[#6366f1] font-bold text-xs font-mono block truncate">
                      {formatCoins(sellPrice)} <span className="text-[10px] text-slate-400 font-normal">Coins</span>
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}