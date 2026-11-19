import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Key,
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
  Tv,
  BookOpen,
  Compass,
  Download,
  Shield,
  Film,
  Music,
  Clock,
  ArrowDown,
  Layers,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { api, SystemErrorItem, AIErrorAnalysis, AIStatus } from '../../services/api';

const GEMINI_KEY_STORAGE = 'tinapple_gemini_api_key';

export interface ServiceTagMetadata {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  category: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: (className?: string) => React.ReactNode;
}

export const SERVICE_TAGS: Record<string, ServiceTagMetadata> = {
  jellyfin: {
    id: 'jellyfin',
    name: 'Jellyfin Media Server',
    shortName: 'Jellyfin',
    unit: 'jellyfin',
    category: 'Media Streaming',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-300',
    icon: (c = 'w-3.5 h-3.5') => <Tv className={c} />,
  },
  suwayomi: {
    id: 'suwayomi',
    name: 'Suwayomi Manga Server',
    shortName: 'Suwayomi',
    unit: 'suwayomi-server',
    category: 'Manga & Comics',
    badgeBg: 'bg-teal-500/15',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-300',
    icon: (c = 'w-3.5 h-3.5') => <BookOpen className={c} />,
  },
  ombi: {
    id: 'ombi',
    name: 'Ombi Request Hub',
    shortName: 'Ombi',
    unit: 'ombi',
    category: 'Media Discovery',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-300',
    icon: (c = 'w-3.5 h-3.5') => <Compass className={c} />,
  },
  qbittorrent: {
    id: 'qbittorrent',
    name: 'qBittorrent Daemon',
    shortName: 'qBittorrent',
    unit: 'qbittorrent-nox',
    category: 'BitTorrent Engine',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-300',
    icon: (c = 'w-3.5 h-3.5') => <Download className={c} />,
  },
  caddy: {
    id: 'caddy',
    name: 'Caddy HTTPS Gateway',
    shortName: 'Caddy',
    unit: 'caddy',
    category: 'Reverse Proxy',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-300',
    icon: (c = 'w-3.5 h-3.5') => <Globe className={c} />,
  },
  'wireguard-proton': {
    id: 'wireguard-proton',
    name: 'Proton WireGuard Tunnel',
    shortName: 'Proton VPN',
    unit: 'wg-quick@proton',
    category: 'Privacy Exit Node',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-300',
    icon: (c = 'w-3.5 h-3.5') => <Shield className={c} />,
  },
  radarr: {
    id: 'radarr',
    name: 'Radarr Movie Daemon',
    shortName: 'Radarr',
    unit: 'radarr',
    category: 'Movie Automation',
    badgeBg: 'bg-yellow-500/15',
    badgeBorder: 'border-yellow-500/30',
    badgeText: 'text-yellow-300',
    icon: (c = 'w-3.5 h-3.5') => <Film className={c} />,
  },
  sonarr: {
    id: 'sonarr',
    name: 'Sonarr Series Daemon',
    shortName: 'Sonarr',
    unit: 'sonarr',
    category: 'TV Automation',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-300',
    icon: (c = 'w-3.5 h-3.5') => <Tv className={c} />,
  },
  prowlarr: {
    id: 'prowlarr',
    name: 'Prowlarr Indexer Proxy',
    shortName: 'Prowlarr',
    unit: 'prowlarr',
    category: 'Torrent Indexers',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-300',
    icon: (c = 'w-3.5 h-3.5') => <Search className={c} />,
  },
  bazarr: {
    id: 'bazarr',
    name: 'Bazarr Subtitle Manager',
    shortName: 'Bazarr',
    unit: 'bazarr',
    category: 'Subtitles',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-300',
    icon: (c = 'w-3.5 h-3.5') => <FileText className={c} />,
  },
  pinchflat: {
    id: 'pinchflat',
    name: 'Pinchflat YouTube Archiver',
    shortName: 'Pinchflat',
    unit: 'pinchflat',
    category: 'Media Archival',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-300',
    icon: (c = 'w-3.5 h-3.5') => <Play className={c} />,
  },
  navidrome: {
    id: 'navidrome',
    name: 'Navidrome Music Streamer',
    shortName: 'Navidrome',
    unit: 'navidrome',
    category: 'Audio Streaming',
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-300',
    icon: (c = 'w-3.5 h-3.5') => <Music className={c} />,
  },
  'tinapple-dash': {
    id: 'tinapple-dash',
    name: 'Tinapple Hub Daemon',
    shortName: 'Tinapple Dash',
    unit: 'tinapple-dash',
    category: 'Appliance Daemon',
    badgeBg: 'bg-amber-400/15',
    badgeBorder: 'border-amber-400/30',
    badgeText: 'text-amber-300',
    icon: (c = 'w-3.5 h-3.5') => <Cpu className={c} />,
  },
  network: {
    id: 'network',
    name: 'Network & Wi-Fi Stack',
    shortName: 'Network/WiFi',
    unit: 'NetworkManager',
    category: 'Network Stack',
    badgeBg: 'bg-lime-500/15',
    badgeBorder: 'border-lime-500/30',
    badgeText: 'text-lime-300',
    icon: (c = 'w-3.5 h-3.5') => <Wifi className={c} />,
  },
  kernel: {
    id: 'kernel',
    name: 'Linux Kernel & HW Bus',
    shortName: 'Kernel / HW',
    unit: 'kernel',
    category: 'Kernel Space',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-300',
    icon: (c = 'w-3.5 h-3.5') => <HardDrive className={c} />,
  },
  'website-ui': {
    id: 'website-ui',
    name: 'Website Frontend Client',
    shortName: 'Website UI',
    unit: 'tinapple-hub',
    category: 'Browser Client',
    badgeBg: 'bg-sky-400/15',
    badgeBorder: 'border-sky-400/30',
    badgeText: 'text-sky-300',
    icon: (c = 'w-3.5 h-3.5') => <Terminal className={c} />,
  },
  systemd: {
    id: 'systemd',
    name: 'Systemd Unit Core',
    shortName: 'Systemd Core',
    unit: 'systemd',
    category: 'Supervisor',
    badgeBg: 'bg-slate-500/15',
    badgeBorder: 'border-slate-500/30',
    badgeText: 'text-slate-300',
    icon: (c = 'w-3.5 h-3.5') => <Server className={c} />,
  },
};

