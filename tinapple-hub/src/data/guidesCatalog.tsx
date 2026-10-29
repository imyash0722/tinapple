import React from 'react';
import {
  Tv,
  Book,
  MessageSquare,
  KeyRound,
  FolderSync,
  FileText,
  ShieldCheck,
  Film,
  Sparkles,
  Download,
  Sliders,
  LayoutGrid,
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

export const GUIDES_CATALOG: GuideArticle[] = [
  {
    id: 'jellyfin',
    title: 'Jellyfin Media Server & Plezy Client',
    subtitle: 'Hardware-accelerated streaming, DirectPlay, and Plezy desktop/mobile setup',
    category: 'media',
    icon: <Tv className="w-5 h-5 text-purple-400" />,
    accentColor: '#aa74e8',
    htmlGuidePath: '/guides/plezy.html',
    endpoints: [
      { label: 'Permanent MagicDNS', value: 'http://pineapple-server.taildb42a2.ts.net:8096' },
      { label: 'Tailscale IP Host', value: 'http://100.108.215.120:8096' },
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
      { label: 'Suwayomi Web Reader', value: 'http://100.108.215.120:4567' },
      { label: 'SyncYomi Web GUI', value: 'http://100.108.215.120:8282' },
      { label: 'Tsumiru Phone Port', value: 'Port 4567 (Tailscale or Hotspot 192.168.4.1)' },
    ],
    steps: [
      {
        title: 'Open SyncYomi Dashboard & Generate API Token',
        description: 'Navigate to the SyncYomi web portal, create an account, then go to Settings ➔ API Keys and click "Add API Key". Copy the generated token.',
        code: 'http://100.108.215.120:8282',
      },
      {
        title: 'Configure Mobile Reader (Mihon / Komikku)',
        description: 'On your Android device in Mihon / TachiyomiSY: Settings ➔ Data and Storage ➔ Sync (SyncYomi v2). Enter the SyncYomi host and token.',
        code: 'Host: http://100.108.215.120:8282',
        tip: 'Sync runs automatically every 15 minutes and immediately after closing a chapter.',
      },
      {
        title: 'Direct Suwayomi Desktop & Browser Streaming',
        description: 'To browse extensions and read directly on laptop or PC without syncing, use the Suwayomi web portal on port 4567.',
        code: 'http://100.108.215.120:4567',
      },
    ],
    clientApps: [
      { name: 'Tsumiru Client (APK)', platform: 'Android (Native)', link: '/download/tsumiru', badge: 'Pre-Packaged' },
      { name: 'Mihon Reader', platform: 'Android (Manga/Comics)', link: 'https://mihon.app/download/' },
      { name: 'Komikku Reader', platform: 'Linux (Flatpak)', link: 'https://flathub.org/apps/info.febvre.Komikku' },
      { name: 'Suwayomi-CE Client', platform: 'Windows / Mac / Linux', link: 'https://github.com/Suwayomi/Suwayomi-Server' },
    ],
    specialConfigs: [
      {
        title: 'Keiyoushi Source Extension Repository',
        description: 'Add this extension repository URL to Suwayomi / Mihon to access 1,000+ manga, webtoon, and manhwa sources:',
        code: 'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json',
      },
    ],
  },
  {
    id: 'beeper',
    title: 'Beeper Matrix Bridges & Multi-Chat Unified Inbox',
    subtitle: 'Self-hosted iMessage, WhatsApp, Telegram, Signal, and Discord bridges',
    category: 'chat',
    icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
    accentColor: '#10b981',
    htmlGuidePath: '/guides/beeper.html',
    endpoints: [
      { label: 'Installed CLI', value: 'beeper (via /usr/local/bin/beeper)' },
      { label: 'Config Directory', value: '~/.config/beeper/' },
    ],
    steps: [
      {
        title: 'Authenticate with Beeper via CLI',
        description: 'Run the beeper bridge control utility to authenticate with your Beeper Matrix account and configure messaging bridges.',
        code: 'beeper login',
      },
      {
        title: 'Link WhatsApp, Signal & Telegram',
        description: 'Generate QR codes and connection links directly in your terminal to pair your phone messaging accounts.',
        code: 'beeper bridge connect whatsapp',
        tip: 'Scan the generated ASCII QR code with WhatsApp ➔ Linked Devices.',
      },
      {
        title: 'Self-Hosted Relay & Bridge Status',
        description: 'Inspect live health, connection latency, and sync state across all active bridges at any time.',
        code: 'beeper status',
      },
    ],
    clientApps: [
      { name: 'Beeper Desktop', platform: 'Linux / Mac / Windows', link: 'https://www.beeper.com/download' },
      { name: 'Beeper Android', platform: 'Android (Google Play)', link: 'https://play.google.com/store/apps/details?id=com.beeper.chat' },
      { name: 'Beeper iOS', platform: 'iOS (App Store)', link: 'https://apps.apple.com/app/beeper/id1559868707' },
    ],
    specialConfigs: [
      {
        title: 'Automated Systemd Bridge Watchdog',
        description: 'Run bridges in the background as a user systemd service with automatic crash recovery:',
        code: 'systemctl --user enable --now beeper-bridges.service',
      },
    ],
  },
  {
    id: 'vaultwarden',
    title: 'Vaultwarden Bitwarden Password Manager',
    subtitle: 'Zero-knowledge end-to-end encrypted credential vault with Bitwarden apps',
    category: 'cloud',
    icon: <KeyRound className="w-5 h-5 text-blue-400" />,
    accentColor: '#3b82f6',
    htmlGuidePath: '/guides/vaultwarden.html',
    endpoints: [
      { label: 'Local LAN / Tailscale Port', value: 'http://100.108.215.120:8000' },
      { label: 'Encrypted SQLite DB', value: '/var/lib/vaultwarden/db.sqlite3' },
    ],
    steps: [
      {
        title: 'Open Web Vault & Create Primary Account',
        description: 'Open the Vaultwarden web interface in your browser and click "Create Account". Use a strong master passphrase.',
        code: 'http://100.108.215.120:8000',
        tip: 'Web Crypto API requires HTTPS or localhost. Connect via Tailscale MagicDNS or configure Caddy SSL for browser autofill.',
      },
      {
        title: 'Connect Bitwarden Extension & Mobile Apps',
        description: 'In the official Bitwarden browser extension or mobile app, click the Gear icon (Settings) on the login screen, and enter your server URL under "Self-hosted environment".',
        code: 'Server URL: https://pineapple-server.taildb42a2.ts.net',
      },
      {
        title: 'Lock Down Signups After Setup',
        description: 'Prevent unauthorized users from creating accounts on your vault by setting SIGNUPS_ALLOWED=false in /etc/vaultwarden.env.',
        code: 'sudo sed -i "s/SIGNUPS_ALLOWED=true/SIGNUPS_ALLOWED=false/" /etc/vaultwarden.env && sudo systemctl restart vaultwarden',
      },
    ],
    clientApps: [
      { name: 'Bitwarden Chrome / Brave', platform: 'Browser Extension', link: 'https://chromewebstore.google.com/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb' },
      { name: 'Bitwarden Firefox', platform: 'Browser Extension', link: 'https://addons.mozilla.org/firefox/addon/bitwarden-password-manager/' },
      { name: 'Bitwarden Android', platform: 'Android (Google Play / F-Droid)', link: 'https://mobile.bitwarden.com/android' },
      { name: 'Bitwarden iOS', platform: 'iOS (App Store)', link: 'https://mobile.bitwarden.com/ios' },
    ],
    specialConfigs: [
      {
        title: 'Automated Daily Backup Snapshot',
        description: 'Back up your encrypted vault database securely with an atomic SQLite backup hook:',
        code: 'sqlite3 /var/lib/vaultwarden/db.sqlite3 ".backup /srv/backups/vaultwarden-$(date +%F).sqlite3"',
      },
    ],
  },
  {
    id: 'syncthing',
    title: 'Syncthing Continuous Decentralized P2P Folder Sync',
    subtitle: 'Zero-cloud bidirectional folder replication across laptops, phones, and server',
    category: 'cloud',
    icon: <FolderSync className="w-5 h-5 text-sky-400" />,
    accentColor: '#0ea5e9',
    htmlGuidePath: '/guides/syncthing.html',
    endpoints: [
      { label: 'Web Management GUI', value: 'http://100.108.215.120:8384' },
      { label: 'Client Auto-Pair Script', value: 'curl http://100.108.215.120:8088/pair.sh | bash' },
      { label: 'Sync Protocol Port', value: 'Port 22000 (TCP/UDP)' },
    ],
    steps: [
      {
        title: 'Access Syncthing Web GUI',
        description: 'Open the Syncthing dashboard on port 8384. You will see your node Device ID in the top right (Actions ➔ Show ID).',
        code: 'http://100.108.215.120:8384',
      },
      {
        title: 'One-Command Auto-Pairing for Client PCs',
        description: 'On any client machine on your network (laptop or desktop), run this curl one-liner to install Syncthing, register this server as an introducer, and configure folders automatically:',
        code: 'curl -fsSL http://100.108.215.120:8088/pair.sh | bash',
        tip: 'Works on Arch, Debian, Ubuntu, Fedora, and macOS.',
      },
      {
        title: 'Android & iOS Folder Sync',
        description: 'Install Syncthing on Android (or Mobius Sync on iOS). Scan the QR code shown on the server Web GUI under "Add Remote Device" to pair in seconds.',
      },
    ],
    clientApps: [
      { name: 'Syncthing Linux / Mac', platform: 'Desktop (CLI & Web)', link: 'https://syncthing.net/downloads/' },
      { name: 'Syncthing-Fork Android', platform: 'Android (F-Droid & Play)', link: 'https://github.com/Catfriend1/syncthing-android/releases' },
      { name: 'SyncTrayzor Windows', platform: 'Windows (Tray & Service)', link: 'https://github.com/canton7/SyncTrayzor/releases' },
      { name: 'Möbius Sync iOS', platform: 'iOS (App Store)', link: 'https://www.mobiussync.com/' },
    ],
    specialConfigs: [
      {
        title: 'Ignore Permissions (ignorePerms) for Cross-OS Harmony',
        description: 'To avoid file permission conflicts between Linux POSIX and Windows/Android FAT/NTFS filesystems, ensure ignorePerms is enabled on shared folders:',
        code: '<ignorePerms>true</ignorePerms>',
      },
    ],
  },
  {
    id: 'obsidian',
    title: 'Obsidian LiveSync & Encrypted CouchDB Cloud',
    subtitle: 'Instant markdown note synchronization across iOS, Android, and PC',
    category: 'cloud',
    icon: <FileText className="w-5 h-5 text-indigo-400" />,
    accentColor: '#6366f1',
    htmlGuidePath: '/guides/obsidian.html',
    endpoints: [
      { label: 'CouchDB API & Fauxton WebUI', value: 'http://100.108.215.120:5984/_utils/' },
      { label: 'Default Vault Database', value: 'http://100.108.215.120:5984/obsidian-vault' },
    ],
    steps: [
      {
        title: 'Install Self-hosted LiveSync Plugin in Obsidian',
        description: 'Inside Obsidian on any device: Settings ➔ Community plugins ➔ Browse ➔ search for "Self-hosted LiveSync" and click Install & Enable.',
      },
      {
        title: 'Configure LiveSync Server Settings',
        description: 'In Obsidian Settings ➔ Self-hosted LiveSync: enter the CouchDB URI, username, password, and database name.',
        code: 'URI: http://100.108.215.120:5984\nDatabase: obsidian-vault',
        tip: 'Choose "LiveSync" mode for real-time keystroke replication with automated conflict resolution.',
      },
      {
        title: 'Setup Encryption Passphrase',
        description: 'LiveSync encrypts all markdown notes and attachments client-side before sending them to CouchDB. Use the same encryption passphrase across all your devices.',
      },
    ],
    clientApps: [
      { name: 'Obsidian Desktop', platform: 'Linux / Windows / Mac', link: 'https://obsidian.md/download' },
      { name: 'Obsidian Mobile', platform: 'Android (Google Play)', link: 'https://play.google.com/store/apps/details?id=md.obsidian' },
      { name: 'Obsidian iOS', platform: 'iOS (App Store)', link: 'https://apps.apple.com/app/obsidian-connected-notes/id1557175484' },
    ],
    specialConfigs: [
      {
        title: 'CouchDB CORS Configuration',
        description: 'CouchDB must have CORS enabled for Obsidian mobile web requests. Verify /etc/couchdb/local.d/cors.ini contains:',
        code: '[cors]\nenable_cors = true\norigins = app://obsidian.md, capacitor://localhost, http://localhost\ncredentials = true',
      },
    ],
  },
  {
    id: 'tailscale',
    title: 'Tailscale Mesh VPN & Remote LAN Gateway',
    subtitle: 'Zero-config encrypted WireGuard mesh network and subnet router',
    category: 'security',
    icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
    accentColor: '#06b6d4',
    endpoints: [
      { label: 'MagicDNS Domain', value: 'pineapple-server.taildb42a2.ts.net' },
      { label: 'Tailscale IPv4 Address', value: '100.108.215.120' },
      { label: 'Admin Web Portal', value: 'https://login.tailscale.com/admin' },
    ],
    steps: [
      {
        title: 'Verify Node Status',
        description: 'Run tailscale status from terminal to inspect active peers and check that this homelab server is online.',
        code: 'tailscale status',
      },
      {
        title: 'Connect From Your Phone or Laptop',
        description: 'Install the Tailscale client app on your phone, tablet, or laptop. Log into the same Tailscale account. You can instantly access all ports and web UIs using the server Tailscale IP.',
        code: 'http://100.108.215.120:8088',
        tip: 'Tailscale creates direct peer-to-peer WireGuard tunnels with zero port forwarding required.',
      },
      {
        title: 'Advertise Subnet Routes (Optional)',
        description: 'To allow remote devices to access your entire local home LAN network through this server:',
        code: 'sudo tailscale up --advertise-routes=192.168.1.0/24 --accept-routes',
      },
    ],
    clientApps: [
      { name: 'Tailscale Android', platform: 'Android (Play Store)', link: 'https://play.google.com/store/apps/details?id=com.tailscale.ipn' },
      { name: 'Tailscale iOS & macOS', platform: 'Apple App Store', link: 'https://apps.apple.com/app/tailscale/id1470499037' },
      { name: 'Tailscale Windows', platform: 'Windows Installer', link: 'https://tailscale.com/download/windows' },
      { name: 'Tailscale Linux', platform: 'Linux (Arch / Debian)', link: 'https://tailscale.com/download/linux' },
    ],
    specialConfigs: [
      {
        title: 'Tailscale Serve Built-in HTTPS Reverse Proxy',
        description: 'Expose any local service port with automatic TLS certificates via Tailscale Serve:',
        code: 'tailscale serve --bg 8088',
      },
    ],
  },
  {
    id: 'servarr',
    title: 'Servarr Automation Stack (Radarr, Sonarr & Prowlarr)',
    subtitle: 'Automated indexer aggregation, quality profiles, and torrent pipeline',
    category: 'media',
    icon: <Film className="w-5 h-5 text-amber-400" />,
    accentColor: '#f59e0b',
    endpoints: [
      { label: 'Radarr (Movies)', value: 'http://100.108.215.120:7878' },
      { label: 'Sonarr (Series/Anime)', value: 'http://100.108.215.120:8989' },
      { label: 'Prowlarr (Trackers)', value: 'http://100.108.215.120:9696' },
      { label: 'Bazarr (Subtitles)', value: 'http://100.108.215.120:6767' },
      { label: 'qBittorrent (Engine)', value: 'http://100.108.215.120:8080' },
    ],
    steps: [
      {
        title: 'Zero-Touch Pre-Configured Automation',
        description: 'All 5 Servarr applications are pre-wired together in this appliance. Prowlarr automatically syncs 10 public trackers (YTS, Nyaa, LimeTorrents, etc.) to Radarr and Sonarr, which send downloads to qBittorrent and notify Jellyfin when media is ready.',
      },
      {
        title: 'Check Indexers & Sync in Prowlarr',
        description: 'Open Prowlarr on port 9696. Under Indexers, you can add private or public trackers and test connections. Click "Sync App Profiles" to immediately distribute them to Radarr and Sonarr.',
        code: 'http://100.108.215.120:9696',
      },
      {
        title: 'Subtitles Automation in Bazarr',
        description: 'Bazarr monitors your movies and shows libraries, automatically downloading matching SSA/SRT subtitles from OpenSubtitles, Subscene, and YIFY Subtitles.',
        code: 'http://100.108.215.120:6767',
      },
    ],
    clientApps: [
      { name: 'LunaSea (iOS & Android)', platform: 'Universal Servarr Mobile App', link: 'https://www.lunasea.app/' },
      { name: 'nzb360 (Android)', platform: 'Premier Servarr / Torrent Manager', link: 'https://nzb360.com/' },
    ],
    specialConfigs: [
      {
        title: 'FlareSolverr Cloudflare Bypass',
        description: 'FlareSolverr is installed on port 8191 to bypass Cloudflare and DDoS-Guard bot protection on blocked trackers.',
        code: 'http://127.0.0.1:8191/v1',
      },
    ],
  },
  {
    id: 'seerr',
    title: 'Jellyseerr Media Discovery & 1-Click Requests',
    subtitle: 'Unified discover portal for movies and shows with automated approval and download',
    category: 'media',
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    accentColor: '#c084fc',
    htmlGuidePath: '/guides/seerr.html',
    endpoints: [
      { label: 'Jellyseerr Web Portal', value: 'http://100.108.215.120:5055' },
      { label: 'Connected Jellyfin', value: 'http://127.0.0.1:8096' },
      { label: 'Outbound Tor Proxy', value: 'http://127.0.0.1:8118' },
    ],
    steps: [
      {
        title: 'Sign In with Your Jellyfin Credentials',
        description: 'Navigate to Jellyseerr on port 5055 and click "Sign In with Jellyfin". Enter your Jellyfin username and password to log in instantly.',
        code: 'http://100.108.215.120:5055',
        tip: 'Jellyseerr automatically syncs user accounts and permissions from Jellyfin.',
      },
      {
        title: 'Browse Trending, Popular & Upcoming Titles',
        description: 'Discover trending movies, anime, and series with TMDB metadata, trailers, cast lists, and streaming availability across Netflix, Disney+, Prime, and Apple TV.',
      },
      {
        title: '1-Click Request & Automated Pipeline',
        description: 'Click "Request" on any title. Jellyseerr routes the request to Radarr or Sonarr, grabs the highest quality release via Prowlarr, downloads it via qBittorrent, and sends a notification when it appears in Jellyfin.',
      },
    ],
    clientApps: [
      { name: 'Jellyseerr PWA (Mobile)', platform: 'Android / iOS / Chrome', link: 'http://100.108.215.120:5055', badge: 'PWA Installable' },
      { name: 'Plezy Client', platform: 'Desktop Player', link: 'https://github.com/edde746/plezy' },
    ],
    specialConfigs: [
      {
        title: 'Campus Firewall / Proxy Bypass Integration',
        description: 'On restrictive network environments where TMDB is blocked, Jellyseerr routes outbound metadata requests through Privoxy and Tor:',
        code: 'HTTP_PROXY=http://127.0.0.1:8118\nHTTPS_PROXY=http://127.0.0.1:8118',
      },
    ],
  },
  {
    id: 'pinchflat',
    title: 'Pinchflat Automated YouTube Archiver & Jellyfin Sync',
    subtitle: 'Scheduled channel archiver with SponsorBlock, chapters, and Jellyfin NFO tags',
    category: 'media',
    icon: <Download className="w-5 h-5 text-red-400" />,
    accentColor: '#ef4444',
    endpoints: [
      { label: 'Pinchflat Web Dashboard', value: 'http://100.108.215.120:8945' },
      { label: 'YouTube Video Library', value: '/srv/media/youtube' },
      { label: 'YouTube Music Library', value: '/srv/media/youtube-music' },
    ],
    steps: [
      {
        title: 'Access Pinchflat Dashboard',
        description: 'Open the Pinchflat web interface on port 8945 to manage your archived channels and playlists.',
        code: 'http://100.108.215.120:8945',
      },
      {
        title: 'Subscribe to Channels and Playlists',
        description: 'Paste any YouTube channel, playlist, or user URL into Pinchflat. Set quality profile to 1080p or 4K. It will automatically download new uploads as they go live.',
      },
      {
        title: 'Instant Integration with Jellyfin',
        description: 'Downloads are automatically saved to /srv/media/youtube with NFO metadata, thumbnails, and chapter markers, appearing automatically in your Jellyfin "YouTube" library.',
      },
    ],
    clientApps: [
      { name: 'Pinchflat WebUI', platform: 'Web / Responsive Mobile', link: 'http://100.108.215.120:8945' },
    ],
    specialConfigs: [
      {
        title: 'SponsorBlock Automatic Commercial Skipping',
        description: 'In Pinchflat Settings ➔ Post-Processing: enable SponsorBlock to automatically strip sponsored segments and intros from downloaded videos.',
      },
    ],
  },
  {
    id: 'adguard',
    title: 'AdGuard Home Private DNS & Network Ad Blocker',
    subtitle: 'Network-wide DNS-level blocking for ads, trackers, and malicious domains',
    category: 'security',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    accentColor: '#10b981',
    htmlGuidePath: '/guides/adguard.html',
    endpoints: [
      { label: 'Admin Web Dashboard', value: 'http://100.108.215.120:3000' },
      { label: 'DNS Server Port', value: 'Port 53 (TCP/UDP)' },
    ],
    steps: [
      {
        title: 'Open AdGuard Admin Dashboard',
        description: 'Open the AdGuard Home web panel on port 3000 to view query logs, blocked analytics, and blocklist filters.',
        code: 'http://100.108.215.120:3000',
      },
      {
        title: 'Set Router or Phone DNS to Server IP',
        description: 'Configure your Wi-Fi router DNS or your phone Private DNS settings to point to this server IP (100.108.215.120 or local 10.3.2.105). Every device on your home network will instantly have zero ads across all apps and smart TVs.',
      },
      {
        title: 'Configure Upstream DNS-over-HTTPS (DoH)',
        description: 'Under Settings ➔ DNS Settings: set upstream resolvers to Quad9 or Cloudflare DNS-over-HTTPS for encrypted DNS privacy:',
        code: 'https://dns.quad9.net/dns-query\nhttps://cloudflare-dns.com/dns-query',
      },
    ],
    clientApps: [
      { name: 'AdGuard Home WebUI', platform: 'Responsive Web', link: 'http://100.108.215.120:3000' },
    ],
    specialConfigs: [
      {
        title: 'Blocklist Subscriptions',
        description: 'Recommended filter lists: OISD Big, AdGuard Base, and Peter Lowe Adservers.',
      },
    ],
  },
  {
    id: 'navidrome',
    title: 'Navidrome High-Fidelity Subsonic Music Server',
    subtitle: 'Modern lossless music streamer compatible with Symfonium, Feishin & Substreamer',
    category: 'media',
    icon: <Tv className="w-5 h-5 text-amber-400" />,
    accentColor: '#f59e0b',
    htmlGuidePath: '/guides/navidrome.html',
    endpoints: [
      { label: 'Navidrome Web Player', value: 'http://100.108.215.120:4533' },
      { label: 'Music Library Path', value: '/srv/media/music' },
    ],
    steps: [
      {
        title: 'Open Navidrome Web Player',
        description: 'Access the high-speed Web Player on port 4533 to create an admin account and browse your audio collection.',
        code: 'http://100.108.215.120:4533',
      },
      {
        title: 'Connect Mobile Subsonic Players',
        description: 'In Symfonium or Substreamer on Android/iOS, choose "Subsonic" provider and enter your server URL:',
        code: 'http://100.108.215.120:4533',
        tip: 'Supports offline caching, gapless playback, and high-res FLAC direct streaming.',
      },
      {
        title: 'Automatic Library Rescan',
        description: 'Navidrome continuously monitors /srv/media/music for new files and updates album tags in real-time.',
      },
    ],
    clientApps: [
      { name: 'Symfonium (Android)', platform: 'Android (Google Play)', link: 'https://play.google.com/store/apps/details?id=app.symfonik.music.player' },
      { name: 'Substreamer (iOS / Android)', platform: 'Universal Mobile', link: 'https://substreamer.app/' },
      { name: 'Feishin (Desktop)', platform: 'Linux / Windows / Mac', link: 'https://github.com/jeffvli/feishin' },
    ],
    specialConfigs: [
      {
        title: 'Transcoding Cache Settings',
        description: 'Configured in /etc/navidrome/navidrome.toml with TranscodingCacheSize = "2GB" for instant song buffering over cellular data.',
      },
    ],
  },
  {
    id: 'homarr',
    title: 'Homarr Dashboard & Service Canvas',
    subtitle: 'Customizable grid launcher, real-time service pings, and upstream dashboard',
    category: 'cloud',
    icon: <LayoutGrid className="w-5 h-5 text-amber-400" />,
    accentColor: '#f59e0b',
    endpoints: [
      { label: 'Tinapple Hub Canvas Board', value: 'http://100.108.215.120:8088 (Dashboard Tab)' },
      { label: 'Upstream Homarr Container', value: 'http://100.108.215.120:7575' },
      { label: 'Config Directory', value: '/opt/homarr/configs' },
      { label: 'Data Directory', value: '/opt/homarr/data' },
    ],
    steps: [
      {
        title: 'Interactive Canvas Board in Tinapple Hub',
        description: 'Tinapple Hub integrates an authentic Homarr Canvas Board directly on the main Dashboard tab. Each service tile displays live ping indicators, direct ports, and quick launch triggers without needing extra authentication.',
        code: 'http://100.108.215.120:8088',
      },
      {
        title: 'Deploy Upstream Homarr Container Package',
        description: 'If you want full customization with official Homarr widgets (calendar, torrent trackers, weather, custom iframe dashboards), install the Homarr appliance package directly from the Chaddy App Store or via terminal.',
        code: 'sudo systemctl start homarr',
        tip: 'Docker container ghcr.io/ajnart/homarr:latest will start on port 7575 with persistent volume mounts in /opt/homarr.',
      },
      {
        title: 'Add & Reorder Service Tiles',
        description: 'In the Hub Dashboard, use the Homarr widget controls or Settings modal to reorder, pin, or hide application tiles. To add custom services into the upstream container, open port 7575 and click the + icon in edit mode.',
        code: 'http://100.108.215.120:7575',
      },
    ],
    clientApps: [
      { name: 'Tinapple Dashboard Hub', platform: 'Responsive Web / PWA', link: 'http://100.108.215.120:8088', badge: 'Active' },
      { name: 'Upstream Homarr WebUI', platform: 'Containerized Web (Port 7575)', link: 'http://100.108.215.120:7575' },
      { name: 'Homarr GitHub Repo', platform: 'Open Source', link: 'https://github.com/ajnart/homarr' },
    ],
    specialConfigs: [
      {
        title: 'Systemd Container Wrapper Management',
        description: 'The upstream Homarr package is wrapped in a robust systemd service (/etc/systemd/system/homarr.service) with auto-restart, container pruning, and persistent data binding in /opt/homarr.',
        code: 'systemctl status homarr',
      },
      {
        title: 'Local Canvas Persistence',
        description: 'The Hub Homarr Canvas layout and custom tiles are saved locally in the browser under tinapple_homarr_canvas_widgets_v5 for instant zero-latency loading.',
      },
    ],
  },
];
