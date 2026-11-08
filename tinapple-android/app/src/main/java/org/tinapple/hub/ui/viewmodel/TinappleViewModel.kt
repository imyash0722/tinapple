package org.tinapple.hub.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.tinapple.hub.data.AppearanceSettings
import org.tinapple.hub.data.BUNDLED_WALLPAPERS
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ProtonStatus
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemInfo
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.network.TinappleApiClient
import org.tinapple.hub.ui.theme.MatugenEngine

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
    val appearanceSettings: AppearanceSettings = AppearanceSettings(),
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
            appearanceSettings = loadSavedAppearanceSettings(),
            activeServerOrigin = DiscoveryEngine.getCachedServerOrigin(application)
        )
    )
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    val apiClient = TinappleApiClient { _uiState.value.activeServerOrigin }

    init {
        viewModelScope.launch {
            discoverServerAndRefresh()
            startBackgroundPolling()
        }
    }

    private fun loadSavedPalette(): ThemePalette {
        val name = prefs.getString("selected_palette_name", null)
        return DEFAULT_PALETTES.firstOrNull { it.name == name } ?: DEFAULT_PALETTES.first()
    }

    private fun loadSavedWallpaper(): WallpaperItem {
        val file = prefs.getString("selected_wallpaper_file", null)
        val id = prefs.getString("selected_wallpaper_id", null)
        return BUNDLED_WALLPAPERS.firstOrNull { it.file == file || it.id == id } ?: BUNDLED_WALLPAPERS.first()
    }

    private fun loadSavedAppearanceSettings(): AppearanceSettings {
        return AppearanceSettings(
            blurDp = prefs.getInt("appearance_blur_dp", 0),
            dimAlpha = prefs.getFloat("appearance_dim_alpha", 0.50f),
            glassTranslucency = prefs.getFloat("appearance_glass_translucency", 0.82f),
            useMatugen = prefs.getBoolean("appearance_use_matugen", true)
        )
    }

    fun updateBlurDp(blurDp: Int) {
        prefs.edit().putInt("appearance_blur_dp", blurDp).apply()
        _uiState.update { it.copy(appearanceSettings = it.appearanceSettings.copy(blurDp = blurDp)) }
    }

    fun updateDimAlpha(dimAlpha: Float) {
        prefs.edit().putFloat("appearance_dim_alpha", dimAlpha).apply()
        _uiState.update { it.copy(appearanceSettings = it.appearanceSettings.copy(dimAlpha = dimAlpha)) }
    }

    fun updateGlassTranslucency(translucency: Float) {
        prefs.edit().putFloat("appearance_glass_translucency", translucency).apply()
        _uiState.update { it.copy(appearanceSettings = it.appearanceSettings.copy(glassTranslucency = translucency)) }
    }

    fun toggleUseMatugen(enabled: Boolean) {
        prefs.edit().putBoolean("appearance_use_matugen", enabled).apply()
        _uiState.update { current ->
            val updatedSettings = current.appearanceSettings.copy(useMatugen = enabled)
            val updatedPalette = if (enabled) {
                MatugenEngine.generatePaletteFromWallpaper(current.selectedWallpaper)
            } else {
                current.selectedPalette
            }
            current.copy(appearanceSettings = updatedSettings, selectedPalette = updatedPalette)
        }
    }

    fun selectPalette(palette: ThemePalette) {
        prefs.edit().putString("selected_palette_name", palette.name).apply()
        _uiState.update { it.copy(selectedPalette = palette) }
    }

    fun selectWallpaper(wallpaper: WallpaperItem) {
        prefs.edit().putString("selected_wallpaper_id", wallpaper.id).apply()
        prefs.edit().putString("selected_wallpaper_file", wallpaper.file).apply()

        val matchingPalette = if (_uiState.value.appearanceSettings.useMatugen) {
            MatugenEngine.generatePaletteFromWallpaper(wallpaper)
        } else {
            _uiState.value.selectedPalette
        }

        if (_uiState.value.appearanceSettings.useMatugen) {
            prefs.edit().putString("selected_palette_name", matchingPalette.name).apply()
        }

        _uiState.update {
            it.copy(
                selectedWallpaper = wallpaper,
                selectedPalette = matchingPalette
            )
        }

        // Asynchronously sample bitmap from image URL for precise Matugen dynamic shades
        if (_uiState.value.appearanceSettings.useMatugen && (wallpaper.defaultPrimaryHex == null || wallpaper.url.startsWith("http"))) {
            viewModelScope.launch(Dispatchers.IO) {
                try {
                    val fullUrl = wallpaper.safeUrl(_uiState.value.activeServerOrigin)
                    val loader = ImageLoader(getApplication())
                    val request = ImageRequest.Builder(getApplication())
                        .data(fullUrl)
                        .allowHardware(false)
                        .size(64, 64)
                        .build()

                    val result = loader.execute(request)
                    if (result is SuccessResult) {
                        val bitmap = (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
                        if (bitmap != null) {
                            val refinedPalette = MatugenEngine.extractMatugenPaletteFromBitmap(bitmap, "${wallpaper.name} (Matugen)")
                            _uiState.update { it.copy(selectedPalette = refinedPalette) }
                            prefs.edit().putString("selected_palette_name", refinedPalette.name).apply()
                        }
                    }
                } catch (_: Exception) {
                    // Predefined matching palette already in place
                }
            }
        }
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
        val servicesRes = apiClient.getServices()
        if (servicesRes.isSuccess) {
            val list = servicesRes.getOrNull()
            if (!list.isNullOrEmpty()) {
                _uiState.update { it.copy(services = list) }
            }
        }

        val protonRes = apiClient.getProtonStatus()
        if (protonRes.isSuccess) {
            protonRes.getOrNull()?.let { proton ->
                _uiState.update { it.copy(protonStatus = proton) }
            }
        }

        val sysRes = apiClient.getSystemInfo()
        if (sysRes.isSuccess) {
            sysRes.getOrNull()?.let { sys ->
                _uiState.update { it.copy(systemInfo = sys) }
            }
        }

        val wallRes = apiClient.getWallpapers()
        if (wallRes.isSuccess) {
            val remoteWalls = wallRes.getOrNull()
            if (!remoteWalls.isNullOrEmpty()) {
                val imageWalls = remoteWalls.filter { wp ->
                    !wp.isVideo &&
                            !wp.file.endsWith(".mp4", ignoreCase = true) &&
                            !wp.file.endsWith(".webm", ignoreCase = true)
                }

                val combined = mutableListOf<WallpaperItem>()
                combined.addAll(BUNDLED_WALLPAPERS)
                for (rw in imageWalls) {
                    if (combined.none { it.file.equals(rw.file, ignoreCase = true) }) {
                        combined.add(rw)
                    }
                }

                _uiState.update { it.copy(wallpapers = combined) }
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