export function resolveServiceTag(rawService: string): ServiceTagMetadata {
  const norm = (rawService || '').toLowerCase().trim();
  if (norm.includes('suwayomi') || norm.includes('tachidesk') || norm === 'java') return SERVICE_TAGS.suwayomi;
  if (norm.includes('wireguard') || norm.includes('proton') || norm.includes('wg-quick')) return SERVICE_TAGS['wireguard-proton'];
  if (norm.includes('ombi')) return SERVICE_TAGS.ombi;
  if (norm.includes('jellyfin')) return SERVICE_TAGS.jellyfin;
  if (norm.includes('caddy')) return SERVICE_TAGS.caddy;
  if (norm.includes('qbittorrent')) return SERVICE_TAGS.qbittorrent;
  if (norm.includes('radarr')) return SERVICE_TAGS.radarr;
  if (norm.includes('sonarr')) return SERVICE_TAGS.sonarr;
  if (norm.includes('prowlarr')) return SERVICE_TAGS.prowlarr;
  if (norm.includes('bazarr')) return SERVICE_TAGS.bazarr;
  if (norm.includes('pinchflat')) return SERVICE_TAGS.pinchflat;
  if (norm.includes('navidrome')) return SERVICE_TAGS.navidrome;
  if (norm.includes('network') || norm.includes('wpa_supplicant') || norm.includes('networkmanager') || norm.includes('iwd') || norm.includes('wifi')) return SERVICE_TAGS.network;
  if (norm.includes('tinapple')) return SERVICE_TAGS['tinapple-dash'];
  if (norm.includes('kernel') || norm.includes('dmesg') || norm.includes('hardware')) return SERVICE_TAGS.kernel;
  if (norm.includes('client') || norm.includes('frontend') || norm.includes('website')) return SERVICE_TAGS['website-ui'];
  if (SERVICE_TAGS[norm]) return SERVICE_TAGS[norm];

  return {
    id: norm || 'system',
    name: (norm || 'system').toUpperCase(),
    shortName: norm || 'system',
    unit: norm || 'systemd',
    category: 'System Service',
    badgeBg: 'bg-white/[0.05]',
    badgeBorder: 'border-white/10',
    badgeText: 'text-zinc-300',
    icon: (c = 'w-3.5 h-3.5') => <Server className={c} />,
  };
}

