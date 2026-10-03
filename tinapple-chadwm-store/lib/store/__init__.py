"""
Package management for tinapple-chadwm-store
Handles pacman, AUR, and tinapple-repo packages
"""
import os
import json
import subprocess
import threading
import time
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Set
from enum import Enum
from pathlib import Path


class PackageSource(Enum):
    PACMAN = "pacman"
    AUR = "aur"
    TINAPPLE_REPO = "tinapple-repo"
    FLATPAK = "flatpak"
    SNAP = "snap"


class PackageStatus(Enum):
    INSTALLED = "installed"
    NOT_INSTALLED = "not_installed"
    UPDATE_AVAILABLE = "update_available"
    BROKEN = "broken"


@dataclass
class Package:
    name: str
    version: str
    description: str
    source: PackageSource
    category: str
    tags: List[str] = field(default_factory=list)
    installed_version: Optional[str] = None
    status: PackageStatus = PackageStatus.NOT_INSTALLED
    size: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    maintainer: Optional[str] = None
    url: Optional[str] = None
    license: Optional[str] = None
    last_update: Optional[str] = None
    votes: int = 0
    popularity: float = 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d['source'] = self.source.value
        d['status'] = self.status.value
        return d

    @classmethod
    def from_dict(cls, data: dict) -> 'Package':
        data['source'] = PackageSource(data['source'])
        data['status'] = PackageStatus(data['status'])
        return cls(**data)


@dataclass
class Repo:
    name: str
    url: str
    priority: int = 0
    enabled: bool = True
    gpg_key: Optional[str] = None


