package org.tinapple.hub.ui.theme

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

object MatugenEngine {

    fun generatePaletteFromWallpaper(wallpaper: WallpaperItem): ThemePalette {
        if (wallpaper.defaultPrimaryHex != null && wallpaper.defaultSecondaryHex != null) {
            return ThemePalette(
                name = "${wallpaper.name} Palette",
                primaryHex = wallpaper.defaultPrimaryHex,
                secondaryHex = wallpaper.defaultSecondaryHex
            )
        }

        val filename = wallpaper.file.lowercase()
        return when {
            filename.contains("orange") || filename.contains("amber") || filename.contains("sunset") ->
                ThemePalette("Sunset Amber", 0xFFF97316, 0xFFEAB308)
            filename.contains("pine") || filename.contains("gold") ->
                ThemePalette("Pineapple Gold", 0xFFE5B567, 0xFF7EC789)
            filename.contains("blue") || filename.contains("fishbowl") || filename.contains("night") ->
                ThemePalette("Deep Midnight Blue", 0xFF38BDF8, 0xFF3B82F6)
            filename.contains("ocean") || filename.contains("water") || filename.contains("cyan") ->
                ThemePalette("Cyber Cyan", 0xFF06B6D4, 0xFF3B82F6)
            filename.contains("forest") || filename.contains("tree") || filename.contains("green") || filename.contains("palm") ->
                ThemePalette("Emerald Palm", 0xFF10B981, 0xFF34D399)
            filename.contains("purple") || filename.contains("pagoda") || filename.contains("amethyst") ->
                ThemePalette("Amethyst Purple", 0xFFA855F7, 0xFFEC4899)
            filename.contains("sakura") || filename.contains("pink") || filename.contains("rose") ->
                ThemePalette("Rose Quartz", 0xFFF43F5E, 0xFFFB7185)
            filename.contains("monochrome") || filename.contains("black") || filename.contains("frost") || filename.contains("katana") ->
                ThemePalette("Monochrome Frost", 0xFFE4E4E7, 0xFFA1A1AA)
            else -> {
                val hash = abs(filename.hashCode())
                DEFAULT_PALETTES[hash % DEFAULT_PALETTES.size]
            }
        }
    }

    /**
     * Matugen Material 3 algorithmic color extraction from a sampled Bitmap.
     * Weights pixels by chroma/saturation in HSL color space.
     */
    fun extractMatugenPaletteFromBitmap(bitmap: Bitmap, label: String = "Matugen Adaptive"): ThemePalette {
        val width = bitmap.width
        val height = bitmap.height
        val sampleStep = max(1, min(width, height) / 32)

        var bestWeight = -1f
        var bestHue = 200f
        var bestSat = 0.6f

        val hsl = FloatArray(3)
        val hueBins = FloatArray(12) // 30-degree bins

        for (x in 0 until width step sampleStep) {
            for (y in 0 until height step sampleStep) {
                val pixel = bitmap.getPixel(x, y)
                AndroidColor.colorToHSV(pixel, hsl)

                val h = hsl[0] // 0..360
                val s = hsl[1] // 0..1
                val v = hsl[2] // 0..1

                // Filter out muddy, too dark, or blown out pixels
                if (v in 0.18f..0.92f && s >= 0.20f) {
                    val weight = s * (1f - abs(v - 0.60f))
                    val binIndex = (h / 30f).toInt() % 12
                    hueBins[binIndex] += weight

                    if (weight > bestWeight) {
                        bestWeight = weight
                        bestHue = h
                        bestSat = s
                    }
                }
            }
        }

        // Find highest scoring hue bin
        var maxBinScore = -1f
        var dominantBin = 6
        for (i in hueBins.indices) {
            if (hueBins[i] > maxBinScore) {
                maxBinScore = hueBins[i]
                dominantBin = i
            }
        }

        val primaryHue = if (maxBinScore > 0f) (dominantBin * 30f + 15f) else bestHue
        val secondaryHue = (primaryHue + 28f) % 360f

        val primaryColorInt = AndroidColor.HSVToColor(floatArrayOf(primaryHue, min(0.85f, max(0.55f, bestSat)), 0.88f))
        val secondaryColorInt = AndroidColor.HSVToColor(floatArrayOf(secondaryHue, min(0.75f, max(0.45f, bestSat * 0.85f)), 0.80f))

        val primaryHex = (primaryColorInt.toLong() and 0xFFFFFFFFL) or 0xFF000000L
        val secondaryHex = (secondaryColorInt.toLong() and 0xFFFFFFFFL) or 0xFF000000L

        return ThemePalette(label, primaryHex, secondaryHex)
    }
}