export const ErrorLoggerPage: React.FC = () => {
  // Navigation mode: 'errors' (Anomaly Diagnostics) or 'journals' (Live Service Journals)
  const [activeMode, setActiveMode] = useState<'errors' | 'journals'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('mode') === 'journals' || p.get('mode') === 'live') return 'journals';
    }
    return 'errors';
  });

  // Errors state
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedServiceTag, setSelectedServiceTag] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('service') || 'all';
    }
    return 'all';
  });
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

  // -------------------------------------------------------------
  // LIVE SERVICE JOURNAL STATE
  // -------------------------------------------------------------
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('unit') || p.get('service') || 'jellyfin';
    }
    return 'jellyfin';
  });
  const [journalLines, setJournalLines] = useState<string[]>([]);
  const [journalLoading, setJournalLoading] = useState<boolean>(false);
  const [journalLinesCount, setJournalLinesCount] = useState<number>(100);
  const [journalFilter, setJournalFilter] = useState<string>('');
  const [journalAutoRefresh, setJournalAutoRefresh] = useState<number>(3); // 3s live polling
  const [journalCopied, setJournalCopied] = useState<boolean>(false);
  const journalBottomRef = useRef<HTMLDivElement>(null);

  // Fetch Errors from backend
  const fetchErrors = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const res = await api.getSystemErrors();
      let serverErrors = res.errors || [];

      // Merge local client-side errors if available
      try {
        const rawLocal = localStorage.getItem('tinapple_client_errors');
        if (rawLocal) {
          const localItems: any[] = JSON.parse(rawLocal);
          const existingIds = new Set(serverErrors.map((e) => e.id));
          const existingMessages = new Set(serverErrors.map((e) => e.message));
          const localConverted: SystemErrorItem[] = localItems
            .filter((l) => !existingIds.has(l.id) && !existingMessages.has(l.message))
            .map((l) => ({
              id: l.id || `client-${Date.now()}`,
              timestamp: l.timestamp || new Date().toISOString(),
              source: 'client',
              service: l.source || 'website-ui',
              severity: 'error',
              message: l.message,
              raw: `${l.source || 'client'}: ${l.message}\nStack: ${l.stack || 'No stack trace'}\nURL: ${l.url || ''}`,
              category: 'Website / Client',
            }));
          if (localConverted.length > 0) {
            serverErrors = [...localConverted, ...serverErrors];
          }
        }
      } catch {}

      setErrors(serverErrors);
    } catch (e) {
      console.error('Failed to load system errors', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch Live Journal Logs
  const fetchJournalLogs = useCallback(async (unitName: string, lines = 100, quiet = false) => {
    if (!unitName) return;
    if (!quiet) setJournalLoading(true);
    try {
      const data = await api.getServiceLogs(unitName, lines);
      setJournalLines(data || []);
    } catch (e) {
      console.warn('Failed to load journal logs for', unitName, e);
    } finally {
      setJournalLoading(false);
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

  // Errors Auto-refresh timer
  useEffect(() => {
    if (activeMode !== 'errors' || autoRefreshSecs <= 0) return;
    const interval = setInterval(() => {
      fetchErrors(true);
    }, autoRefreshSecs * 1000);
    return () => clearInterval(interval);
  }, [activeMode, autoRefreshSecs, fetchErrors]);

  // Journals fetch and auto-refresh
  useEffect(() => {
    if (activeMode !== 'journals') return;
    fetchJournalLogs(selectedUnit, journalLinesCount);
  }, [activeMode, selectedUnit, journalLinesCount, fetchJournalLogs]);

  useEffect(() => {
    if (activeMode !== 'journals' || journalAutoRefresh <= 0) return;
    const interval = setInterval(() => {
      fetchJournalLogs(selectedUnit, journalLinesCount, true);
    }, journalAutoRefresh * 1000);
    return () => clearInterval(interval);
  }, [activeMode, selectedUnit, journalLinesCount, journalAutoRefresh, fetchJournalLogs]);

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

  const handleClearApiKey = () => {
    setApiKey('');
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch {}
    setTestStatus({ status: 'idle', message: 'Key cleared.' });
  };

  const handleAnalyzeError = async (item: SystemErrorItem) => {
    setAnalyzingIds((prev) => ({ ...prev, [item.id]: true }));
    setAnalysisErrors((prev) => ({ ...prev, [item.id]: '' }));

    try {
      const analysis = await api.analyzeErrorWithAI(item, apiKey.trim());
      setAnalyses((prev) => ({ ...prev, [item.id]: analysis }));
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyJournal = () => {
    navigator.clipboard.writeText(journalLines.join('\n'));
    setJournalCopied(true);
    setTimeout(() => setJournalCopied(false), 2000);
  };

  const handleDownloadLogFile = () => {
    const content = journalLines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tinapple-${selectedUnit}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStreamServiceLogs = (rawService: string) => {
    const tag = resolveServiceTag(rawService);
    const targetUnit = tag.unit || rawService;
    setSelectedUnit(targetUnit);
    setSelectedServiceTag(tag.id);
    setActiveMode('journals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleClearClientErrors = async () => {
    try {
      localStorage.removeItem('tinapple_client_errors');
    } catch {}
    await api.clearClientErrors();
    fetchErrors(true);
  };

  // Safe error items
  const safeErrors = Array.isArray(errors) ? errors : [];

  // Filtered errors for diagnostics mode
  const filteredErrors = useMemo(() => {
    return safeErrors.filter((item) => {
      // Service tag filter
      if (selectedServiceTag !== 'all') {
        const itemTag = resolveServiceTag(item.service).id;
        if (itemTag !== selectedServiceTag) return false;
      }

      // Source filter
      if (selectedSource !== 'all') {
        if (selectedSource === 'kernel' && item.source !== 'kernel' && item.source !== 'hardware') return false;
        if (selectedSource === 'wifi' && item.source !== 'wifi') return false;
        if (selectedSource === 'service' && item.source !== 'service') return false;
        if (selectedSource === 'frontend' && item.source !== 'frontend' && item.source !== 'client') return false;
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
  }, [safeErrors, selectedServiceTag, selectedSource, selectedSeverity, searchQuery]);

  // Dynamic error counts per service
  const serviceErrorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of safeErrors) {
      const tagId = resolveServiceTag(item.service).id;
      counts[tagId] = (counts[tagId] || 0) + 1;
    }
    return counts;
  }, [safeErrors]);

  // Overall Statistics
  const stats = useMemo(() => {
    return {
      total: safeErrors.length,
      critical: safeErrors.filter((e) => e.severity === 'critical').length,
      hardware: safeErrors.filter((e) => e.source === 'hardware' || e.source === 'kernel').length,
      wifi: safeErrors.filter((e) => e.source === 'wifi').length,
      services: safeErrors.filter((e) => e.source === 'service').length,
      frontend: safeErrors.filter((e) => e.source === 'frontend' || e.source === 'client').length,
    };
  }, [safeErrors]);

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
      case 'client':
        return { label: 'CLIENT / WEB', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: <Globe className="w-3.5 h-3.5" /> };
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

  // Filtered live journal lines
  const filteredJournalLines = useMemo(() => {
    if (!journalFilter.trim()) return journalLines;
    const q = journalFilter.toLowerCase();
    return journalLines.filter((l) => l.toLowerCase().includes(q));
  }, [journalLines, journalFilter]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4 pb-16 font-sans">
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & AI CONFIGURATION BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                  SYSTEM LOGS & DIAGNOSTICS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {stats.total} ANOMALIES
                </span>
                {stats.critical > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-600/30 text-rose-200 border border-rose-500/40 animate-pulse">
                    {stats.critical} CRITICAL
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                Unified node telemetry: inspect real-time systemd service journals, hardware kernel alerts, network states, and client exceptions with Google Gemini AI root-cause analysis.
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
              onClick={() => {
                fetchErrors(false);
                if (activeMode === 'journals') fetchJournalLogs(selectedUnit, journalLinesCount, false);
              }}
              disabled={isRefreshing || journalLoading}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || journalLoading ? 'animate-spin' : ''}`} />
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

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type={keyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Google Gemini API key (AIzaSy...)"
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs placeholder:text-zinc-600 focus:outline-none focus:border-tinapple-cyan"
                />
                <button
                  type="button"
                  onClick={() => setKeyVisible(!keyVisible)}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 text-xs font-mono"
                >
                  {keyVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold"
                >
                  Save Key
                </button>
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={!apiKey.trim() || testStatus.status === 'testing'}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-mono font-bold disabled:opacity-40"
                >
                  Test Connection
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    title="Remove API Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {testStatus.status !== 'idle' && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
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
          2. PRIMARY LOG VIEW MODE SWITCHER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl rounded-2xl p-1.5 gap-1.5 shadow-lg">
        <button
          onClick={() => setActiveMode('errors')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
            activeMode === 'errors'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Anomaly & Error Diagnostics</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/30 text-red-200 border border-red-500/40">
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveMode('journals')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
            activeMode === 'journals'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Live Service Journals</span>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-normal">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Streaming</span>
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. SERVICE TAGS FILTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-2">
        <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
            <Layers className="w-3.5 h-3.5 text-tinapple-cyan" />
            <span>Service & Subsystem Tags</span>
          </div>
          <span className="text-[11px] text-zinc-500">
            {activeMode === 'errors' ? 'Click to filter anomalies by service' : 'Click to stream live logs for service'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          {/* All Services Pill */}
          <button
            onClick={() => {
              setSelectedServiceTag('all');
            }}
            className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 font-bold flex items-center gap-1.5 ${
              selectedServiceTag === 'all'
                ? 'bg-white/15 text-white border-white/30 shadow-sm'
                : 'bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 border-white/[0.06]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>All Services</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/10 text-white font-mono">
              {stats.total}
            </span>
          </button>

          {/* Individual Service Tag Pills */}
          {Object.values(SERVICE_TAGS).map((tag) => {
            const count = serviceErrorCounts[tag.id] || 0;
            const isSelected = selectedServiceTag === tag.id || (activeMode === 'journals' && selectedUnit === tag.unit);

            return (
              <button
                key={tag.id}
                onClick={() => {
                  setSelectedServiceTag(tag.id);
                  if (activeMode === 'journals') {
                    setSelectedUnit(tag.unit);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl border transition-all shrink-0 font-medium flex items-center gap-1.5 ${
                  isSelected
                    ? `${tag.badgeBg} ${tag.badgeText} ${tag.badgeBorder} shadow-sm font-bold scale-[1.02]`
                    : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 border-white/[0.06]'
                }`}
              >
                {tag.icon('w-3.5 h-3.5')}
                <span>{tag.shortName}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isSelected ? 'bg-red-500/30 text-red-200 border border-red-500/40' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODE 1: ANOMALY & ERROR DIAGNOSTICS VIEW
          ═══════════════════════════════════════════════════════════════ */}
      {activeMode === 'errors' && (
        <div className="space-y-4">
          {/* Metrics HUD Strip */}
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

          {/* Filtering & Search Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

          {/* Error Cards List */}
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
              <h3 className="text-lg font-bold text-white font-mono">No Machine or Service Errors Found</h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                {selectedServiceTag !== 'all'
                  ? `Service [${selectedServiceTag}] is healthy with zero active journal anomalies.`
                  : 'All system services, kernel subsystems, WiFi interfaces, and frontend components are currently operating normally without logged errors.'}
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
                const serviceTag = resolveServiceTag(item.service);

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

                        {/* Proper Service Tag Pill */}
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center gap-1.5 shrink-0 ${serviceTag.badgeBg} ${serviceTag.badgeBorder} ${serviceTag.badgeText}`}
                          title={`Service: ${serviceTag.name} (${serviceTag.category})`}
                        >
                          {serviceTag.icon('w-3 h-3')}
                          <span>{serviceTag.shortName}</span>
                        </span>

                        {/* Source Pill */}
                        <span
                          className={`hidden sm:inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] border items-center gap-1.5 shrink-0 ${sourceBadge.bg}`}
                        >
                          {sourceBadge.icon}
                          <span>{sourceBadge.label}</span>
                        </span>

                        {/* Message Preview */}
                        <span className="text-white font-semibold truncate flex-1 min-w-0">
                          {item.message}
                        </span>
                      </div>

                      {/* Right metadata and action buttons */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-auto text-zinc-500">
                        <span className="text-[11px] text-zinc-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>

                        {/* Stream Service Journal Quick Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStreamServiceLogs(item.service);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          title={`Open live streaming journalctl for ${serviceTag.name}`}
                        >
                          <Terminal className="w-3 h-3 text-sky-400" />
                          <span className="hidden sm:inline">Stream Journal</span>
                        </button>

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
                        {/* Service Metadata Strip */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Service Unit:</span>
                            <span className="text-white font-bold">{serviceTag.unit}.service</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">{serviceTag.category}</span>
                          </div>
                          <button
                            onClick={() => handleStreamServiceLogs(item.service)}
                            className="text-sky-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>View Full {serviceTag.shortName} Journal</span>
                          </button>
                        </div>

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

                        {/* Fallback Standard Diagnostics */}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODE 2: LIVE SERVICE JOURNALS STREAMING VIEW
          ═══════════════════════════════════════════════════════════════ */}
      {activeMode === 'journals' && (
        <div className="space-y-4">
          {/* Journal Control Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Service Unit Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">Target Unit:</span>
              <select
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  fetchJournalLogs(e.target.value, journalLinesCount);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-mono text-xs font-bold focus:outline-none focus:border-sky-400"
              >
                {Object.values(SERVICE_TAGS)
                  .filter((t) => t.unit && t.unit !== 'tinapple-hub' && t.unit !== 'kernel')
                  .map((t) => (
                    <option key={t.id} value={t.unit}>
                      {t.name} ({t.unit}.service)
                    </option>
                  ))}
              </select>
            </div>

            {/* In-Terminal Filter Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={journalFilter}
                onChange={(e) => setJournalFilter(e.target.value)}
                placeholder="Filter output within this unit's logs..."
                className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-800/40 border border-white/10 text-white font-mono text-xs placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              />
              {journalFilter && (
                <button
                  onClick={() => setJournalFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Line Count and Auto Refresh Controls */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <select
                value={journalLinesCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setJournalLinesCount(val);
                  fetchJournalLogs(selectedUnit, val);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/10 text-zinc-300 focus:outline-none focus:border-sky-400"
                title="Buffer line depth"
              >
                <option value={50}>50 Lines</option>
                <option value={100}>100 Lines</option>
                <option value={200}>200 Lines</option>
                <option value={500}>500 Lines</option>
              </select>

              <select
                value={journalAutoRefresh}
                onChange={(e) => setJournalAutoRefresh(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-white/10 text-zinc-300 focus:outline-none focus:border-sky-400"
                title="Streaming poll rate"
              >
                <option value={0}>Stream: Paused</option>
                <option value={3}>Stream: 3s (Live)</option>
                <option value={5}>Stream: 5s</option>
                <option value={10}>Stream: 10s</option>
                <option value={30}>Stream: 30s</option>
              </select>

              <button
                onClick={handleCopyJournal}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 transition-colors"
                title="Copy entire buffer to clipboard"
              >
                {journalCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadLogFile}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 transition-colors"
                title="Download raw .log file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Box */}
          <div className="rounded-3xl bg-slate-950/90 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Terminal Header */}
            <div className="px-5 py-3 border-b border-white/10 bg-slate-900/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-zinc-400 font-bold ml-2">
                  journalctl -u {selectedUnit}.service -n {journalLinesCount} -o short-iso
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${journalAutoRefresh > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span>{journalAutoRefresh > 0 ? `Streaming (${journalAutoRefresh}s)` : 'Paused'}</span>
                </span>
                <span>{filteredJournalLines.length} lines</span>
              </div>
            </div>

            {/* Terminal Log Output */}
            <div className="p-4 sm:p-5 h-[550px] overflow-y-auto font-mono text-xs leading-relaxed space-y-1 bg-black/80 text-zinc-300 selection:bg-sky-500/30">
              {journalLoading && journalLines.length === 0 ? (
                <div className="text-center py-24 text-zinc-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                  <p>Querying systemd unit journal for {selectedUnit}.service...</p>
                </div>
              ) : filteredJournalLines.length === 0 ? (
                <div className="text-center py-24 text-zinc-500 italic">
                  No log entries matched the filter criteria for {selectedUnit}.service.
                </div>
              ) : (
                filteredJournalLines.map((line, idx) => {
                  const lower = line.toLowerCase();
                  const isErr =
                    lower.includes('error') ||
                    lower.includes('failed') ||
                    lower.includes('exception') ||
                    lower.includes('fatal') ||
                    lower.includes('fail:');
                  const isWarn = lower.includes('warn') || lower.includes('warning');
                  const isInfo =
                    lower.includes('info') ||
                    lower.includes('[inf]') ||
                    lower.includes('started') ||
                    lower.includes('listening');

                  return (
                    <div
                      key={idx}
                      className={`hover:bg-white/[0.04] px-2 py-0.5 rounded transition-colors break-all flex items-start gap-2 ${
                        isErr
                          ? 'text-red-300 bg-red-950/20'
                          : isWarn
                          ? 'text-amber-300 bg-amber-950/20'
                          : isInfo
                          ? 'text-emerald-300'
                          : 'text-zinc-300'
                      }`}
                    >
                      <span className="text-zinc-600 select-none text-[11px] shrink-0 w-8 text-right font-mono">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-mono leading-relaxed">{line}</span>
                    </div>
                  );
                })
              )}
              <div ref={journalBottomRef} />
            </div>

            {/* Terminal Footer */}
            <div className="px-5 py-2.5 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="text-tinapple-cyan font-bold">{selectedUnit}.service</span>
                <span>• Live stdout/stderr stream from Linux systemd supervisor</span>
              </span>
              <button
                onClick={() => journalBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-white flex items-center gap-1 font-bold"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Jump to bottom</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorLoggerPage;
