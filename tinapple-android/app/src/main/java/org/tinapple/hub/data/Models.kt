package org.tinapple.hub.data

import android.net.Uri
import com.google.gson.annotations.SerializedName

data class ServiceItem(
    @SerializedName("id") val id: String? = null,
    @SerializedName("name") val name: String = "",
    @SerializedName("displayName") val displayName: String? = null,
    @SerializedName("tagline") val tagline: String? = null,
    @SerializedName("description") val description: String = "",
    @SerializedName("activeState") val activeState: String = "inactive",
    @SerializedName("subState") val subState: String = "dead",
    @SerializedName("category") val category: String = "system",
    @SerializedName("port") val port: Int? = null,
    @SerializedName("installed") val installed: Boolean = true,
    @SerializedName("running") val running: Boolean = false,
    @SerializedName("icon") val icon: String? = null,
    @SerializedName("accentColor") val accentColor: String? = null,
    @SerializedName("memoryBytes") val memoryBytes: Long? = null
) {
    val effectiveDisplayName: String
        get() = displayName?.takeIf { it.isNotBlank() } ?: name.capitalizeFirst()

    val displayPort: Int?
        get() {
            val clean = name.lowercase().removeSuffix(".service").substringBefore("@")
            val cleanId = id?.lowercase() ?: ""
            return if (clean == "ombi" || cleanId == "ombi") 5055 else port
        }

    val isRunning: Boolean
        get() = running || activeState == "active"

    val isFailed: Boolean
        get() = activeState == "failed"
}

data class ServicesResponse(
    @SerializedName("services") val services: List<ServiceItem>? = null
)

data class ProtonStatus(
    @SerializedName("active") val active: Boolean = false,
    @SerializedName("status") val status: String = "stopped",
    @SerializedName("ip") val ip: String? = null,
    @SerializedName("country") val country: String? = null,
    @SerializedName("server") val server: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("configured") val configured: Boolean = false,
    @SerializedName("error") val error: String? = null
)

data class SystemInfo(
    @SerializedName("hostname") val hostname: String = "tinapple-server",
    @SerializedName("kernel") val kernel: String? = null,
    @SerializedName("uptime") val uptime: Long = 0,
    @SerializedName("uptime_seconds") val uptimeSeconds: Long? = null,
    @SerializedName("installed") val installed: Boolean = true,
    @SerializedName("session") val session: String? = null
) {
    val totalUptimeSeconds: Long
        get() = uptimeSeconds ?: uptime
}

data class TelemetryCpu(
    @SerializedName("cores") val cores: Int = 1,
    @SerializedName("usage_percent") val usagePercent: Double = 0.0,
    @SerializedName("model_name") val modelName: String? = null
) {
    val usageFormatted: String
        get() = "%.1f%%".format(usagePercent)
}

data class TelemetryMemory(
    @SerializedName("total_bytes") val totalBytes: Long = 0,
    @SerializedName("used_bytes") val usedBytes: Long = 0,
    @SerializedName("used_percent") val usedPercent: Double = 0.0,
    @SerializedName("available_bytes") val availableBytes: Long = 0
) {
    val usedGb: Double
        get() = usedBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
    val totalGb: Double
        get() = totalBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
    val memoryFormatted: String
        get() = "%.1f / %.1f GB".format(usedGb, totalGb)
}

data class TelemetryDisk(
    @SerializedName("total_bytes") val totalBytes: Long = 0,
    @SerializedName("free_bytes") val freeBytes: Long = 0,
    @SerializedName("used_percent") val usedPercent: Double = 0.0
) {
    val freeGb: Double
        get() = freeBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
    val totalGb: Double
        get() = totalBytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
    val freeFormatted: String
        get() = "%.1f GB".format(freeGb)
}

data class TelemetryThermal(
    @SerializedName("max_temp_c") val maxTempC: Double = 0.0,
    @SerializedName("power_profile") val powerProfile: String? = null
) {
    val tempFormatted: String
        get() = "${maxTempC.toInt()}°C"
}

data class TelemetryBattery(
    @SerializedName("percent") val percent: Int = 0,
    @SerializedName("charging") val charging: Boolean = false,
    @SerializedName("present") val present: Boolean = false
)

