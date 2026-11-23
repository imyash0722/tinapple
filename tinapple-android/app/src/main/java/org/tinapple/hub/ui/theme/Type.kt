package org.tinapple.hub.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import org.tinapple.hub.R

private val families = HashMap<String, FontFamily>()

/** The Google Sans Flex face at one point of its axes; each point is one Typeface, built once. */
fun flex(weight: Int, width: Float = 100f, round: Float = 100f, slant: Float = 0f): FontFamily =
    synchronized(families) {
        families.getOrPut("$weight/$width/$round/$slant") {
            try {
                FontFamily(
                    Font(
                        R.font.google_sans_flex,
                        weight = FontWeight(weight.coerceIn(1, 1000)),
                        variationSettings = FontVariation.Settings(
                            FontVariation.weight(weight),
                            FontVariation.width(width),
                            FontVariation.Setting("ROND", round),
                            FontVariation.slant(slant),
                        ),
                    ),
                )
            } catch (_: Exception) {
                FontFamily.Default
            }
        }
    }

/** The expressive styles the screens draw with, based on ii-tools. */
object Expressive {
    /** The one number of a screen: tall, condensed, rounded. */
    fun digits(size: TextUnit) = TextStyle(
        fontFamily = flex(760, width = 40f),
        fontSize = size,
        lineHeight = size * 0.96f,
        letterSpacing = (-0.02).em,
        fontFeatureSettings = "tnum",
        lineHeightStyle = tight,
    )

    /** A number that is not the hero (units, times beside a bar). */
    fun digitsSoft(size: TextUnit) = TextStyle(
        fontFamily = flex(560, width = 30f),
        fontSize = size,
        lineHeight = size * 1.05f,
        fontFeatureSettings = "tnum",
    )

    /** Names: the Server, a service, a section. */
    fun wide(size: TextUnit) = TextStyle(
        fontFamily = flex(720, width = 125f),
        fontSize = size,
        lineHeight = size * 1.18f,
        letterSpacing = (-0.01).em,
    )

    /** The widest voice: page titles and the hero's name. */
    fun xwide(size: TextUnit) = TextStyle(
        fontFamily = flex(840, width = 151f),
        fontSize = size,
        lineHeight = size * 1.1f,
        letterSpacing = (-0.02).em,
    )

    /** Card titles in the rounded title face. */
    fun title(size: TextUnit) = TextStyle(
        fontFamily = flex(650),
        fontSize = size,
        lineHeight = size * 1.3f
    )

    /** Live state ("Running", "Exit Node Active", "100% Sync"): slanted, not rounded. */
    fun live(size: TextUnit) = TextStyle(
        fontFamily = flex(620, round = 0f, slant = -10f),
        fontSize = size,
        lineHeight = size * 1.36f,
    )

    /** A small bold caption over a value, in capitals. */
    val caption = TextStyle(
        fontFamily = flex(700, width = 112f),
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.05.em,
    )

    private val tight = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.Both)
}
