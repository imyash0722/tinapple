import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  Search,
  Tv,
  Book,
  MessageSquare,
  FileText,
  KeyRound,
  FolderSync,
  ShieldCheck,
  Film,
  Download,
  Sparkles,
  Terminal,
  Sliders,
  ChevronRight,
  Monitor,
  Smartphone,
  Youtube,
} from 'lucide-react';

import { GUIDES_CATALOG, GuideArticle } from "../../data/guidesCatalog";

interface GuidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGuideId?: string | null;
}

export const GuidesModal: React.FC<GuidesModalProps> = ({
  isOpen,
  onClose,
  initialGuideId,
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialGuideId || 'jellyfin');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialGuideId) {
      setSelectedId(initialGuideId);
    }
  }, [initialGuideId]);

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return GUIDES_CATALOG;
    return GUIDES_CATALOG.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const currentGuide = useMemo(() => {
    return GUIDES_CATALOG.find((g) => g.id === selectedId) || GUIDES_CATALOG[0];
  }, [selectedId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl bg-[#090b11] border border-tinapple-border/90 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-[#11151f] border-b border-tinapple-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tinapple-gold/15 border border-tinapple-gold/30 flex items-center justify-center text-tinapple-gold shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Client Apps & Service Guides</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-tinapple-green/15 text-tinapple-green border border-tinapple-green/30 font-semibold">
                  Comprehensive Manual
                </span>
              </h2>
              <p className="text-xs text-tinapple-subtext font-mono">
                Hardware-accelerated player setup, mobile app presets, and expert configurations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Guide Selection (constrained max height on phones to leave ample space for reading) */}
          <div className="w-full md:w-72 lg:w-80 bg-[#0d1017] border-b md:border-b-0 md:border-r border-tinapple-border flex flex-col shrink-0 max-h-44 sm:max-h-56 md:max-h-none">
            {/* Search Input */}
            <div className="p-3 border-b border-tinapple-border/70">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter guides & apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/70 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-tinapple-gold transition-colors"
                />
              </div>
            </div>

            {/* Guide List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {filteredGuides.map((guide) => {
                const isSelected = guide.id === currentGuide.id;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelectedId(guide.id)}
                    className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-slate-800 to-slate-800/80 border border-tinapple-gold/40 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {guide.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold font-mono truncate text-white">
                          {guide.title.split('&')[0].trim()}
                        </span>
                        {isSelected && (
                          <ChevronRight className="w-3.5 h-3.5 text-tinapple-gold shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {guide.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Panel: Detailed Guide Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 scrollbar-thin bg-gradient-to-b from-[#090b11] to-[#0c0e15]">
            {/* Guide Header Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-tinapple-border/80">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg"
                  style={{
                    backgroundColor: `${currentGuide.accentColor}18`,
                    borderColor: `${currentGuide.accentColor}40`,
                  }}
                >
                  {currentGuide.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    {currentGuide.title}
                  </h3>
                  <p className="text-xs text-tinapple-subtext mt-1 leading-relaxed">
                    {currentGuide.subtitle}
                  </p>
                </div>
              </div>

              {currentGuide.htmlGuidePath && (
                <a
                  href={currentGuide.htmlGuidePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/30 hover:bg-tinapple-gold/25 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Standalone Page</span>
                </a>
              )}
            </div>

            {/* Endpoints & Direct Connection URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentGuide.endpoints.map((ep, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-tinapple-border/70 flex flex-col justify-between gap-2"
                >
                  <span className="text-[10px] font-mono text-tinapple-muted uppercase tracking-wider">
                    {ep.label}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-sky-300 font-bold truncate">
                      {ep.value}
                    </code>
                    <button
                      onClick={() => handleCopy(ep.value)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0"
                      title="Copy endpoint"
                    >
                      {copiedCode === ep.value ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Step-by-Step Setup Pipeline */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-tinapple-gold" />
                <span>1. Setup Instructions & Connection</span>
              </h4>

              <div className="space-y-3">
                {currentGuide.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-tinapple-gold/20 text-tinapple-gold text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">{st.title}</span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed pl-8">
                      {st.description}
                    </p>

                    {st.code && (
                      <div className="ml-8 mt-2 p-3 rounded-xl bg-[#07090e] border border-slate-800 flex items-center justify-between gap-3 font-mono text-xs text-sky-300 overflow-x-auto">
                        <code className="whitespace-pre-wrap">{st.code}</code>
                        <button
                          onClick={() => handleCopy(st.code!)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 text-[11px] font-sans flex items-center gap-1 shrink-0 transition-colors"
                        >
                          {copiedCode === st.code ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {st.tip && (
                      <div className="ml-8 text-[11px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>{st.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Client Applications Matrix */}
            {currentGuide.clientApps.length > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>2. Client Applications & Downloads</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentGuide.clientApps.map((ca, i) => (
                    <a
                      key={i}
                      href={ca.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-tinapple-border/70 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{ca.name}</span>
                            {ca.badge && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {ca.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">{ca.platform}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Expert Tuning & Special Configurations */}
            {currentGuide.specialConfigs.length > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>3. Special Configurations & Performance Tuning</span>
                </h4>

                <div className="space-y-3">
                  {currentGuide.specialConfigs.map((sc, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2"
                    >
                      <h5 className="text-xs font-bold text-purple-200 font-mono">
                        {sc.title}
                      </h5>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {sc.description}
                      </p>
                      {sc.code && (
                        <div className="p-2.5 rounded-xl bg-[#07090e] border border-purple-500/30 flex items-center justify-between gap-2 font-mono text-xs text-purple-300">
                          <code>{sc.code}</code>
                          <button
                            onClick={() => handleCopy(sc.code!)}
                            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                          >
                            {copiedCode === sc.code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
