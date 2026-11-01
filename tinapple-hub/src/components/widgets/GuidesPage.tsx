import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  Search,
  Download,
  Sparkles,
  Terminal,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Globe,
  Radio,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { GUIDES_CATALOG, GuideArticle } from '../../data/guidesCatalog';

interface GuidesPageProps {
  initialGuideId?: string | null;
  onSelectGuide?: (id: string) => void;
}

export const GuidesPage: React.FC<GuidesPageProps> = ({
  initialGuideId,
  onSelectGuide,
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialGuideId || 'jellyfin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isMobileReaderOpen, setIsMobileReaderOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialGuideId) {
      setSelectedId(initialGuideId);
      setIsMobileReaderOpen(true);
    }
  }, [initialGuideId]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGuideSelect = (id: string) => {
    setSelectedId(id);
    setIsMobileReaderOpen(true);
    if (onSelectGuide) {
      onSelectGuide(id);
    }
    // Update URL hash / query param without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'guides');
      url.searchParams.set('guide', id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleBackToCatalog = () => {
    setIsMobileReaderOpen(false);
  };

  const filteredGuides = useMemo(() => {
    return GUIDES_CATALOG.filter((guide) => {
      const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        guide.title.toLowerCase().includes(q) ||
        guide.subtitle.toLowerCase().includes(q) ||
        guide.endpoints.some((e) => e.label.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)) ||
        guide.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) ||
        guide.clientApps.some((c) => c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const currentGuide = useMemo(() => {
    return GUIDES_CATALOG.find((g) => g.id === selectedId) || GUIDES_CATALOG[0];
  }, [selectedId]);

  const categories = [
    { id: 'all', label: 'All Guides', count: GUIDES_CATALOG.length },
    { id: 'media', label: 'Media & Streaming', count: GUIDES_CATALOG.filter((g) => g.category === 'media').length },
    { id: 'manga', label: 'Manga & Comics', count: GUIDES_CATALOG.filter((g) => g.category === 'manga').length },
    { id: 'cloud', label: 'Cloud & Sync', count: GUIDES_CATALOG.filter((g) => g.category === 'cloud').length },
    { id: 'security', label: 'Security & Mesh', count: GUIDES_CATALOG.filter((g) => g.category === 'security').length },
    { id: 'chat', label: 'Chat & Bridges', count: GUIDES_CATALOG.filter((g) => g.category === 'chat').length },
  ];

  return (
    <div className="w-full space-y-5 pb-16">
      {/* 1. Header Banner & Quick Controls */}
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-900/40 border border-purple-500/20 p-5 sm:p-7 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full-Stack Appliance Documentation</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Interactive Homelab Guides</span>
            </h1>
            <p className="text-xs sm:text-sm text-tinapple-subtext font-mono max-w-2xl leading-relaxed">
              Step-by-step installation walkthroughs, direct local/Tailscale endpoints, mobile client setups, and performance tuning configurations.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-80 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guides, endpoints, apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-purple-500/25 border border-purple-500/50 text-purple-200 shadow-sm shadow-purple-500/20'
                  : 'bg-slate-900/60 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategory === cat.id ? 'bg-purple-500/40 text-purple-100' : 'bg-white/[0.06] text-zinc-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Dual Panel Layout (Responsive: Stack on Mobile, Side-by-Side on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Guides Master Catalog (Hidden on small mobile if reader is open) */}
        <div className={`lg:col-span-4 xl:col-span-4 space-y-2.5 ${isMobileReaderOpen ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Available Appliances ({filteredGuides.length})</span>
            </span>
            {searchQuery && (
              <span className="text-[11px] font-mono text-purple-300">
                Found {filteredGuides.length}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {filteredGuides.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/[0.06] space-y-2">
                <Search className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs font-mono text-zinc-400">No guides found matching &quot;{searchQuery}&quot;</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-mono hover:bg-purple-500/30 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredGuides.map((guide) => {
                const isSelected = guide.id === selectedId;
                return (
                  <div
                    key={guide.id}
                    onClick={() => handleGuideSelect(guide.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99] ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40'
                        : 'bg-slate-900/60 border-white/[0.08] hover:border-white/20 hover:bg-slate-900/90'
                    }`}
                  >
                    {/* Active Indicator Bar */}
                    {isSelected && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: guide.accentColor }}
                      />
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-md transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${guide.accentColor}18`,
                          borderColor: `${guide.accentColor}40`,
                        }}
                      >
                        {guide.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                            {guide.title}
                          </h3>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-purple-400 translate-x-0.5' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                        </div>
                        <p className="text-[11px] text-tinapple-subtext line-clamp-2 leading-relaxed">
                          {guide.subtitle}
                        </p>

                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-zinc-400 uppercase">
                            {guide.category}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {guide.steps.length} steps • {guide.clientApps.length} apps
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Guide Full Content Reader */}
        <div className={`lg:col-span-8 xl:col-span-8 ${!isMobileReaderOpen ? 'hidden lg:block' : 'block'}`}>
          {/* Mobile Back to Catalog Button (Only visible on small screens when reader is open) */}
          <div className="lg:hidden mb-3">
            <button
              onClick={handleBackToCatalog}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 border border-white/15 text-purple-300 font-mono text-xs font-bold shadow-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← Back to All Guides Catalog</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-white/[0.08] p-5 sm:p-7 backdrop-blur-xl shadow-2xl space-y-7">
            {/* Guide Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg"
                  style={{
                    backgroundColor: `${currentGuide.accentColor}20`,
                    borderColor: `${currentGuide.accentColor}50`,
                  }}
                >
                  {currentGuide.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/[0.06] border border-white/10 text-tinapple-gold">
                      {currentGuide.category}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Verified Appliance
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {currentGuide.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-tinapple-subtext font-mono mt-1 leading-relaxed">
                    {currentGuide.subtitle}
                  </p>
                </div>
              </div>

              {currentGuide.htmlGuidePath && (
                <a
                  href={currentGuide.htmlGuidePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold transition-all shrink-0 active:scale-95"
                  title="Open standalone HTML documentation page"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-300" />
                  <span>Standalone HTML Guide</span>
                  <ExternalLink className="w-3 h-3 text-purple-400" />
                </a>
              )}
            </div>

            {/* Section 1: Endpoints & Local Access URLs */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400" />
                <span>1. Verified Network Endpoints & Ports</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentGuide.endpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] hover:border-sky-500/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
                        {ep.label}
                      </span>
                      <code className="text-xs font-mono text-sky-300 truncate block select-all">
                        {ep.value}
                      </code>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ep.value.startsWith('http') && (
                        <a
                          href={ep.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-sky-300 hover:bg-white/[0.06] transition-colors"
                          title="Open URL in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleCopy(ep.value)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
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
            </div>

            {/* Section 2: Step-by-Step Installation Walkthrough */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-tinapple-gold" />
                <span>2. Step-by-Step Setup & Configuration</span>
              </h3>

              <div className="space-y-3.5">
                {currentGuide.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-tinapple-gold/15 border border-tinapple-gold/30 text-tinapple-gold flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {st.title}
                        </h4>
                        <p className="text-xs text-zinc-300 font-mono mt-1 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                    </div>

                    {/* Step Code Block */}
                    {st.code && (
                      <div className="p-3 rounded-xl bg-[#06080e] border border-white/10 flex items-center justify-between gap-2 overflow-x-auto">
                        <code className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all select-all">
                          {st.code}
                        </code>
                        <button
                          onClick={() => handleCopy(st.code!)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                          title="Copy command"
                        >
                          {copiedCode === st.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Step Tip Callout */}
                    {st.tip && (
                      <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                        <span className="leading-relaxed">{st.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Client Applications & Downloads Matrix */}
            {currentGuide.clientApps.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>3. Client Applications & Downloads</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentGuide.clientApps.map((ca, idx) => (
                    <a
                      key={idx}
                      href={ca.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08] hover:border-emerald-500/40 hover:bg-slate-950/90 transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{ca.name}</span>
                            {ca.badge && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                {ca.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 block truncate">
                            {ca.platform}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Special Configurations & Performance Tuning */}
            {currentGuide.specialConfigs.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>4. Expert Tuning & Special Configurations</span>
                </h3>

                <div className="space-y-3">
                  {currentGuide.specialConfigs.map((sc, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2.5"
                    >
                      <h4 className="text-xs font-bold text-purple-200 font-mono flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>{sc.title}</span>
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                        {sc.description}
                      </p>
                      {sc.code && (
                        <div className="p-3 rounded-xl bg-[#06080e] border border-purple-500/30 flex items-center justify-between gap-2 overflow-x-auto">
                          <code className="text-xs font-mono text-purple-300 whitespace-pre-wrap break-all select-all">
                            {sc.code}
                          </code>
                          <button
                            onClick={() => handleCopy(sc.code!)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                            title="Copy snippet"
                          >
                            {copiedCode === sc.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
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

export default GuidesPage;