data class SystemTelemetry(
    @SerializedName("cpu") val cpu: TelemetryCpu = TelemetryCpu(),
    @SerializedName("memory") val memory: TelemetryMemory = TelemetryMemory(),
    @SerializedName("disk") val disk: TelemetryDisk = TelemetryDisk(),
    @SerializedName("thermal") val thermal: TelemetryThermal = TelemetryThermal(),
    @SerializedName("battery") val battery: TelemetryBattery = TelemetryBattery(),
    @SerializedName("timestamp") val timestamp: Long = 0
)

data class NowPlayingTrack(
    @SerializedName("id") val id: String = "",
    @SerializedName("title") val title: String = "",
    @SerializedName("artist") val artist: String = "",
    @SerializedName("album") val album: String? = null,
    @SerializedName("coverUrl") val coverUrl: String? = null,
    @SerializedName("duration") val duration: Int = 0,
    @SerializedName("minutesAgo") val minutesAgo: Int = 0,
    @SerializedName("username") val username: String? = null
) {
    val durationFormatted: String
        get() {
            if (duration <= 0) return "0:00"
            val m = duration / 60
            val s = duration % 60
            return "$m:${if (s < 10) "0$s" else "$s"}"
        }
}

data class MusicNowPlayingState(
    @SerializedName("active") val active: Boolean = false,
    @SerializedName("track") val track: NowPlayingTrack? = null
)

data class SectionWidgetConfig(
    val id: String,
    val title: String,
    val subtitle: String,
    val iconRes: Int,
    val enabled: Boolean = true
)

val DEFAULT_HOME_WIDGETS = listOf(
    SectionWidgetConfig("hero", "Server Overview", "Wallpaper hero, MagicDNS host, and theme button", org.tinapple.hub.R.drawable.rounded_dns, true),
    SectionWidgetConfig("now_playing", "Navidrome Music Player", "Live playback from server with Vibrdrome quick launch", org.tinapple.hub.R.drawable.rounded_music_note, true),
    SectionWidgetConfig("telemetry", "System Load Gauges", "4-column CPU, RAM, Disk, and Thermal gauges", org.tinapple.hub.R.drawable.rounded_speed, true),
    SectionWidgetConfig("client_apps", "Client Apps Deck", "Syncthing, Bitwarden, Tsumiru, Plezy, and Vibrdrome", org.tinapple.hub.R.drawable.rounded_apps, true),
    SectionWidgetConfig("controls", "Server Quick Controls", "Proton VPN Exit Node, MagicDNS peer, and Resumer", org.tinapple.hub.R.drawable.rounded_vpn_lock, true),
    SectionWidgetConfig("services", "Homelab Daemons List", "Service cards with brand icons and systemd toggles", org.tinapple.hub.R.drawable.rounded_terminal, true)
)

data class WallpaperItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("file") val file: String = "",
    @SerializedName("url") val url: String = "",
    @SerializedName("category") val category: String = "General",
    @SerializedName("isVideo") val isVideo: Boolean = false,
    val defaultPrimaryHex: Long? = null,
    val defaultSecondaryHex: Long? = null
) {
    fun rawGithubUrl(): String {
        val cleanFile = file.ifBlank { url.substringAfterLast("/") }
        return "https://raw.githubusercontent.com/imyash0722/wallpapers/master/${Uri.encode(cleanFile)}"
    }

    fun fullDownloadUrl(serverOrigin: String): String {
        return if (serverOrigin.isNotBlank() && !serverOrigin.contains("localhost")) {
            safeUrl(serverOrigin)
        } else {
            rawGithubUrl()
        }
    }

    fun safeUrl(serverOrigin: String): String {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url
        }
        val cleanOrigin = serverOrigin.trimEnd('/')
        val rawPath = when {
            url.isNotBlank() -> if (url.startsWith("/")) url else "/$url"
            file.isNotBlank() -> "/wallpapers/$file"
            else -> "/wallpapers/blue-night-fishbowl-room.jpg"
        }
        val encodedPath = rawPath.split("/").joinToString("/") { segment ->
            Uri.encode(segment)
        }
        return if (cleanOrigin.isNotBlank()) "$cleanOrigin$encodedPath" else rawGithubUrl()
    }
}

