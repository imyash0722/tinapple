"""
Settings management with tile-based UI for tinapple-chadwm-store
Each config category is a tile with its own config files
"""
import os
import json
import subprocess
import shutil
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from abc import ABC, abstractmethod


class TileCategory(Enum):
    THEME = "theme"
    WINDOW_MANAGER = "window_manager"
    BAR = "bar"
    NOTIFICATIONS = "notifications"
    LAUNCHER = "launcher"
    NETWORK = "network"
    STORAGE = "storage"
    SERVICES = "services"
    SYSTEM = "system"
    SECURITY = "security"
    GAMING = "gaming"
    DEVELOPER = "developer"


@dataclass
class ConfigFile:
    """Represents a configuration file"""
    path: str
    description: str
    editable: bool = True
    backup: bool = True
    template: Optional[str] = None
    validate_cmd: Optional[str] = None
    reload_cmd: Optional[str] = None


@dataclass
class ConfigTile:
    """A tile representing a configuration category"""
    id: str
    name: str
    icon: str
    category: TileCategory
    description: str
    config_files: List[ConfigFile] = field(default_factory=list)
    actions: Dict[str, Callable] = field(default_factory=dict)
    sub_tiles: List['ConfigTile'] = field(default_factory=list)
    enabled: bool = True
    priority: int = 0

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'category': self.category.value,
            'description': self.description,
            'config_files': [asdict(cf) for cf in self.config_files],
            'actions': list(self.actions.keys()),
            'sub_tiles': [st.to_dict() for st in self.sub_tiles],
            'enabled': self.enabled,
            'priority': self.priority
        }


class BaseTile(ABC):
    """Base class for config tiles"""
    
    def __init__(self, settings_manager: 'SettingsManager'):
        self.settings = settings_manager
        self.tile = self.create_tile()
    
    @abstractmethod
    def create_tile(self) -> ConfigTile:
        """Create the tile definition"""
        pass
    
    @abstractmethod
    def apply_config(self, config: Dict[str, Any]) -> bool:
        """Apply configuration changes"""
        pass
    
    @abstractmethod
    def get_current_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        pass
    
    def backup_configs(self) -> bool:
        """Backup all config files"""
        for cf in self.tile.config_files:
            if cf.backup and os.path.exists(cf.path):
                backup_path = cf.path + '.bak'
                try:
                    shutil.copy2(cf.path, backup_path)
                except Exception:
                    return False
        return True
    
    def restore_backup(self) -> bool:
        """Restore config files from backup"""
        for cf in self.tile.config_files:
            backup_path = cf.path + '.bak'
            if os.path.exists(backup_path):
                try:
                    shutil.copy2(backup_path, cf.path)
                except Exception:
                    return False
        return True
    
    def validate(self) -> bool:
        """Validate config files"""
        for cf in self.tile.config_files:
            if cf.validate_cmd:
                try:
                    result = subprocess.run(cf.validate_cmd, shell=True, capture_output=True, timeout=10)
                    if result.returncode != 0:
                        return False
                except Exception:
                    return False
        return True
    
    def reload_services(self) -> bool:
        """Reload associated services"""
        for cf in self.tile.config_files:
            if cf.reload_cmd:
                try:
                    subprocess.run(cf.reload_cmd, shell=True, capture_output=True, timeout=10)
                except Exception:
                    pass
        return True


class SettingsManager:
    """Manages all configuration tiles"""
    
    def __init__(self, config_dir: str = '/mnt/shared/projects/tinapple/tinarchy-src/configs'):
        self.config_dir = Path(config_dir)
        self.tiles: Dict[str, ConfigTile] = {}
        self.tile_instances: Dict[str, BaseTile] = {}
        self._register_tiles()
    
    def _register_tiles(self):
        """Register all configuration tiles"""
        # Import tile implementations
        from .tiles.theme import ThemeTile
        from .tiles.wm import WMTile
        from .tiles.bar import BarTile
        from .tiles.notifications import NotificationsTile
        from .tiles.launcher import LauncherTile
        from .tiles.network import NetworkTile
        from .tiles.storage import StorageTile
        from .tiles.services import ServicesTile
        from .tiles.system import SystemTile
        from .tiles.security import SecurityTile
        from .tiles.gaming import GamingTile
        from .tiles.developer import DeveloperTile
        
        tile_classes = [
            ThemeTile, WMTile, BarTile, NotificationsTile, LauncherTile,
            NetworkTile, StorageTile, ServicesTile, SystemTile,
            SecurityTile, GamingTile, DeveloperTile
        ]
        
        for tile_class in tile_classes:
            instance = tile_class(self)
            self.tiles[instance.tile.id] = instance.tile
            self.tile_instances[instance.tile.id] = instance
    
    def get_tile(self, tile_id: str) -> Optional[ConfigTile]:
        """Get a tile by ID"""
        return self.tiles.get(tile_id)
    
    def get_all_tiles(self) -> List[ConfigTile]:
        """Get all tiles sorted by priority"""
        return sorted(self.tiles.values(), key=lambda t: t.priority)
    
    def get_tiles_by_category(self, category: TileCategory) -> List[ConfigTile]:
        """Get tiles filtered by category"""
        return [t for t in self.tiles.values() if t.category == category]
    
    def apply_tile_config(self, tile_id: str, config: Dict[str, Any]) -> bool:
        """Apply configuration to a tile"""
        instance = self.tile_instances.get(tile_id)
        if not instance:
            return False
        
        # Backup first
        instance.backup_configs()
        
        # Apply config
        success = instance.apply_config(config)
        
        if success:
            # Validate
            if not instance.validate():
                instance.restore_backup()
                return False
            
            # Reload services
            instance.reload_services()
        
        return success
    
    def get_tile_config(self, tile_id: str) -> Optional[Dict[str, Any]]:
        """Get current configuration for a tile"""
        instance = self.tile_instances.get(tile_id)
        if not instance:
            return None
        return instance.get_current_config()
    
    def reset_tile(self, tile_id: str) -> bool:
        """Reset tile to defaults"""
        instance = self.tile_instances.get(tile_id)
        if not instance:
            return False
        
        instance.backup_configs()
        
        # Apply default config
        default_config = instance.get_default_config()
        success = instance.apply_config(default_config)
        
        if success:
            instance.reload_services()
        
        return success


# Global settings manager instance
_settings_manager: Optional[SettingsManager] = None


def get_settings_manager() -> SettingsManager:
    """Get global settings manager instance"""
    global _settings_manager
    if _settings_manager is None:
        _settings_manager = SettingsManager()
    return _settings_manager