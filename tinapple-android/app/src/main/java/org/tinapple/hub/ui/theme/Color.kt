package org.tinapple.hub.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val TinappleDarkBackground = Color(0xFF050814)
val TinappleSurfaceLow = Color(0xD90D1424)
val TinappleSurfaceHigh = Color(0xE6151E33)
val TinappleSurfaceHighest = Color(0xF21F2A45)
val TinappleBorder = Color(0x3394A3B8)
val TinappleBorderSubtle = Color(0x1F64748B)

val TextPrimary = Color(0xFFF1F5F9)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)

val StatusRunning = Color(0xFF10B981)
val StatusRunningBg = Color(0x2610B981)
val StatusStopped = Color(0xFFF59E0B)
val StatusStoppedBg = Color(0x26F59E0B)
val StatusFailed = Color(0xFFF43F5E)
val StatusFailedBg = Color(0x26F43F5E)
val StatusDisabled = Color(0xFF475569)
val StatusDisabledBg = Color(0x26475569)

fun getGlassSurfaceColor(alpha: Float = 0.82f): Color {
    val clamped = alpha.coerceIn(0.35f, 1.0f)
    return Color(0x0E, 0x15, 0x26, (clamped * 255).toInt())
}

fun getGlassHighSurfaceColor(alpha: Float = 0.88f): Color {
    val clamped = alpha.coerceIn(0.40f, 1.0f)
    return Color(0x16, 0x1F, 0x36, (clamped * 255).toInt())
}

fun getLiquidGlassBorder(primary: Color): Brush {
    return Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.22f),
            primary.copy(alpha = 0.35f),
            Color.Transparent,
            primary.copy(alpha = 0.15f)
        )
    )
}