data class ThemePalette(
    val name: String,
    val primaryHex: Long,
    val secondaryHex: Long
)

data class AppearanceSettings(
    val blurDp: Int = 0,
    val dimAlpha: Float = 0.50f,
    val glassTranslucency: Float = 0.82f,
    val useMatugen: Boolean = true
)

val DEFAULT_PALETTES = listOf(
    ThemePalette("Deep Midnight Blue", 0xFF38BDF8, 0xFF3B82F6),
    ThemePalette("Pineapple Gold", 0xFFE5B567, 0xFF7EC789),
    ThemePalette("Sapphire Electric", 0xFF60A5FA, 0xFF2563EB),
    ThemePalette("Cyber Cyan", 0xFF06B6D4, 0xFF3B82F6),
    ThemePalette("Emerald Palm", 0xFF10B981, 0xFF34D399),
    ThemePalette("Amethyst Purple", 0xFFA855F7, 0xFFEC4899),
    ThemePalette("Sunset Amber", 0xFFF97316, 0xFFEAB308),
    ThemePalette("Rose Quartz", 0xFFF43F5E, 0xFFFB7185),
    ThemePalette("Ice & Indigo", 0xFF7DD3FC, 0xFF6366F1),
    ThemePalette("Monochrome Frost", 0xFFE4E4E7, 0xFFA1A1AA)
)

