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
} from 'lucide-react';

export interface GuideArticle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ReactNode;
  accentColor: string;
  htmlGuidePath?: string;
  endpoints: { label: string; value: string }[];
  steps: {
    title: string;
    description: string;
    code?: string;
    tip?: string;
  }[];
  clientApps: {
    name: string;
    platform: string;
    link: string;
    badge?: string;
  }[];
  specialConfigs: {
    title: string;
    description: string;
    code?: string;
  }[];
}

const GUIDES_CATALOG: GuideArticle[] = [
  {
    id: 'jellyfin',
    title: 'Jellyfin Media Server & Plezy Client',
    subtitle: 'Hardware-accelerated streaming, DirectPlay, and Plezy desktop/mobile setup',
    category: 'media',
    icon: <Tv className="w-5 h-5 text-purple-400" />,
    accentColor: '#aa74e8',
    htmlGuidePath: '/guides/plezy.html',
    endpoints: [
      { label: 'Tailscale VPN Host', value: 'http://100.108.215.120:8096' },
      { label: 'Local LAN Host', value: 'http://10.3.2.105:8096' },
      { label: 'Installed Client', value: '~/.local/bin/plezy (v2.25.0)' },
    ],
    steps: [
      {
        title: 'Launch Plezy on this PC',
        description: 'Plezy is pre-installed on this computer with full desktop environment integration. Open it from your application menu or launch via terminal.',
        code: 'plezy',
      },
      {
        title: 'Connect to your Homelab Server',
        description: 'On first launch, choose "Jellyfin" as your server provider, and enter your server address and account credentials.',
        code: 'http://100.108.215.120:8096',
        tip: 'If on your home Wi-Fi network without Tailscale, you can also connect via http://10.3.2.105:8096.',
      },
      {
        title: 'Why Plezy is Recommended Over Web Browsers',
        description: 'Web browsers lack native codec support for HEVC (H.265), 10-bit color, and surround audio, forcing the server to transcode. Plezy embeds libmpv for 100% DirectPlay, subtitle typography (SSA/ASS) without video re-encoding, and HDR tone mapping.',
      },
    ],
    clientApps: [
      { name: 'Plezy Linux (Desktop)', platform: 'Linux / Arch', link: 'https://github.com/edde746/plezy/releases/latest', badge: 'Installed' },
      { name: 'Plezy Android APK', platform: 'Android / FireOS', link: 'https://github.com/edde746/plezy/releases/latest/download/plezy-android-arm64-v8a.tar.gz' },
      { name: 'Plezy iOS & Apple TV', platform: 'iOS / tvOS', link: 'https://plezy.app' },
      { name: 'Plezy Windows & macOS', platform: 'Windows / Mac', link: 'https://github.com/edde746/plezy/releases/latest' },
    ],
    specialConfigs: [
      {
        title: 'Server VA-API / QSV Hardware Acceleration',
        description: 'In Jellyfin Admin Dashboard ➔ Playback ➔ Transcoding: select "VAAPI" (or Intel QuickSync / NVENC), check H.264, HEVC, and AV1 decoding, and enable "VPP Tonemapping" for zero-lag streaming.',
      },
      {
        title: 'Plezy mpv Video Profile & Audio Bitstream',
        description: 'In Plezy Settings ➔ Player: set Hardware Decoding to "auto-safe". Under Audio, enable Passthrough to output multichannel Dolby Atmos and DTS-HD to home theater receivers.',
      },
    ],
  },
  {
    id: 'syncyomi',
    title: 'SyncYomi & Suwayomi Manga Synchronization',
    subtitle: 'Centralized reading progress, chapter bookmarks, and Mihon/Komikku sync',
    category: 'manga',
    icon: <Book className="w-5 h-5 text-rose-400" />,
    accentColor: '#f43f5e',
    htmlGuidePath: '/guides/syncyomi.html',
    endpoints: [
      { label: 'Suwayomi Server', value: 'http://100.108.215.120:4567' },
      { label: 'SyncYomi Web GUI', value: 'http://100.108.215.120:8282' },
      { label: 'Tsumiru Web Client', value: 'http://100.108.215.120:8088/tsumiru' },
    ],
    steps: [
      {
        title: 'Open SyncYomi Dashboard & Generate API Token',
        description: 'Navigate to the SyncYomi web portal, create an account, then go to Settings ➔ API Keys and click "Add API Key". Copy the generated token.',
        code: 'http://100.108.215.120:8282',
      },
      {
        title: 'Configure Mobile Reader (Mihon / Komikku)',
        description: 'On your Android device in Mihon / TachiyomiSY: Settings ➔ Data and Storage ➔ Sync (SyncYomi v2). Enter the SyncYomi host and your API token.',
        code: 'http://100.108.215.120:8282',
        tip: 'Enable "Sync on open" and "Sync on chapter read" for seamless cross-device resumption.',
      },
    ],
    clientApps: [
      { name: 'Mihon Android Reader', platform: 'Android', link: 'https://mihon.app' },
      { name: 'Tsumiru Progressive Web App', platform: 'Web / Mobile', link: '/tsumiru' },
      { name: 'Tsumiru Android APK', platform: 'Android', link: '/download/tsumiru' },
    ],
    specialConfigs: [
      {
        title: 'Keiyoushi Extension Repository',
        description: 'Add the official Keiyoushi repository into Suwayomi or Mihon Settings ➔ Browse ➔ Extension repos to automatically index thousands of manga and comic sources.',
        code: 'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json',
      },
    ],
  },
  {
    id: 'beeper',
    title: 'Beeper Matrix Chat Bridges (bbctl)',
    subtitle: 'Self-hosted end-to-end encrypted chat bridges for WhatsApp, Signal, Discord',
    category: 'matrix',
    icon: <MessageSquare className="w-5 h-5 text-amber-400" />,
    accentColor: '#f59e0b',
    htmlGuidePath: '/guides/beeper.html',
    endpoints: [
      { label: 'CLI Binary', value: '/usr/local/bin/bbctl' },
      { label: 'Systemd Template', value: 'bbctl@<bridge>.service' },
      { label: 'Data Directory', value: '~/.local/share/bbctl/' },
    ],
    steps: [
      {
        title: 'Log Into Beeper Bridge Manager',
        description: 'SSH into your Tinapple server and authenticate your Beeper account with the bbctl command-line tool:',
        code: 'bbctl login',
      },
      {
        title: 'Verify Account Authentication',
        description: 'Check active session tokens and your Matrix user handle:',
        code: 'bbctl whoami',
      },
      {
        title: 'Start Self-Hosted Bridges as Background Daemons',
        description: 'Enable and start any official bridge as an isolated, auto-restarting systemd service:',
        code: 'sudo systemctl enable --now bbctl@sh-whatsapp\nsudo systemctl enable --now bbctl@sh-telegram\nsudo systemctl enable --now bbctl@sh-discord\nsudo systemctl enable --now bbctl@sh-signal',
      },
    ],
    clientApps: [
      { name: 'Beeper Desktop & Mobile', platform: 'All Platforms', link: 'https://www.beeper.com/download' },
      { name: 'Element Matrix Client', platform: 'Web / Desktop', link: 'https://element.io' },
    ],
    specialConfigs: [
      {
        title: 'Physical Key Safety & Zero Cloud Retention',
        description: 'Unlike third-party hosted cloud bridges, self-hosted bridges via bbctl establish encrypted appservice websockets directly on this hardware. WhatsApp and Signal session keys never leave this physical server.',
      },
    ],
  },
  {
    id: 'vaultwarden',
    title: 'Vaultwarden Password Vault',
    subtitle: 'Zero-knowledge encrypted password manager compatible with all Bitwarden apps',
    category: 'security',
    icon: <KeyRound className="w-5 h-5 text-blue-400" />,
    accentColor: '#3b82f6',
    htmlGuidePath: '/guides/vaultwarden.html',
    endpoints: [
      { label: 'Web Vault Port', value: 'http://100.108.215.120:8000' },
      { label: 'Systemd Unit', value: 'vaultwarden.service' },
    ],
    steps: [
      {
        title: 'Access the Vaultwarden Web Interface',
        description: 'Open the web vault in your browser to create your primary admin account and master passphrase.',
        code: 'http://100.108.215.120:8000',
      },
      {
        title: 'Configure Bitwarden Extension / Mobile App',
        description: 'In the Bitwarden extension or iOS/Android app login screen, click the Settings Gear icon ➔ Custom Environment ➔ enter the Server URL.',
        code: 'http://100.108.215.120:8000',
        tip: 'WebAuthn passkeys require HTTPS. Use Tailscale TLS or an internal reverse proxy.',
      },
    ],
    clientApps: [
      { name: 'Bitwarden Chrome / Brave', platform: 'Browser', link: 'https://bitwarden.com/download/' },
      { name: 'Bitwarden Firefox', platform: 'Browser', link: 'https://addons.mozilla.org/firefox/addon/bitwarden-password-manager/' },
      { name: 'Bitwarden iOS & Android', platform: 'Mobile', link: 'https://bitwarden.com/download/' },
    ],
    specialConfigs: [
      {
        title: 'Disable Public Registration Once Setup',
        description: 'In your Vaultwarden environment configuration, set SIGNUPS_ALLOWED=false to ensure nobody else can register accounts on your private instance.',
        code: 'SIGNUPS_ALLOWED=false',
      },
    ],
  },
  {
    id: 'syncthing',
    title: 'Syncthing Decentralized Sync',
    subtitle: 'Continuous peer-to-peer folder replication across mobile devices and computers',
    category: 'sync',
    icon: <FolderSync className="w-5 h-5 text-sky-400" />,
    accentColor: '#0ea5e9',
    htmlGuidePath: '/guides/syncthing.html',
    endpoints: [
      { label: 'Syncthing Web GUI', value: 'http://100.108.215.120:8384' },
      { label: 'Running Service', value: 'syncthing@pineapple.service' },
    ],
    steps: [
      {
        title: 'Open Syncthing Control Center',
        description: 'Access the web GUI on port 8384 to view paired devices, sync throughput, and folder shares.',
        code: 'http://100.108.215.120:8384',
      },
      {
        title: 'Pair Phone or Laptop via Device ID',
        description: 'In the Syncthing mobile app or laptop client, click "Add Device" and scan the QR code from the server GUI.',
      },
      {
        title: 'Share Folders with High-Speed Compression',
        description: 'Create a share for ~/drive or /srv/media and set Compression to LZ4 or Zstandard for fast data sync with minimal CPU overhead.',
      },
    ],
    clientApps: [
      { name: 'Syncthing-Fork (Android)', platform: 'Android', link: 'https://github.com/Catfriend1/syncthing-android' },
      { name: 'Syncthing macOS (Tray)', platform: 'macOS', link: 'https://github.com/syncthing/syncthing-macos' },
      { name: 'SyncTrayzor (Windows)', platform: 'Windows', link: 'https://github.com/canton7/SyncTrayzor' },
    ],
    specialConfigs: [
      {
        title: 'File Versioning Strategy',
        description: 'Under Folder Settings ➔ File Versioning: select "Staggered File Versioning" to protect against accidental file deletion and ransomware while keeping storage bounded.',
      },
    ],
  },
  {
    id: 'obsidian',
    title: 'Obsidian LiveSync & CouchDB',
    subtitle: 'End-to-end encrypted notes synchronization with self-hosted CouchDB database',
    category: 'sync',
    icon: <FileText className="w-5 h-5 text-indigo-400" />,
    accentColor: '#6366f1',
    htmlGuidePath: '/guides/obsidian.html',
    endpoints: [
      { label: 'CouchDB Port', value: 'http://100.108.215.120:5984' },
      { label: 'Database Name', value: 'obsidian' },
    ],
    steps: [
      {
        title: 'Install Community Plugin in Obsidian',
        description: 'In Obsidian Settings ➔ Community Plugins: install "Self-hosted LiveSync".',
      },
      {
        title: 'Connect to Homelab CouchDB Endpoint',
        description: 'Enter your CouchDB connection URL and database credentials. Enable End-to-End Encryption (E2EE) with a strong passphrase.',
        code: 'http://100.108.215.120:5984/obsidian',
      },
    ],
    clientApps: [
      { name: 'Obsidian Note-Taking App', platform: 'All Platforms', link: 'https://obsidian.md/download' },
    ],
    specialConfigs: [
      {
        title: 'LiveSync Real-Time Tuning',
        description: 'Enable "LiveSync mode: Live" and "Sync on save" in plugin settings for instantaneous sub-second document replication between desktop and phone.',
      },
    ],
  },
  {
    id: 'tailscale',
    title: 'Tailscale Mesh VPN & Remote Access',
    subtitle: 'Zero-config encrypted WireGuard peer-to-peer network connecting devices anywhere',
    category: 'network',
    icon: <ShieldCheck className="w-5 h-5 text-sky-400" />,
    accentColor: '#38bdf8',
    htmlGuidePath: '/guides/ssh.html',
    endpoints: [
      { label: 'Node Tailscale IP', value: '100.108.215.120' },
      { label: 'Tailscale SSH', value: 'ssh root@100.108.215.120' },
    ],
    steps: [
      {
        title: 'Connect from Outside Your Home',
        description: 'With Tailscale installed on your phone or laptop, all your homelab services are accessible securely from anywhere in the world without exposing ports to the public internet.',
      },
      {
        title: 'Direct Tailscale SSH Terminal Access',
        description: 'Connect securely with Tailscale SSH without managing SSH keys manually:',
        code: 'ssh root@100.108.215.120\n# or user session:\nssh pineapple@100.108.215.120',
      },
    ],
    clientApps: [
      { name: 'Tailscale Client', platform: 'All Platforms', link: 'https://tailscale.com/download' },
    ],
    specialConfigs: [
      {
        title: 'Subnet Router Configuration',
        description: 'Expose your entire home LAN network through this server using Tailscale subnet routing:',
        code: 'sudo tailscale up --advertise-routes=192.168.3.0/24',
      },
    ],
  },
  {
    id: 'servarr',
    title: 'qBittorrent & Servarr Media Stack',
    subtitle: 'Automated movie and TV downloading, indexing, quality profiling, and organizing',
    category: 'automation',
    icon: <Film className="w-5 h-5 text-amber-400" />,
    accentColor: '#f59e0b',
    endpoints: [
      { label: 'qBittorrent Headless', value: 'http://100.108.215.120:8080' },
      { label: 'Radarr (Movies)', value: 'http://100.108.215.120:7878' },
      { label: 'Sonarr (TV Shows)', value: 'http://100.108.215.120:8989' },
      { label: 'Prowlarr (Indexers)', value: 'http://100.108.215.120:9696' },
      { label: 'Bazarr (Subtitles)', value: 'http://100.108.215.120:6767' },
    ],
    steps: [
      {
        title: 'Link Indexers in Prowlarr',
        description: 'In Prowlarr Settings ➔ Apps: add Radarr and Sonarr with their respective API keys. Prowlarr will automatically sync all torrent indexers and Torznab proxies to both apps.',
      },
      {
        title: 'Link Download Client in Radarr & Sonarr',
        description: 'In Radarr/Sonarr Settings ➔ Download Clients: add qBittorrent pointing to localhost on port 8080.',
        code: 'Host: localhost\nPort: 8080',
      },
      {
        title: 'Set Media Library Path',
        description: 'Point root movie folders to /srv/media/movies and TV show folders to /srv/media/tv for automated Jellyfin library scans.',
      },
    ],
    clientApps: [
      { name: 'qBitController (Android)', platform: 'Android', link: 'https://github.com/lgallard/qBitController' },
      { name: 'LunaSea (Homelab Arr Client)', platform: 'iOS / Android', link: 'https://www.lunasea.app' },
    ],
    specialConfigs: [
      {
        title: 'Hardlinks for Zero Disk Duplication',
        description: 'In Radarr and Sonarr Media Management Settings: enable "Use Hardlinks instead of Copy". Downloads in /srv/media/torrents are instant-linked to your Jellyfin library without taking double the disk space.',
      },
    ],
  },
];

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
          {/* Left Sidebar: Guide Selection */}
          <div className="w-full md:w-72 lg:w-80 bg-[#0d1017] border-b md:border-b-0 md:border-r border-tinapple-border flex flex-col shrink-0">
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
