"""
tinapple-chadwm-store - Core library package
"""
from .store import PackageManager, Package, Repo
from .settings import ConfigTile, SettingsManager, TileRegistry
from .remote import RemoteBackend, RemoteManager, RemoteDesktopType
from .ui import TileRenderer, ColorScheme, IconSet

__all__ = [
    'PackageManager', 'Package', 'Repo',
    'ConfigTile', 'SettingsManager', 'TileRegistry',
    'RemoteBackend', 'RemoteManager', 'RemoteDesktopType',
    'TileRenderer', 'ColorScheme', 'IconSet'
]

__version__ = '0.1.0'