val BUNDLED_WALLPAPERS = listOf(
    // Pineapple
    WallpaperItem("wp-1", "Pineapple Sunset", "tinapple-orange-wallpaper.png", "/wallpapers/tinapple-orange-wallpaper.png", "Pineapple", false, 0xFFF59E0B, 0xFF7EC789),
    WallpaperItem("wp-2", "Golden Pineapple", "Aesthetic-Pineapple-Wallpaper-HD.jpg", "/wallpapers/Aesthetic-Pineapple-Wallpaper-HD.jpg", "Pineapple", false, 0xFFE5B567, 0xFF10B981),
    WallpaperItem("wp-3", "Pineapple Aesthetic", "Aesthetic-Pineapple-Wallpaper-1920x1080-1.jpg", "/wallpapers/Aesthetic-Pineapple-Wallpaper-1920x1080-1.jpg", "Pineapple", false, 0xFFF59E0B, 0xFF10B981),
    WallpaperItem("wp-4", "Pineapple Computer", "Aesthetic-Pineapple-Wallpaper-Computer.png", "/wallpapers/Aesthetic-Pineapple-Wallpaper-Computer.png", "Pineapple", false, 0xFFE5B567, 0xFF38BDF8),
    WallpaperItem("wp-5", "Obsidian Minimal", "tinapple-cinematic-monochrome.png", "/wallpapers/tinapple-cinematic-monochrome.png", "Pineapple", false, 0xFFE4E4E7, 0xFF71717A),

    // Atmospheric & Scenery
    WallpaperItem("wp-6", "Blue Night Fishbowl", "blue-night-fishbowl-room.jpg", "/wallpapers/blue-night-fishbowl-room.jpg", "Atmospheric", false, 0xFF38BDF8, 0xFF6366F1),
    WallpaperItem("wp-7", "Ocean Torii Gate", "ocean-torii-gate.png", "/wallpapers/ocean-torii-gate.png", "Atmospheric", false, 0xFF0EA5E9, 0xFF3B82F6),
    WallpaperItem("wp-8", "Floating Pagoda", "floating-pagoda-city.jpg", "/wallpapers/floating-pagoda-city.jpg", "Atmospheric", false, 0xFF6366F1, 0xFF06B6D4),
    WallpaperItem("wp-9", "Rainy Mountain Town", "rainy-mountain-town-crossing.jpg", "/wallpapers/rainy-mountain-town-crossing.jpg", "Atmospheric", false, 0xFF38BDF8, 0xFF14B8A6),
    WallpaperItem("wp-10", "Sakura Torii Shrine", "wallhaven-9mjoy1.png", "/wallpapers/wallhaven-9mjoy1.png", "Atmospheric", false, 0xFFF472B6, 0xFF10B981),
    WallpaperItem("wp-11", "Nachi Falls Pagoda", "wallhaven-w5x99p.jpg", "/wallpapers/wallhaven-w5x99p.jpg", "Atmospheric", false, 0xFFF97316, 0xFF84CC16),
    WallpaperItem("wp-12", "Sakura Railway Train", "wallhaven-yqg6r7.jpg", "/wallpapers/wallhaven-yqg6r7.jpg", "Atmospheric", false, 0xFFEC4899, 0xFF84CC16),
    WallpaperItem("wp-13", "Rainy Ryokan", "rainy-japanese-ryokan.jpg", "/wallpapers/rainy-japanese-ryokan.jpg", "Atmospheric", false, 0xFF38BDF8, 0xFF64748B),
    WallpaperItem("wp-14", "Red Torii Autumn", "red-autumn-torii-gate.jpeg", "/wallpapers/red-autumn-torii-gate.jpeg", "Atmospheric", false, 0xFFEF4444, 0xFFF59E0B),
    WallpaperItem("wp-15", "Purple Night Bloom", "purple-night-blooming-tree.jpg", "/wallpapers/purple-night-blooming-tree.jpg", "Atmospheric", false, 0xFFA855F7, 0xFF6366F1),
    WallpaperItem("wp-16", "Moonlit Warrior", "moonlit-pillars-warrior.png", "/wallpapers/moonlit-pillars-warrior.png", "Atmospheric", false, 0xFF06B6D4, 0xFF3B82F6),
    WallpaperItem("wp-17", "Summer Clouds Meadow", "summer-clouds-meadow.png", "/wallpapers/summer-clouds-meadow.png", "Atmospheric", false, 0xFF10B981, 0xFF38BDF8),
    WallpaperItem("wp-18", "Twilight Forest", "twilight-forest-path.jpg", "/wallpapers/twilight-forest-path.jpg", "Atmospheric", false, 0xFF10B981, 0xFF6366F1),
    WallpaperItem("wp-19", "Aurora Borealis", "vibrant-aurora-borealis.png", "/wallpapers/vibrant-aurora-borealis.png", "Atmospheric", false, 0xFF10B981, 0xFF8B5CF6),
    WallpaperItem("wp-20", "Sword Under Sakura", "sword-under-cherry-blossom.png", "/wallpapers/sword-under-cherry-blossom.png", "Atmospheric", false, 0xFFEC4899, 0xFF8B5CF6),
    WallpaperItem("wp-21", "White Tree Island", "floating-island-white-tree.png", "/wallpapers/floating-island-white-tree.png", "Atmospheric", false, 0xFF06B6D4, 0xFF10B981),

    // Anime & Aesthetic
    WallpaperItem("wp-22", "Anime Sunset Streetlamp", "anime-sunset-streetlamp.jpg", "/wallpapers/anime-sunset-streetlamp.jpg", "Anime & Aesthetic", false, 0xFFF97316, 0xFF8B5CF6),
    WallpaperItem("wp-23", "Ryoku Samurai Sunset", "ryoku-samurai-sunset.webp", "/wallpapers/ryoku-samurai-sunset.webp", "Anime & Aesthetic", false, 0xFFF59E0B, 0xFFEF4444),
    WallpaperItem("wp-24", "Tokyo Twilight City", "wallhaven-1qkrww.png", "/wallpapers/wallhaven-1qkrww.png", "Anime & Aesthetic", false, 0xFF38BDF8, 0xFFA855F7),
    WallpaperItem("wp-25", "Cyber Girl Rain", "wallhaven-6d22qq.png", "/wallpapers/wallhaven-6d22qq.png", "Anime & Aesthetic", false, 0xFF06B6D4, 0xFFEC4899),
    WallpaperItem("wp-26", "Lofi Evening Street", "wallhaven-yqgk6g.png", "/wallpapers/wallhaven-yqgk6g.png", "Anime & Aesthetic", false, 0xFFF59E0B, 0xFF6366F1),
    WallpaperItem("wp-27", "Neon Horizon Alley", "wallhaven-x1232v.png", "/wallpapers/wallhaven-x1232v.png", "Anime & Aesthetic", false, 0xFF8B5CF6, 0xFF06B6D4),
    WallpaperItem("wp-28", "Aesthetic Solitude", "wallhaven-2y89my.jpg", "/wallpapers/wallhaven-2y89my.jpg", "Anime & Aesthetic", false, 0xFF38BDF8, 0xFFEC4899),
    WallpaperItem("wp-29", "Cozy Coffee Cafe", "wallhaven-39mgyy.jpg", "/wallpapers/wallhaven-39mgyy.jpg", "Anime & Aesthetic", false, 0xFFD97706, 0xFF92400E),
    WallpaperItem("wp-30", "Cherry Blossom Shrine", "wallhaven-d8kgz3.jpg", "/wallpapers/wallhaven-d8kgz3.jpg", "Anime & Aesthetic", false, 0xFFEC4899, 0xFFF472B6),

    // Pixel Art
    WallpaperItem("wp-31", "Pixel Retro Forest", "pixel-art-retro-forest.png", "/wallpapers/pixel-art-retro-forest.png", "Pixel Art", false, 0xFFF43F5E, 0xFFA855F7),
    WallpaperItem("wp-32", "Pixel Canyon Waterfalls", "pixel-art-canyon-waterfalls.jpg", "/wallpapers/pixel-art-canyon-waterfalls.jpg", "Pixel Art", false, 0xFF06B6D4, 0xFF10B981),
    WallpaperItem("wp-33", "Pixel Moonlight Castle", "pixel-art-moonlit-castle.jpg", "/wallpapers/pixel-art-moonlit-castle.jpg", "Pixel Art", false, 0xFF6366F1, 0xFF38BDF8),
    WallpaperItem("wp-34", "Pixel River Valley", "pixel-art-river-valley.jpg", "/wallpapers/pixel-art-river-valley.jpg", "Pixel Art", false, 0xFF10B981, 0xFF06B6D4),
    WallpaperItem("wp-35", "Pixel Sunset Cityscape", "pixel-art-sunset-cityscape.jpg", "/wallpapers/pixel-art-sunset-cityscape.jpg", "Pixel Art", false, 0xFFF97316, 0xFFA855F7),
    WallpaperItem("wp-36", "Pixel Stargazing", "stargazing-pixel-art.jpg", "/wallpapers/stargazing-pixel-art.jpg", "Pixel Art", false, 0xFF38BDF8, 0xFF6366F1),

    // Sci-Fi & Tech
    WallpaperItem("wp-37", "Battlestation 2003", "cornelius-dammrich-2003-battlestation.jpg", "/wallpapers/cornelius-dammrich-2003-battlestation.jpg", "Sci-Fi & Tech", false, 0xFF10B981, 0xFFF59E0B),
    WallpaperItem("wp-38", "Mechanical Switches", "mechanical-keyboard-switches.jpg", "/wallpapers/mechanical-keyboard-switches.jpg", "Sci-Fi & Tech", false, 0xFF38BDF8, 0xFF64748B),
    WallpaperItem("wp-39", "Saturn Rings", "saturn-rings.jpg", "/wallpapers/saturn-rings.jpg", "Sci-Fi & Tech", false, 0xFFD97706, 0xFF1E293B),
    WallpaperItem("wp-40", "Colorful Planets", "colorful-planets.jpg", "/wallpapers/colorful-planets.jpg", "Sci-Fi & Tech", false, 0xFFA855F7, 0xFF06B6D4),
    WallpaperItem("wp-41", "Cyber Gateway", "wallhaven-1p7893.jpg", "/wallpapers/wallhaven-1p7893.jpg", "Sci-Fi & Tech", false, 0xFF06B6D4, 0xFF8B5CF6),
    WallpaperItem("wp-42", "Neon Grid Network", "wallhaven-5y3vx7.png", "/wallpapers/wallhaven-5y3vx7.png", "Sci-Fi & Tech", false, 0xFF8B5CF6, 0xFFEC4899)
)

private fun String.capitalizeFirst(): String =
    replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