class PackageManager:
    """Manages packages from multiple sources"""
    
    # Category mapping for packages
    CATEGORIES = {
        'media': ['vlc', 'mpv', 'jellyfin', 'plex', 'emby', 'navidrome', 'sonarr', 'radarr', 'bazarr', 'prowlarr', 'lidarr', 'readarr'],
        'development': ['neovim', 'vim', 'vscode', 'code', 'git', 'docker', 'podman', 'lazygit', 'lazydocker', 'nodejs', 'python', 'go', 'rust', 'zig', 'cmake', 'ninja', 'meson'],
        'system': ['htop', 'btop', 'btm', 'ncdu', 'duf', 'dust', 'procs', 'fd', 'ripgrep', 'fzf', 'zoxide', 'eza', 'bat', 'delta', 'lsd', 'tree', 'jq', 'yq', 'httpie', 'curl', 'wget', 'rsync', 'rclone', 'syncthing'],
        'network': ['tailscale', 'wireguard', 'openvpn', 'networkmanager', 'nmcli', 'nmap', 'masscan', 'wireshark', 'tcpdump', 'iftop', 'nethogs', 'bandwhich', 'ssh', 'mosh', 'teleport'],
        'gaming': ['steam', 'lutris', 'heroic', 'bottles', 'gamescope', 'mangohud', 'goverlay', 'protonup-qt', 'retroarch', 'pcsx2', 'rpcs3', 'dolphin-emu', 'ryujinx', 'yuzu'],
        'utilities': ['flameshot', 'grim', 'slurp', 'wl-clipboard', 'wl-clipboard-history', 'rofi', 'wofi', 'fuzzel', 'dunst', 'mako', 'swaync', 'kanshi', 'wdisplays', 'wlr-randr', 'foot', 'alacritty', 'kitty', 'wezterm', 'zellij', 'tmux', 'screen'],
        'graphics': ['gimp', 'krita', 'inkscape', 'blender', 'darktable', 'rawtherapee', 'digikam', 'nomacs', 'feh', 'sxiv', 'imv', 'mpv', 'vlc'],
        'office': ['libreoffice', 'onlyoffice', 'obsidian', 'logseq', 'notion', 'typora', 'marktext', 'zathura', 'okular', 'evince', 'mupdf'],
        'communication': ['discord', 'element', 'signal', 'telegram', 'thunderbird', 'evolution', 'geary', 'mailspring', 'mutt', 'neomutt', 'irssi', 'weechat'],
        'security': ['keepassxc', 'bitwarden', 'vaultwarden', 'pass', 'gopass', 'age', 'sops', 'veracrypt', 'cryptsetup', 'luks', 'apparmor', 'selinux', 'firejail', 'bubblewrap'],
    }
    
    # Popular packages with metadata
    POPULAR_PACKAGES = {
        # Media
        'jellyfin': {'category': 'media', 'description': 'Media server', 'tags': ['streaming', 'server']},
        'navidrome': {'category': 'media', 'description': 'Music server', 'tags': ['music', 'subsonic']},
        'sonarr': {'category': 'media', 'description': 'TV show manager', 'tags': ['automation', 'tv']},
        'radarr': {'category': 'media', 'description': 'Movie manager', 'tags': ['automation', 'movies']},
        'bazarr': {'category': 'media', 'description': 'Subtitle manager', 'tags': ['subtitles']},
        'prowlarr': {'category': 'media', 'description': 'Indexer manager', 'tags': ['indexers']},
        'qbittorrent-nox': {'category': 'media', 'description': 'Torrent client', 'tags': ['torrent', 'download']},
        'syncthing': {'category': 'media', 'description': 'File sync', 'tags': ['sync', 'p2p']},
        
        # Development
        'neovim': {'category': 'development', 'description': 'Modern vim', 'tags': ['editor', 'terminal']},
        'vscode': {'category': 'development', 'description': 'VS Code', 'tags': ['editor', 'gui']},
        'docker': {'category': 'development', 'description': 'Container platform', 'tags': ['containers']},
        'lazygit': {'category': 'development', 'description': 'Git TUI', 'tags': ['git', 'tui']},
        'lazydocker': {'category': 'development', 'description': 'Docker TUI', 'tags': ['docker', 'tui']},
        
        # System
        'btop': {'category': 'system', 'description': 'Resource monitor', 'tags': ['monitor', 'tui']},
        'ncdu': {'category': 'system', 'description': 'Disk usage analyzer', 'tags': ['disk', 'tui']},
        'ripgrep': {'category': 'system', 'description': 'Fast grep', 'tags': ['search']},
        'fzf': {'category': 'system', 'description': 'Fuzzy finder', 'tags': ['fuzzy', 'terminal']},
        'eza': {'category': 'system', 'description': 'Modern ls', 'tags': ['ls', 'terminal']},
        'bat': {'category': 'system', 'description': 'Cat with syntax highlighting', 'tags': ['cat', 'terminal']},
        'zoxide': {'category': 'system', 'description': 'Smart cd', 'tags': ['navigation']},
        
        # Network
        'tailscale': {'category': 'network', 'description': 'Mesh VPN', 'tags': ['vpn', 'mesh']},
        'mosh': {'category': 'network', 'description': 'Mobile shell', 'tags': ['ssh', 'roaming']},
        'teleport': {'category': 'network', 'description': 'Access plane', 'tags': ['ssh', 'kubernetes']},
        
        # Gaming
        'steam': {'category': 'gaming', 'description': 'Game platform', 'tags': ['games', 'valve']},
        'lutris': {'category': 'gaming', 'description': 'Game manager', 'tags': ['wine', 'games']},
        'gamescope': {'category': 'gaming', 'description': 'Game compositor', 'tags': ['wayland', 'steamdeck']},
        'mangohud': {'category': 'gaming', 'description': 'Overlay HUD', 'tags': ['fps', 'monitoring']},
        
        # Utilities
        'rofi': {'category': 'utilities', 'description': 'App launcher', 'tags': ['launcher', 'dmenu']},
        'dunst': {'category': 'utilities', 'description': 'Notifications', 'tags': ['notifications']},
        'foot': {'category': 'utilities', 'description': 'Wayland terminal', 'tags': ['terminal', 'wayland']},
        'zellij': {'category': 'utilities', 'description': 'Terminal multiplexer', 'tags': ['tmux', 'terminal']},
        
        # Graphics
        'gimp': {'category': 'graphics', 'description': 'Image editor', 'tags': ['image', 'editing']},
        'krita': {'category': 'graphics', 'description': 'Digital painting', 'tags': ['painting', 'art']},
        'blender': {'category': 'graphics', 'description': '3D creation', 'tags': ['3d', 'animation']},
        
        # Office
        'obsidian': {'category': 'office', 'description': 'Note taking', 'tags': ['notes', 'markdown']},
        'zathura': {'category': 'office', 'description': 'Document viewer', 'tags': ['pdf', 'viewer']},
        
        # Communication
        'element': {'category': 'communication', 'description': 'Matrix client', 'tags': ['matrix', 'chat']},
        'signal': {'category': 'communication', 'description': 'Signal desktop', 'tags': ['signal', 'encrypted']},
        
        # Security
        'keepassxc': {'category': 'security', 'description': 'Password manager', 'tags': ['passwords', 'keepass']},
        'bitwarden': {'category': 'security', 'description': 'Bitwarden client', 'tags': ['passwords', 'cloud']},
        'age': {'category': 'security', 'description': 'Encryption tool', 'tags': ['encryption', 'cli']},
    }

    def __init__(self):
        self.cache: Dict[str, Package] = {}
        self.cache_lock = threading.Lock()
        self.repos: List[Repo] = [
            Repo("tinapple-repo", "https://repo.tinapple.dev", priority=10),
            Repo("core", "https://archlinux.org/packages/", priority=0),
            Repo("extra", "https://archlinux.org/packages/extra/", priority=0),
            Repo("community", "https://archlinux.org/packages/community/", priority=0),
            Repo("multilib", "https://archlinux.org/packages/multilib/", priority=0),
        ]
        self._load_cache()

    def _load_cache(self):
        """Load package cache from disk"""
        cache_file = Path.home() / '.cache' / 'tinapple-chadwm-store' / 'packages.json'
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    for pkg_data in data:
                        pkg = Package.from_dict(pkg_data)
                        self.cache[pkg.name] = pkg
            except Exception:
                pass

    def _save_cache(self):
        """Save package cache to disk"""
        cache_file = Path.home() / '.cache' / 'tinapple-chadwm-store' / 'packages.json'
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(cache_file, 'w') as f:
                json.dump([pkg.to_dict() for pkg in self.cache.values()], f, indent=2)
        except Exception:
            pass

    def refresh(self, force: bool = False) -> bool:
        """Refresh package database from all sources"""
        # Update pacman database
        try:
            subprocess.run(['sudo', 'pacman', '-Sy'], check=True, capture_output=True, timeout=30)
        except subprocess.CalledProcessError:
            return False
        
        # Get installed packages
        self._update_installed_packages()
        
        # Update AUR info if yay available
        self._update_aur_packages()
        
        # Update tinapple-repo if available
        self._update_tinapple_repo()
        
        self._save_cache()
        return True

    def _update_installed_packages(self):
        """Get list of installed packages and versions"""
        try:
            result = subprocess.run(['pacman', '-Q'], capture_output=True, text=True, timeout=10)
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0]
                        version = parts[1]
                        if name in self.cache:
                            self.cache[name].installed_version = version
                            self.cache[name].status = PackageStatus.INSTALLED
                        else:
                            # Check if it's a popular package
                            meta = self.POPULAR_PACKAGES.get(name, {})
                            pkg = Package(
                                name=name,
                                version=version,
                                description=meta.get('description', ''),
                                source=PackageSource.PACMAN,
                                category=meta.get('category', 'system'),
                                tags=meta.get('tags', []),
                                installed_version=version,
                                status=PackageStatus.INSTALLED
                            )
                            self.cache[name] = pkg
        except Exception:
            pass

    def _update_aur_packages(self):
        """Update AUR package info"""
        try:
            # Check if yay is available
            result = subprocess.run(['which', 'yay'], capture_output=True)
            if result.returncode != 0:
                return
            
            # Search for popular AUR packages
            for name, meta in self.POPULAR_PACKAGES.items():
                if name in self.cache:
                    continue
                try:
                    result = subprocess.run(['yay', '-Si', name], capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        pkg = Package(
                            name=name,
                            version='',
                            description=meta.get('description', ''),
                            source=PackageSource.AUR,
                            category=meta.get('category', 'system'),
                            tags=meta.get('tags', []),
                            status=PackageStatus.NOT_INSTALLED
                        )
                        self.cache[name] = pkg
                except Exception:
                    pass
        except Exception:
            pass

    def _update_tinapple_repo(self):
        """Update tinapple-repo packages"""
        try:
            repo_path = Path('/opt/tinapple-repo')
            if not repo_path.exists():
                return
            
            # Look for package database
            for db_file in repo_path.glob('*.db'):
                # Parse repo database (simplified)
                pass
        except Exception:
            pass

    def search(self, query: str, category: Optional[str] = None, source: Optional[PackageSource] = None) -> List[Package]:
        """Search packages"""
        results = []
        query_lower = query.lower()
        
        for pkg in self.cache.values():
            if source and pkg.source != source:
                continue
            if category and pkg.category != category:
                continue
            
            if (query_lower in pkg.name.lower() or 
                query_lower in pkg.description.lower() or
                any(query_lower in tag.lower() for tag in pkg.tags)):
                results.append(pkg)
        
        # Sort: installed first, then by popularity
        results.sort(key=lambda p: (p.status != PackageStatus.INSTALLED, -p.popularity))
        return results

    def get_categories(self) -> List[str]:
        """Get all categories"""
        categories = set()
        for pkg in self.cache.values():
            categories.add(pkg.category)
        return sorted(categories)

    def install(self, package_names: List[str], source: Optional[PackageSource] = None, dry_run: bool = False) -> Dict[str, bool]:
        """Install packages"""
        results = {}
        
        for name in package_names:
            if name not in self.cache:
                results[name] = False
                continue
            
            pkg = self.cache[name]
            
            if dry_run:
                results[name] = True
                continue
            
            try:
                if pkg.source == PackageSource.PACMAN or pkg.source == PackageSource.TINAPPLE_REPO:
                    cmd = ['sudo', 'pacman', '-S', '--noconfirm', name]
                elif pkg.source == PackageSource.AUR:
                    cmd = ['yay', '-S', '--noconfirm', name]
                elif pkg.source == PackageSource.FLATPAK:
                    cmd = ['flatpak', 'install', '-y', name]
                else:
                    results[name] = False
                    continue
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                success = result.returncode == 0
                results[name] = success
                
                if success:
                    pkg.status = PackageStatus.INSTALLED
                    self._update_installed_packages()
                    
            except subprocess.TimeoutExpired:
                results[name] = False
            except Exception:
                results[name] = False
        
        self._save_cache()
        return results

    def remove(self, package_names: List[str], keep_deps: bool = False) -> Dict[str, bool]:
        """Remove packages"""
        results = {}
        
        for name in package_names:
            if name not in self.cache:
                results[name] = False
                continue
            
            try:
                cmd = ['sudo', 'pacman', '-R']
                if not keep_deps:
                    cmd.append('-s')
                cmd.extend(['--noconfirm', name])
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                success = result.returncode == 0
                results[name] = success
                
                if success:
                    if name in self.cache:
                        self.cache[name].status = PackageStatus.NOT_INSTALLED
                        self.cache[name].installed_version = None
                        
            except Exception:
                results[name] = False
        
        self._save_cache()
        return results

    def update(self, package_names: Optional[List[str]] = None) -> Dict[str, bool]:
        """Update packages"""
        if package_names is None:
            # Full system update
            try:
                result = subprocess.run(['sudo', 'pacman', '-Syu', '--noconfirm'], 
                                      capture_output=True, text=True, timeout=600)
                success = result.returncode == 0
                self._update_installed_packages()
                self._save_cache()
                return {'system': success}
            except Exception:
                return {'system': False}
        
        results = {}
        for name in package_names:
            if name not in self.cache:
                results[name] = False
                continue
            
            pkg = self.cache[name]
            try:
                if pkg.source == PackageSource.PACMAN or pkg.source == PackageSource.TINAPPLE_REPO:
                    cmd = ['sudo', 'pacman', '-S', '--noconfirm', name]
                elif pkg.source == PackageSource.AUR:
                    cmd = ['yay', '-S', '--noconfirm', name]
                else:
                    results[name] = False
                    continue
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                success = result.returncode == 0
                results[name] = success
                
            except Exception:
                results[name] = False
        
        self._update_installed_packages()
        self._save_cache()
        return results

    def get_updates(self) -> List[Package]:
        """Get packages with available updates"""
        updates = []
        try:
            result = subprocess.run(['pacman', '-Qu'], capture_output=True, text=True, timeout=10)
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0]
                        new_version = parts[1]
                        if name in self.cache:
                            pkg = self.cache[name]
                            pkg.status = PackageStatus.UPDATE_AVAILABLE
                            updates.append(pkg)
        except Exception:
            pass
        return updates