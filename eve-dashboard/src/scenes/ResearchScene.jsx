import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, BookOpen, ExternalLink, Eye, FileCode, FolderOpen, Calendar } from 'lucide-react';
import { useEVE } from '../context/EVEContext';

export default function ResearchScene() {
  const { reportsList, fetchReports, NODE_SERVER } = useEVE();
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Vorschau-Modus: 'html' für Webansicht oder 'pdf' für den PDF-Viewer
  const [previewMode, setPreviewMode] = useState('html'); 

  // Initialer Abruf der Berichte-Liste
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (reportsList.length > 0 && !selectedReport) {
      setSelectedReport(reportsList[0]);
    }
  }, [reportsList, selectedReport]);

  const reportSlug = selectedReport ? selectedReport.filename.replace('.html', '') : '';
  const htmlPreviewUrl = selectedReport ? `${NODE_SERVER}/preview/${reportSlug}` : '';
  const pdfDownloadUrl = selectedReport ? `${NODE_SERVER}/api/files/download?path=Eve_Enzyklopaedie_${reportSlug}.pdf` : '';

  return (
    <div className="animate-fade-in h-full flex flex-col gap-3.5 select-none font-sans">
      {/* Top Header Bar */}
      <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-xl text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <FileText className="w-5 h-5 text-[#00f0ff]" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              ENZYKLOPÄDIE & RECHERCHE-TERMINAL
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
              {selectedReport ? selectedReport.title : 'Kein Bericht ausgewählt'}
            </p>
          </div>
        </div>

        {/* Action Buttons & Modus-Umschalter */}
        <div className="flex items-center gap-2">
          {/* Umschalter HTML / PDF Vorschau */}
          {selectedReport && (
            <div className="flex bg-[#030406] border border-white/[0.08] p-1 rounded-xl gap-1 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)]">
              <button
                onClick={() => setPreviewMode('html')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  previewMode === 'html'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">HTML</span>
              </button>
              <button
                onClick={() => setPreviewMode('pdf')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  previewMode === 'pdf'
                    ? 'bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/40 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">PDF Vorschau</span>
              </button>
            </div>
          )}

          <button
            onClick={async () => {
              setLoading(true);
              await fetchReports();
              setLoading(false);
            }}
            className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl p-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 text-[#00f0ff] ${loading ? 'animate-spin' : ''}`} />
          </button>

          {selectedReport && (
            <>
              <a
                href={htmlPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-3 py-2 text-xs font-mono transition border border-white/[0.08] flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span className="uppercase tracking-wider">Tab öffnen</span>
              </a>

              <a
                href={pdfDownloadUrl}
                className="bg-gradient-to-r from-[#00f0ff] to-[#6366f1] hover:from-[#00f0ff]/90 hover:to-[#6366f1]/90 text-[#030406] font-extrabold rounded-xl px-4 py-2 text-xs font-mono transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="uppercase tracking-wider">Download</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace with Sidebar & Viewer */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3.5 overflow-hidden">
        {/* Reports Sidebar */}
        <div className="md:col-span-1 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-3 shadow-2xl overflow-y-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-[#00f0ff] font-bold text-xs tracking-wider uppercase font-mono">
            <FolderOpen className="w-4 h-4 text-[#00f0ff]" />
            <span>VERFÜGBARE BERICHTE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {reportsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs uppercase tracking-wider">
                Keine Berichte gefunden
              </div>
            ) : (
              reportsList.map((rep, idx) => {
                const isSelected = selectedReport?.filename === rep.filename;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedReport(rep)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer font-mono ${
                      isSelected
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-slate-100 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold line-clamp-2 leading-snug font-sans">
                      {rep.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#00ffcc]" />
                      {rep.date}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Full Size Report Viewer */}
        <div className="md:col-span-3 bg-[#030406] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative">
          {selectedReport ? (
            <iframe
              src={previewMode === 'html' ? htmlPreviewUrl : pdfDownloadUrl}
              title="Enzyklopädie Vorschau"
              className="w-full h-full border-none rounded-2xl bg-[#030406]"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-3">
              <BookOpen className="w-8 h-8 text-slate-700" />
              <span className="uppercase tracking-wider text-[10px] text-center max-w-sm">
                Wähle eine Recherche aus der Seitenleiste oder starte eine neue im Chat.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}