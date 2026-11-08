package org.tinapple.hub.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.tinapple.hub.data.BUNDLED_WALLPAPERS
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ProtonStatus
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemInfo
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.network.TinappleApiClient

private val DEFAULT_FALLBACK_SERVICES = listOf(
    ServiceItem(
        name = "tinapple-dash.service",
        displayName = "Tinapple Dashboard",
        tagline = "Central unified node dashboard and control plane",
        activeState = "active",
        category = "core",
        port = 8088,
        running = true
    ),
    ServiceItem(
        name = "qbittorrent-nox.service",
        displayName = "qBittorrent",
        tagline = "High-performance BitTorrent client with Web UI",
        activeState = "active",
        category = "downloads",
        port = 8080,
        running = true
    ),
    ServiceItem(
        name = "sonarr.service",
        displayName = "Sonarr",
        tagline = "Smart PVR and automated TV episode downloader",
        activeState = "active",
        category = "media",
        port = 8989,
        running = true
    ),
    ServiceItem(
        name = "radarr.service",
        displayName = "Radarr",
        tagline = "Movie collection manager and automatic torrent grabber",
        activeState = "active",
        category = "media",
        port = 7878,
        running = true
    ),
    ServiceItem(
        name = "ombi.service",
        displayName = "Ombi",
        tagline = "Self-hosted media request management system",
        activeState = "active",
        category = "media",
        port = 5000,
        running = true
    ),
    ServiceItem(
        name = "tinapple-torrent-healer.service",
        displayName = "Watcherr Healer",
        tagline = "Automated zero-seeder detector and torrent re-indexer",
        activeState = "active",
        category = "core",
        running = true
    ),
    ServiceItem(
        name = "tailscaled.service",
        displayName = "Tailscale Mesh",
        tagline = "Zero-config wireguard peer mesh network",
        activeState = "active",
        category = "network",
        running = true
    )
)

data class MainUiState(
    val services: List<ServiceItem> = DEFAULT_FALLBACK_SERVICES,
    val protonStatus: ProtonStatus = ProtonStatus(),
    val systemInfo: SystemInfo = SystemInfo(),
    val wallpapers: List<WallpaperItem> = BUNDLED_WALLPAPERS,
    val selectedPalette: ThemePalette = DEFAULT_PALETTES.first(),
    val selectedWallpaper: WallpaperItem = BUNDLED_WALLPAPERS.first(),
    val activeServerOrigin: String = "http://192.168.1.103:8088",
    val isDiscovering: Boolean = false,
    val isRefreshing: Boolean = false,
    val togglingServiceMap: Map<String, Boolean> = emptyMap(),
    val isTogglingProton: Boolean = false,
    val errorMessage: String? = null
)

class TinappleViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = application.getSharedPreferences("tinapple_app_prefs", Context.MODE_PRIVATE)

    private val _uiState = MutableStateFlow(
        MainUiState(
            selectedPalette = loadSavedPalette(),
            selectedWallpaper = loadSavedWallpaper(),
            activeServerOrigin = DiscoveryEngine.getCachedServerOrigin(application)
        )
    )
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    val apiClient = TinappleApiClient { _uiState.value.activeServerOrigin }

    init {
        viewModelScope.launch {
            // Initial server discovery
            discoverServerAndRefresh()

            // Background polling loop
            startBackgroundPolling()
        }
    }

    private fun loadSavedPalette(): ThemePalette {
        val name = prefs.getString("selected_palette_name", null)
        return DEFAULT_PALETTES.firstOrNull { it.name == name } ?: DEFAULT_PALETTES.first()
    }

    private fun loadSavedWallpaper(): WallpaperItem {
        val id = prefs.getString("selected_wallpaper_id", null)
        return BUNDLED_WALLPAPERS.firstOrNull { it.id == id } ?: BUNDLED_WALLPAPERS.first()
    }

    fun selectPalette(palette: ThemePalette) {
        prefs.edit().putString("selected_palette_name", palette.name).apply()
        _uiState.update { it.copy(selectedPalette = palette) }
    }

    fun selectWallpaper(wallpaper: WallpaperItem) {
        prefs.edit().putString("selected_wallpaper_id", wallpaper.id).apply()
        _uiState.update { it.copy(selectedWallpaper = wallpaper) }
    }

    fun clearErrorMessage() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun refreshAll(forceDiscovery: Boolean = false) {
        viewModelScope.launch {
            if (forceDiscovery) {
                _uiState.update { it.copy(isDiscovering = true, isRefreshing = true) }
                val discovered = DiscoveryEngine.discoverActiveServer(getApplication())
                _uiState.update { it.copy(activeServerOrigin = discovered, isDiscovering = false) }
            } else {
                _uiState.update { it.copy(isRefreshing = true) }
            }

            fetchCurrentState()
            _uiState.update { it.copy(isRefreshing = false) }
        }
    }

    private suspend fun discoverServerAndRefresh() {
        _uiState.update { it.copy(isDiscovering = true) }
        val origin = DiscoveryEngine.discoverActiveServer(getApplication())
        _uiState.update { it.copy(activeServerOrigin = origin, isDiscovering = false) }
        fetchCurrentState()
    }

    private suspend fun fetchCurrentState() {
        // Fetch services
        val servicesRes = apiClient.getServices()
        if (servicesRes.isSuccess) {
            val list = servicesRes.getOrNull()
            if (!list.isNullOrEmpty()) {
                _uiState.update { it.copy(services = list) }
            }
        }

        // Fetch Proton VPN status
        val protonRes = apiClient.getProtonStatus()
        if (protonRes.isSuccess) {
            protonRes.getOrNull()?.let { proton ->
                _uiState.update { it.copy(protonStatus = proton) }
            }
        }

        // Fetch System Info
        val sysRes = apiClient.getSystemInfo()
        if (sysRes.isSuccess) {
            sysRes.getOrNull()?.let { sys ->
                _uiState.update { it.copy(systemInfo = sys) }
            }
        }

        // Fetch Wallpapers
        val wallRes = apiClient.getWallpapers()
        if (wallRes.isSuccess) {
            val remoteWalls = wallRes.getOrNull()
            if (!remoteWalls.isNullOrEmpty()) {
                _uiState.update { it.copy(wallpapers = remoteWalls) }
            }
        }
    }

    private suspend fun startBackgroundPolling() {
        while (viewModelScope.isActive) {
            delay(12_000)
            if (!_uiState.value.isRefreshing && !_uiState.value.isDiscovering) {
                val servicesRes = apiClient.getServices()
                if (servicesRes.isSuccess) {
                    servicesRes.getOrNull()?.let { list ->
                        if (list.isNotEmpty()) {
                            _uiState.update { it.copy(services = list) }
                        }
                    }
                }

                val protonRes = apiClient.getProtonStatus()
                if (protonRes.isSuccess) {
                    protonRes.getOrNull()?.let { proton ->
                        _uiState.update { it.copy(protonStatus = proton) }
                    }
                }
            }
        }
    }

    fun toggleService(service: ServiceItem, start: Boolean) {
        val targetName = service.name
        val action = if (start) "start" else "stop"

        // Optimistic UI update
        _uiState.update { current ->
            val updated = current.services.map { item ->
                if (item.name == targetName) {
                    item.copy(
                        running = start,
                        activeState = if (start) "active" else "inactive"
                    )
                } else item
            }
            current.copy(
                services = updated,
                togglingServiceMap = current.togglingServiceMap + (targetName to true)
            )
        }

        viewModelScope.launch(Dispatchers.IO) {
            val res = apiClient.controlService(targetName, action)
            if (res.isFailure) {
                // Revert optimistic change
                _uiState.update { current ->
                    val reverted = current.services.map { item ->
                        if (item.name == targetName) {
                            item.copy(
                                running = !start,
                                activeState = if (!start) "active" else "inactive"
                            )
                        } else item
                    }
                    current.copy(
                        services = reverted,
                        errorMessage = "Failed to $action ${service.effectiveDisplayName}: ${res.exceptionOrNull()?.message}"
                    )
                }
            } else {
                // Delay briefly and refresh actual state
                delay(1200)
                val servicesRes = apiClient.getServices()
                if (servicesRes.isSuccess) {
                    servicesRes.getOrNull()?.let { list ->
                        if (list.isNotEmpty()) {
                            _uiState.update { it.copy(services = list) }
                        }
                    }
                }
            }

            _uiState.update { current ->
                current.copy(togglingServiceMap = current.togglingServiceMap - targetName)
            }
        }
    }

    fun toggleProton(active: Boolean) {
        // Optimistic update
        val previousState = _uiState.value.protonStatus

        _uiState.update { current ->
            current.copy(
                protonStatus = current.protonStatus.copy(
                    active = active,
                    status = if (active) "connected" else "stopped"
                ),
                isTogglingProton = true
            )
        }

        viewModelScope.launch(Dispatchers.IO) {
            val res = apiClient.toggleProtonStatus(active)
            if (res.isSuccess) {
                res.getOrNull()?.let { updated ->
                    _uiState.update { it.copy(protonStatus = updated) }
                }
            } else {
                // Revert
                _uiState.update { current ->
                    current.copy(
                        protonStatus = previousState,
                        errorMessage = "Failed to toggle Proton VPN: ${res.exceptionOrNull()?.message}"
                    )
                }
            }
            _uiState.update { it.copy(isTogglingProton = false) }
        }
    }
}
