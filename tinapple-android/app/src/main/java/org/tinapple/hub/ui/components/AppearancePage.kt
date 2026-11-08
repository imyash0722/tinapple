package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.BlurOn
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Opacity
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import org.tinapple.hub.data.AppearanceSettings
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import org.tinapple.hub.ui.theme.MatugenPaletteCombo
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleBorderSubtle
import org.tinapple.hub.ui.theme.TinappleSurfaceHigh
import org.tinapple.hub.ui.theme.TinappleSurfaceHighest
import org.tinapple.hub.ui.theme.getGlassSurfaceColor
import org.tinapple.hub.ui.theme.getLiquidGlassBorder

private val WALLPAPER_CATEGORIES = listOf("ALL", "PINEAPPLE", "ATMOSPHERIC", "PIXEL ART", "AESTHETIC")

@Composable
fun AppearancePage(
    currentPalette: ThemePalette,
    wallpapers: List<WallpaperItem>,
    selectedWallpaper: WallpaperItem?,
    matugenCombos: List<MatugenPaletteCombo>,
    settings: AppearanceSettings,
    serverOrigin: String,
    onSelectPalette: (ThemePalette) -> Unit,
    onSelectWallpaper: (WallpaperItem) -> Unit,
    onToggleMatugen: (Boolean) -> Unit,
    onUpdateBlur: (Int) -> Unit,
    onUpdateDim: (Float) -> Unit,
    onUpdateGlass: (Float) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var selectedCategory by remember { mutableStateOf("ALL") }

    val filteredWallpapers = remember(wallpapers, selectedCategory) {
        if (selectedCategory == "ALL") {
            wallpapers
        } else {
            wallpapers.filter { it.category.contains(selectedCategory, ignoreCase = true) }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        // Top App Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(getGlassSurfaceColor(settings.glassTranslucency))
                    .border(1.dp, TinappleBorder, CircleShape)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "Back",
                    tint = TextPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "APPEARANCE & THEMES",
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Custom styling, Matugen & liquid glass",
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // SECTION 1: Matugen Dynamic Colors & Color Combinations
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(getGlassSurfaceColor(settings.glassTranslucency))
                .border(1.dp, getLiquidGlassBorder(MaterialTheme.colorScheme.primary), RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                                .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "Matugen Dynamic Theming",
                                color = TextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Extract Material 3 color combos from wallpaper",
                                color = TextMuted,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Switch(
                        checked = settings.useMatugen,
                        onCheckedChange = onToggleMatugen,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = MaterialTheme.colorScheme.primary,
                            uncheckedThumbColor = TextMuted,
                            uncheckedTrackColor = TinappleSurfaceHighest
                        )
                    )
                }

                // Matugen Extracted Combos for Selected Wallpaper
                if (matugenCombos.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "MATUGEN COLOR COMBINATIONS",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        matugenCombos.forEach { combo ->
                            val isSelected = currentPalette.primaryHex == combo.palette.primaryHex
                            val prim = Color(combo.palette.primaryHex)
                            val sec = Color(combo.palette.secondaryHex)

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .width(96.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.20f)
                                        else TinappleSurfaceHigh
                                    )
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) prim else TinappleBorderSubtle,
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        onSelectPalette(combo.palette)
                                    }
                                    .padding(horizontal = 8.dp, vertical = 8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.size(30.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(18.dp)
                                            .clip(CircleShape)
                                            .background(prim)
                                            .border(1.dp, Color.White.copy(alpha = 0.4f), CircleShape)
                                    )
                                    Spacer(modifier = Modifier.width(-5.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(15.dp)
                                            .clip(CircleShape)
                                            .background(sec)
                                            .border(1.dp, Color.White.copy(alpha = 0.4f), CircleShape)
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = combo.name,
                                    color = if (isSelected) prim else TextPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                                Text(
                                    text = combo.description,
                                    color = TextMuted,
                                    fontSize = 9.sp,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }

                // Manual Standard Palettes Fallback
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "MANUAL PRESET PALETTES",
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    DEFAULT_PALETTES.forEach { palette ->
                        val isSelected = palette.name == currentPalette.name
                        val prim = Color(palette.primaryHex)
                        val sec = Color(palette.secondaryHex)

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                    else TinappleSurfaceHigh
                                )
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) prim else TinappleBorderSubtle,
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .clickable {
                                    onSelectPalette(palette)
                                    if (settings.useMatugen) onToggleMatugen(false)
                                }
                                .padding(horizontal = 10.dp, vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.size(28.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clip(CircleShape)
                                        .background(prim)
                                )
                                Spacer(modifier = Modifier.width(-4.dp))
                                Box(
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clip(CircleShape)
                                        .background(sec)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = palette.name.split(" ").firstOrNull() ?: "",
                                color = if (isSelected) prim else TextSecondary,
                                fontSize = 10.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // SECTION 2: Wallpaper Background Blur & Dimming
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(getGlassSurfaceColor(settings.glassTranslucency))
                .border(1.dp, TinappleBorder, RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.BlurOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "WALLPAPER BACKGROUND BLUR",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Blur Presets: 0dp, 8dp, 16dp, 24dp
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        0 to "Off (0px)",
                        8 to "Subtle (8px)",
                        16 to "Medium (16px)",
                        24 to "Heavy (24px)"
                    ).forEach { (dpValue, label) ->
                        val isSelected = settings.blurDp == dpValue
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                    else TinappleSurfaceHigh
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else TinappleBorderSubtle,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { onUpdateBlur(dpValue) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.DarkMode,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "WALLPAPER DIMMING (SCRIM)",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Dim Presets: 0.35f, 0.52f, 0.72f
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        0.35f to "Light (35%)",
                        0.52f to "Balanced (52%)",
                        0.72f to "Deep (72%)"
                    ).forEach { (alphaVal, label) ->
                        val isSelected = (settings.dimAlpha - alphaVal) in -0.05f..0.05f
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                    else TinappleSurfaceHigh
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else TinappleBorderSubtle,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { onUpdateDim(alphaVal) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // SECTION 3: Tile Liquid Glass Translucency
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(getGlassSurfaceColor(settings.glassTranslucency))
                .border(1.dp, TinappleBorder, RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Rounded.Opacity,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "TILE LIQUID GLASS TRANSLUCENCY",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Translucency Presets: 1.0f (Solid), 0.82f (Frosted), 0.65f (Liquid), 0.48f (Crystal)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        1.0f to "Solid (100%)",
                        0.82f to "Frosted (82%)",
                        0.65f to "Liquid (65%)",
                        0.48f to "Crystal (48%)"
                    ).forEach { (transVal, label) ->
                        val isSelected = (settings.glassTranslucency - transVal) in -0.05f..0.05f
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                    else TinappleSurfaceHigh
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else TinappleBorderSubtle,
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { onUpdateGlass(transVal) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // SECTION 4: Wallpaper Gallery
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(getGlassSurfaceColor(settings.glassTranslucency))
                .border(1.dp, TinappleBorder, RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Rounded.Wallpaper,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "WALLPAPER GALLERY",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                    Text(
                        text = "${filteredWallpapers.size} Wallpapers",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Category filter chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    WALLPAPER_CATEGORIES.forEach { category ->
                        val isSelected = selectedCategory == category
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                    else TinappleSurfaceHigh
                                )
                                .border(
                                    1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else TinappleBorderSubtle,
                                    RoundedCornerShape(16.dp)
                                )
                                .clickable { selectedCategory = category }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = category,
                                color = if (isSelected) MaterialTheme.colorScheme.primary else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Wallpaper grid (2-column layout)
                val rows = filteredWallpapers.chunked(2)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    rows.forEach { rowItems ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            rowItems.forEach { wp ->
                                val isSelected = selectedWallpaper?.file.equals(wp.file, ignoreCase = true) ||
                                        selectedWallpaper?.id == wp.id ||
                                        selectedWallpaper?.name.equals(wp.name, ignoreCase = true)

                                val safeUrl = wp.safeUrl(serverOrigin)

                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(TinappleSurfaceHigh)
                                        .clickable { onSelectWallpaper(wp) }
                                        .then(
                                            if (isSelected) {
                                                Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(14.dp))
                                            } else {
                                                Modifier.border(1.dp, TinappleBorderSubtle, RoundedCornerShape(14.dp))
                                            }
                                        )
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(96.dp)
                                    ) {
                                        AsyncImage(
                                            model = ImageRequest.Builder(context)
                                                .data(safeUrl)
                                                .crossfade(true)
                                                .build(),
                                            contentDescription = wp.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(96.dp)
                                        )

                                        if (wp.defaultPrimaryHex != null) {
                                            Box(
                                                modifier = Modifier
                                                    .padding(6.dp)
                                                    .size(10.dp)
                                                    .clip(CircleShape)
                                                    .background(Color(wp.defaultPrimaryHex))
                                                    .border(1.dp, Color.White.copy(alpha = 0.5f), CircleShape)
                                                    .align(Alignment.BottomStart)
                                            )
                                        }

                                        if (isSelected) {
                                            Box(
                                                modifier = Modifier
                                                    .padding(6.dp)
                                                    .size(24.dp)
                                                    .clip(CircleShape)
                                                    .background(MaterialTheme.colorScheme.primary)
                                                    .align(Alignment.TopEnd),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Rounded.Check,
                                                    contentDescription = null,
                                                    tint = Color.Black,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                            }
                                        }
                                    }

                                    Text(
                                        text = wp.name,
                                        color = if (isSelected) MaterialTheme.colorScheme.primary else TextPrimary,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        maxLines = 1,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                    )
                                }
                            }
                            if (rowItems.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))
    }
}
