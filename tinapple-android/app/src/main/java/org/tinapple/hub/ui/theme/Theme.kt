package org.tinapple.hub.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun TinappleTheme(
    primaryColor: Color = Color(0xFF38BDF8),
    secondaryColor: Color = Color(0xFF3B82F6),
    content: @Composable () -> Unit
) {
    val darkScheme = darkColorScheme(
        primary = primaryColor,
        onPrimary = Color(0xFF003549),
        primaryContainer = primaryColor.copy(alpha = 0.2f),
        onPrimaryContainer = primaryColor,
        secondary = secondaryColor,
        onSecondary = Color(0xFF002F65),
        secondaryContainer = secondaryColor.copy(alpha = 0.2f),
        onSecondaryContainer = secondaryColor,
        background = TinappleDarkBackground,
        onBackground = TextPrimary,
        surface = TinappleSurfaceLow,
        onSurface = TextPrimary,
        surfaceVariant = TinappleSurfaceHigh,
        onSurfaceVariant = TextSecondary,
        outline = TinappleBorder,
        outlineVariant = TinappleBorderSubtle
    )

    MaterialTheme(
        colorScheme = darkScheme,
        content = content
    )
}
