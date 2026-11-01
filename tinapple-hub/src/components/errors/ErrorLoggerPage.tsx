import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  FileText,
  Terminal,
  Cpu,
  Wifi,
  Server,
  Globe,
  HardDrive,
  ShieldAlert,
  Play,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { api, SystemErrorItem, AIErrorAnalysis, AIStatus } from '../../services/api';

const GEMINI_KEY_STORAGE = 'tinapple_gemini_api_key';

export const ErrorLoggerPage: React.FC = () => {
  // State
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(15);

  // Expanded items
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Analysis state per item id
  const [analyses, setAnalyses] = useState<Record<string, AIErrorAnalysis>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});

  // API Key management
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [keyVisible, setKeyVisible] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });
  const [serverAIStatus, setServerAIStatus] = useState<AIStatus>({
    configured: false,
    maskedKey: '',
    model: 'gemini-2.5-flash',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load errors from backend
  const fetchErrors = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await api.getSystemErrors();
      setErrors(res.errors || []);
    } catch (e) {
      console.error('Failed to load system errors', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load server AI status
  const fetchAIStatus = useCallback(async () => {
    try {
      const status = await api.getAIStatus();
      setServerAIStatus(status);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchErrors();
    fetchAIStatus();
  }, [fetchErrors, fetchAIStatus]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;
    const interval = setInterval(() => {
      fetchErrors(true);
    }, autoRefreshSecs * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSecs, fetchErrors]);

  // Save API key
  const handleSaveApiKey = () => {
    try {
      if (apiKey.trim()) {
        localStorage.setItem(GEMINI_KEY_STORAGE, apiKey.trim());
        setTestStatus({ status: 'idle', message: 'API key saved to local browser storage.' });
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
        setTestStatus({ status: 'idle', message: 'API key removed.' });
      }
    } catch (e) {
      console.error('Failed to persist API key', e);
    }
  };

  // Test API key with Gemini
  const handleTestApiKey = async () => {
    setTestStatus({ status: 'testing', message: 'Testing connection to Google Gemini API...' });
    try {
      const res = await api.testAIKey(apiKey.trim());
      if (res.success) {
        setTestStatus({
          status: 'success',
          message: res.message || 'Connected successfully to Gemini 2.5 Flash!',
        });
      } else {
        setTestStatus({
          status: 'error',
          message: res.error || 'Failed to verify API key with Google Gemini.',
        });
      }
    } catch (e: any) {
      setTestStatus({
        status: 'error',
        message: e.message || 'Network error connecting to Gemini.',
      });
    }
  };

  // Clear key
  const handleClearApiKey = () => {
    setApiKey('');
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch {}
    setTestStatus({ status: 'idle', message: 'Key cleared.' });
  };

  // Analyze specific error
  const handleAnalyzeError = async (item: SystemErrorItem) => {
    setAnalyzingIds((prev) => ({ ...prev, [item.id]: true }));
    setAnalysisErrors((prev) => ({ ...prev, [item.id]: '' }));

    try {
      const analysis = await api.analyzeErrorWithAI(item, apiKey.trim());
      setAnalyses((prev) => ({ ...prev, [item.id]: analysis }));
      // Automatically expand card
      setExpandedIds((prev) => ({ ...prev, [item.id]: true }));
    } catch (e: any) {
      setAnalysisErrors((prev) => ({
        ...prev,
        [item.id]: e.message || 'AI analysis failed. Check your API key or network connection.',
      }));
    } finally {
      setAnalyzingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simulate a test error to verify logger pipeline
  const handleSimulateTestError = async () => {
    const simulated = {
      message: `Simulated System Anomaly: Kernel driver failed to allocate DMA ring buffer at 0x${Math.floor(Math.random() * 0xffffff).toString(16)}`,
      stack: `Error: DMA allocation failure\n    at iwlwifi_pcie_alloc_rings (/lib/modules/kernel/drivers/net/wireless/intel/iwlwifi/pcie/tx.c:482)\n    at iwl_pcie_tx_alloc (/lib/modules/kernel/drivers/net/wireless/intel/iwlwifi/pcie/tx.c:612)`,
      source: 'iwlwifi-simulated',
      url: window.location.href,
    };
    await api.reportClientError(simulated);
    fetchErrors(true);
  };

  // Clear client errors
  const handleClearClientErrors = async () => {
    await api.clearClientErrors();
    fetchErrors(true);
  };

  // Filtered errors
  const filteredErrors = useMemo(() => {
    return errors.filter((item) => {
      // Source filter
      if (selectedSource !== 'all') {
        if (selectedSource === 'kernel' && item.source !== 'kernel' && item.source !== 'hardware') return false;
        if (selectedSource === 'wifi' && item.source !== 'wifi') return false;
        if (selectedSource === 'service' && item.source !== 'service') return false;
        if (selectedSource === 'frontend' && item.source !== 'frontend') return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.message.toLowerCase().includes(q) ||
          item.service.toLowerCase().includes(q) ||
          item.raw.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [errors, selectedSource, selectedSeverity, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: errors.length,
      critical: errors.filter((e) => e.severity === 'critical').length,
      hardware: errors.filter((e) => e.source === 'hardware' || e.source === 'kernel').length,
      wifi: errors.filter((e) => e.source === 'wifi').length,
      services: errors.filter((e) => e.source === 'service').length,
      frontend: errors.filter((e) => e.source === 'frontend').length,
    };
  }, [errors]);

  const hasApiKey = Boolean(apiKey.trim() || serverAIStatus.configured);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'hardware':
        return { label: 'HARDWARE / MCE', bg: 'bg-red-500/20 text-red-300 border-red-500/40', icon: <HardDrive className="w-3.5 h-3.5" /> };
      case 'kernel':
        return { label: 'KERNEL', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: <Cpu className="w-3.5 h-3.5" /> };
      case 'wifi':
        return { label: 'WIFI / NETWORK', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: <Wifi className="w-3.5 h-3.5" /> };
      case 'frontend':
        return { label: 'WEBSITE UI', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: <Globe className="w-3.5 h-3.5" /> };
      case 'service':
      default:
        return { label: 'SERVICE', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: <Server className="w-3.5 h-3.5" /> };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'error':
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16 font-sans">
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & AI CONFIGURATION BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                  ERROR LOGGER & DIAGNOSTICS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {stats.total} LOGGED
                </span>
                {stats.critical > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-600/30 text-rose-200 border border-rose-500/40 animate-pulse">
                    {stats.critical} CRITICAL
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                Comprehensive machine error aggregator: monitors Linux kernel alerts, hardware faults, Wi-Fi disconnections, systemd service crashes, and frontend browser exceptions with Google Gemini AI root-cause analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm ${
                hasApiKey
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>{hasApiKey ? 'Gemini AI Key Active' : 'Enter Gemini API Key'}</span>
            </button>

            <button
              onClick={handleSimulateTestError}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
              title="Inject a test event to verify error capturing and AI pipeline"
            >
              <Play className="w-3.5 h-3.5 text-tinapple-cyan" />
              <span>Test Error</span>
            </button>

            <button
              onClick={() => fetchErrors(false)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Gemini API Key Configuration Accordion */}
        {showKeyInput && (
          <div className="mt-5 pt-5 border-t border-white/10 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-tinapple-gold" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Google Gemini Diagnostics Engine Key
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Model: <span className="text-tinapple-cyan">gemini-2.5-flash</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter your free Google Gemini API key to enable automated root-cause analysis, affected files mapping, and suggested fix commands.
                <span className="text-emerald-400 font-semibold block mt-1">
                  🔒 Security Guarantee: Your key is stored locally in your browser storage and on the server under restricted system permissions (`/etc/tinapple/gemini_key`). It is never checked into Git or leaked.
                </span>
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={keyVisible ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key (e.g. AIzaSy... or AQ....)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs placeholder:text-zinc-600 focus:outline-none focus:border-tinapple-cyan transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2.5 rounded-xl bg-tinapple-cyan hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  Save Key
                </button>

                <button
                  onClick={handleTestApiKey}
                  disabled={!apiKey.trim() || testStatus.status === 'testing'}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all border border-white/10 shrink-0 disabled:opacity-40"
                >
                  {testStatus.status === 'testing' ? 'Testing...' : 'Test Key'}
                </button>

                {apiKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-xs font-semibold transition-all border border-red-500/20 shrink-0"
                    title="Remove saved API key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {testStatus.message && (
                <div
                  className={`text-xs font-mono p-2.5 rounded-xl border flex items-center gap-2 ${
                    testStatus.status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : testStatus.status === 'error'
                      ? 'bg-red-500/10 text-red-300 border-red-500/30'
                      : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {testStatus.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : testStatus.status === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. METRICS HUD STRIP
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Errors</span>
            <ShieldAlert className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-red-400 text-xs">
            <span>Critical Faults</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-300 mt-1">{stats.critical}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-rose-400 text-xs">
            <span>Kernel & HW</span>
            <Cpu className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-300 mt-1">{stats.hardware}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>WiFi & Net</span>
            <Wifi className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300 mt-1">{stats.wifi}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-purple-400 text-xs">
            <span>Services</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 mt-1">{stats.services}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl font-mono">
          <div className="flex items-center justify-between text-sky-400 text-xs">
            <span>Website UI</span>
            <Globe className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-300 mt-1">{stats.frontend}</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. FILTERING & SEARCH TOOLBAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error messages, process names, raw log lines..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800/40 border border-white/10 text-white font-mono text-xs placeholder:text-zinc-500 focus:outline-none focus:border-tinapple-cyan transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Source Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none font-mono text-xs">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'kernel', label: 'Kernel/HW' },
            { id: 'wifi', label: 'WiFi/Net' },
            { id: 'service', label: 'Services' },
            { id: 'frontend', label: 'Website' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSource(tab.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 font-medium ${
                selectedSource === tab.id
                  ? 'bg-tinapple-cyan/20 text-tinapple-cyan border-tinapple-cyan/40 shadow-sm'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 border-white/[0.06]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/10 text-zinc-300 focus:outline-none focus:border-tinapple-cyan"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="error">Error Only</option>
            <option value="warning">Warning Only</option>
          </select>

          <select
            value={autoRefreshSecs}
            onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/10 text-zinc-300 focus:outline-none focus:border-tinapple-cyan"
            title="Auto-refresh cadence"
          >
            <option value={0}>Auto: Off</option>
            <option value={10}>Auto: 10s</option>
            <option value={15}>Auto: 15s</option>
            <option value={30}>Auto: 30s</option>
          </select>

          {stats.frontend > 0 && (
            <button
              onClick={handleClearClientErrors}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-colors"
              title="Clear Website UI errors buffer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          4. ERROR CARDS LIST
          ═══════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="text-center py-20 font-mono text-zinc-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-tinapple-cyan" />
          <p>Scanning Linux machine, journald, dmesg, and website telemetry...</p>
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/30 border border-white/[0.06] backdrop-blur-xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white font-mono">No Machine or Website Errors</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            All system services, kernel subsystems, WiFi interfaces, and frontend components are currently operating normally without logged errors.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((item) => {
            const isExpanded = expandedIds[item.id] || false;
            const isAnalyzing = analyzingIds[item.id] || false;
            const analysis = analyses[item.id];
            const analysisError = analysisErrors[item.id];
            const sourceBadge = getSourceBadge(item.source);

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 border border-white/[0.08] hover:border-white/20 transition-all backdrop-blur-xl overflow-hidden font-mono text-xs"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                    {/* Severity Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border shrink-0 ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>

                    {/* Source Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center gap-1.5 shrink-0 ${sourceBadge.bg}`}
                    >
                      {sourceBadge.icon}
                      <span>{sourceBadge.label}</span>
                    </span>

                    {/* Service / Process Name */}
                    {item.service && (
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-zinc-300 font-bold shrink-0">
                        {item.service}
                      </span>
                    )}

                    {/* Message Preview */}
                    <span className="text-white font-semibold truncate flex-1 min-w-0">
                      {item.message}
                    </span>
                  </div>

                  {/* Right metadata and action buttons */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto text-zinc-500">
                    <span className="text-[11px] text-zinc-400">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {/* AI Analysis Quick Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeError(item);
                      }}
                      disabled={isAnalyzing}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        analysis
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                          : 'bg-white/[0.05] hover:bg-tinapple-cyan hover:text-slate-950 text-zinc-300 border-white/10'
                      }`}
                      title="Analyze root cause and resolution with Google Gemini"
                    >
                      <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-tinapple-cyan' : 'text-tinapple-gold'}`} />
                      <span>{isAnalyzing ? 'Analyzing...' : analysis ? 'AI Diagnosis' : 'Analyze AI'}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-4 bg-black/20">
                    {/* Raw Log / Trace Code Block */}
                    <div>
                      <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                        <span className="text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                          Raw Error Log / Stack Trace
                        </span>
                        <button
                          onClick={() => handleCopy(item.raw, item.id)}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === item.id ? 'Copied' : 'Copy Log'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56">
                        {item.raw}
                      </pre>
                    </div>

                    {/* AI Root-Cause Diagnostic Report (If analyzed) */}
                    {analysis && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900/40 border border-purple-500/30 space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-tinapple-gold animate-pulse" />
                            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                              Google Gemini Diagnostic Report
                            </h4>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Impact: {analysis.severityAssessment || 'Moderate'}
                          </span>
                        </div>

                        {/* 1. Formatted Error & Source */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-zinc-400 block mb-0.5">Identified Subsystem:</span>
                            <span className="text-tinapple-cyan font-semibold">{analysis.source}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block mb-0.5">Clean Summary:</span>
                            <span className="text-white font-medium">{analysis.formattedError}</span>
                          </div>
                        </div>

                        {/* 2. Expected Cause */}
                        <div>
                          <span className="text-zinc-400 block mb-1">Expected Root Cause:</span>
                          <p className="text-zinc-200 bg-black/30 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                            {analysis.expectedCause}
                          </p>
                        </div>

                        {/* 3. Files Affected */}
                        {analysis.filesAffected && analysis.filesAffected.length > 0 && (
                          <div>
                            <span className="text-zinc-400 block mb-1.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-zinc-500" />
                              Affected Files / Configurations:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {analysis.filesAffected.map((file, idx) => (
                                <span
                                  key={idx}
                                  onClick={() => handleCopy(file, `file-${item.id}-${idx}`)}
                                  className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/10 border border-white/10 text-tinapple-gold font-mono text-[10px] cursor-pointer flex items-center gap-1 transition-colors"
                                  title="Click to copy file path"
                                >
                                  <span>{file}</span>
                                  {copiedId === `file-${item.id}-${idx}` ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-50" />
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Suggested Remediation / Fix Commands */}
                        {analysis.suggestedRemediation && (
                          <div>
                            <div className="flex items-center justify-between text-zinc-400 mb-1">
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                                <Terminal className="w-3.5 h-3.5" />
                                Suggested Remediation & Next Steps:
                              </span>
                              <button
                                onClick={() => handleCopy(analysis.suggestedRemediation, `fix-${item.id}`)}
                                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                              >
                                {copiedId === `fix-${item.id}` ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                                <span>Copy Action</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20 text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {analysis.suggestedRemediation}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Analysis Error Warning */}
                    {analysisError && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-center justify-between">
                        <span>{analysisError}</span>
                        <button
                          onClick={() => handleAnalyzeError(item)}
                          className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Fallback Standard Diagnostics (When not using AI or AI pending) */}
                    {!analysis && !isAnalyzing && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 text-zinc-400 text-[11px]">
                        <span>Standard Reporting Mode: Timestamp: {new Date(item.timestamp).toISOString()}</span>
                        <button
                          onClick={() => handleAnalyzeError(item)}
                          className="text-tinapple-cyan hover:underline font-semibold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Run AI Root-Cause Analysis</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ErrorLoggerPage;
