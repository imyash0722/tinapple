package org.tinapple.hub.ui.theme

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

data class MatugenPaletteCombo(
    val id: String,
    val name: String,
    val description: String,
    val palette: ThemePalette
)

object MatugenEngine {

    fun generatePaletteCombos(wallpaper: WallpaperItem, bitmap: Bitmap? = null): List<MatugenPaletteCombo> {
        val baseHue: Float
        val baseSat: Float

        if (bitmap != null) {
            val extracted = extractDominantHueAndSaturation(bitmap)
            baseHue = extracted.first
            baseSat = extracted.second
        } else if (wallpaper.defaultPrimaryHex != null) {
            val colorInt = wallpaper.defaultPrimaryHex.toInt()
            val hsv = FloatArray(3)
            AndroidColor.colorToHSV(colorInt, hsv)
            baseHue = hsv[0]
            baseSat = hsv[1]
        } else {
            val fallback = getFallbackHueAndSat(wallpaper.file)
            baseHue = fallback.first
            baseSat = fallback.second
        }

        // Combo 1: Vibrant (Bold dominant accent)
        val p1 = createPaletteFromHsv(
            name = "Vibrant",
            primaryHue = baseHue,
            primarySat = min(0.92f, max(0.65f, baseSat * 1.15f)),
            primaryVal = 0.90f,
            secondaryHue = (baseHue + 28f) % 360f,
            secondarySat = min(0.80f, max(0.50f, baseSat * 0.90f)),
            secondaryVal = 0.82f
        )

        // Combo 2: Harmonious (Analogous flow)
        val p2 = createPaletteFromHsv(
            name = "Harmonious",
            primaryHue = (baseHue + 38f) % 360f,
            primarySat = min(0.85f, max(0.55f, baseSat)),
            primaryVal = 0.86f,
            secondaryHue = (baseHue + 68f) % 360f,
            secondarySat = min(0.75f, max(0.45f, baseSat * 0.85f)),
            secondaryVal = 0.80f
        )

        // Combo 3: Contrast (Striking complementary accent)
        val p3 = createPaletteFromHsv(
            name = "Contrast",
            primaryHue = (baseHue + 155f) % 360f,
            primarySat = min(0.88f, max(0.58f, baseSat * 1.05f)),
            primaryVal = 0.92f,
            secondaryHue = (baseHue + 185f) % 360f,
            secondarySat = min(0.78f, max(0.48f, baseSat * 0.85f)),
            secondaryVal = 0.84f
        )

        // Combo 4: Muted Ambient (Deep soft atmospheric)
        val p4 = createPaletteFromHsv(
            name = "Muted",
            primaryHue = (baseHue + 10f) % 360f,
            primarySat = min(0.48f, max(0.28f, baseSat * 0.65f)),
            primaryVal = 0.82f,
            secondaryHue = (baseHue + 40f) % 360f,
            secondarySat = min(0.40f, max(0.22f, baseSat * 0.55f)),
            secondaryVal = 0.76f
        )

        return listOf(
            MatugenPaletteCombo("vibrant", "Vibrant", "High-chroma dominant", p1),
            MatugenPaletteCombo("harmonious", "Harmonious", "Analogous flow", p2),
            MatugenPaletteCombo("contrast", "Contrast", "Complementary pop", p3),
            MatugenPaletteCombo("muted", "Muted", "Atmospheric ambient", p4)
        )
    }

    fun generatePaletteFromWallpaper(wallpaper: WallpaperItem): ThemePalette {
        return generatePaletteCombos(wallpaper).first().palette
    }

    private fun extractDominantHueAndSaturation(bitmap: Bitmap): Pair<Float, Float> {
        val width = bitmap.width
        val height = bitmap.height
        val sampleStep = max(1, min(width, height) / 32)

        var bestWeight = -1f
        var bestHue = 205f
        var bestSat = 0.65f

        val hsl = FloatArray(3)
        val hueBins = FloatArray(12)

        for (x in 0 until width step sampleStep) {
            for (y in 0 until height step sampleStep) {
                val pixel = bitmap.getPixel(x, y)
                AndroidColor.colorToHSV(pixel, hsl)

                val h = hsl[0]
                val s = hsl[1]
                val v = hsl[2]

                if (v in 0.16f..0.94f && s >= 0.18f) {
                    val weight = s * (1f - abs(v - 0.58f))
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

        var maxBinScore = -1f
        var dominantBin = 6
        for (i in hueBins.indices) {
            if (hueBins[i] > maxBinScore) {
                maxBinScore = hueBins[i]
                dominantBin = i
            }
        }

        val primaryHue = if (maxBinScore > 0f) (dominantBin * 30f + 15f) else bestHue
        return Pair(primaryHue, bestSat)
    }

    private fun getFallbackHueAndSat(filename: String): Pair<Float, Float> {
        val clean = filename.lowercase()
        return when {
            clean.contains("orange") || clean.contains("amber") || clean.contains("sunset") -> Pair(28f, 0.85f)
            clean.contains("pine") || clean.contains("gold") -> Pair(42f, 0.75f)
            clean.contains("blue") || clean.contains("fishbowl") || clean.contains("night") -> Pair(200f, 0.75f)
            clean.contains("ocean") || clean.contains("water") || clean.contains("cyan") -> Pair(190f, 0.80f)
            clean.contains("forest") || clean.contains("tree") || clean.contains("green") || clean.contains("palm") -> Pair(150f, 0.70f)
            clean.contains("purple") || clean.contains("pagoda") || clean.contains("amethyst") -> Pair(275f, 0.75f)
            clean.contains("sakura") || clean.contains("pink") || clean.contains("rose") -> Pair(330f, 0.75f)
            clean.contains("monochrome") || clean.contains("black") || clean.contains("frost") || clean.contains("katana") -> Pair(210f, 0.20f)
            else -> {
                val hash = abs(clean.hashCode())
                val hue = (hash % 360).toFloat()
                Pair(hue, 0.70f)
            }
        }
    }

    private fun createPaletteFromHsv(
        name: String,
        primaryHue: Float,
        primarySat: Float,
        primaryVal: Float,
        secondaryHue: Float,
        secondarySat: Float,
        secondaryVal: Float
    ): ThemePalette {
        val primaryColorInt = AndroidColor.HSVToColor(floatArrayOf(primaryHue, primarySat, primaryVal))
        val secondaryColorInt = AndroidColor.HSVToColor(floatArrayOf(secondaryHue, secondarySat, secondaryVal))

        val primaryHex = (primaryColorInt.toLong() and 0xFFFFFFFFL) or 0xFF000000L
        val secondaryHex = (secondaryColorInt.toLong() and 0xFFFFFFFFL) or 0xFF000000L

        return ThemePalette(name, primaryHex, secondaryHex)
    }
}
