package org.tinapple.hub.data

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

data class WallpaperItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("file") val file: String = "",
    @SerializedName("url") val url: String = "",
    @SerializedName("category") val category: String = "General"
)

data class ThemePalette(
    val name: String,
    val primaryHex: Long,
    val secondaryHex: Long
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
    WallpaperItem("1", "Pineapple Sunset", "tinapple-orange-wallpaper.png", "/wallpapers/tinapple-orange-wallpaper.png", "Pineapple"),
    WallpaperItem("2", "Golden Pineapple", "Aesthetic-Pineapple-Wallpaper-HD.jpg", "/wallpapers/Aesthetic-Pineapple-Wallpaper-HD.jpg", "Pineapple"),
    WallpaperItem("3", "Blue Night Fishbowl", "blue-night-fishbowl-room.jpg", "/wallpapers/blue-night-fishbowl-room.jpg", "Atmospheric"),
    WallpaperItem("4", "Ocean Torii Gate", "ocean-torii-gate.png", "/wallpapers/ocean-torii-gate.png", "Atmospheric"),
    WallpaperItem("5", "Pixel Retro Forest", "pixel-art-retro-forest.png", "/wallpapers/pixel-art-retro-forest.png", "Pixel Art"),
    WallpaperItem("6", "Floating Pagoda", "floating-pagoda-city.jpg", "/wallpapers/floating-pagoda-city.jpg", "Atmospheric"),
    WallpaperItem("7", "Rainy Mountain Town", "rainy-mountain-town-crossing.jpg", "/wallpapers/rainy-mountain-town-crossing.jpg", "Atmospheric"),
    WallpaperItem("8", "Obsidian Minimal", "tinapple-cinematic-monochrome.png", "/wallpapers/tinapple-cinematic-monochrome.png", "Aesthetic")
)

private fun String.capitalizeFirst(): String =
    replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
