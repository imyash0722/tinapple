package org.tinapple.hub.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import org.tinapple.hub.data.DEFAULT_PALETTES
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleSurfaceHigh
import org.tinapple.hub.ui.theme.TinappleSurfaceLow

@Composable
fun AppearanceCard(
    currentPalette: ThemePalette,
    wallpapers: List<WallpaperItem>,
    selectedWallpaper: WallpaperItem?,
    serverOrigin: String,
    onSelectPalette: (ThemePalette) -> Unit,
    onSelectWallpaper: (WallpaperItem) -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(TinappleSurfaceLow)
            .border(1.dp, TinappleBorder, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isExpanded = !isExpanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(currentPalette.primaryHex).copy(alpha = 0.2f))
                            .border(1.dp, Color(currentPalette.primaryHex).copy(alpha = 0.4f), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Palette,
                            contentDescription = "Appearance",
                            tint = Color(currentPalette.primaryHex),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = "Appearance & Theme",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${currentPalette.name} • ${selectedWallpaper?.name ?: "Wallpaper Gallery"}",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown,
                    contentDescription = "Expand",
                    tint = TextMuted,
                    modifier = Modifier.size(20.dp)
                )
            }

            AnimatedVisibility(visible = isExpanded) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    Text(
                        text = "ACCENT COLOR",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Horizontal palettes
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        DEFAULT_PALETTES.forEach { palette ->
                            val isSelected = palette.name == currentPalette.name
                            val pColor = Color(palette.primaryHex)

                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(pColor)
                                    .clickable { onSelectPalette(palette) }
                                    .then(
                                        if (isSelected) {
                                            Modifier.border(2.5.dp, Color.White, CircleShape)
                                        } else {
                                            Modifier.border(1.dp, TinappleBorder, CircleShape)
                                        }
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isSelected) {
                                    Icon(
                                        imageVector = Icons.Rounded.Check,
                                        contentDescription = "Selected",
                                        tint = if (palette.primaryHex == 0xFFE4E4E7L) Color.Black else Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = "WALLPAPERS",
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Horizontal wallpapers
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        wallpapers.forEach { wp ->
                            val isSelected = selectedWallpaper?.file == wp.file || selectedWallpaper?.name == wp.name
                            val fullUrl = if (wp.url.startsWith("http")) wp.url else "${serverOrigin.trimEnd('/')}${wp.url}"

                            Column(
                                modifier = Modifier
                                    .width(110.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(TinappleSurfaceHigh)
                                    .clickable { onSelectWallpaper(wp) }
                                    .then(
                                        if (isSelected) {
                                            Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                        } else {
                                            Modifier.border(1.dp, TinappleBorder, RoundedCornerShape(12.dp))
                                        }
                                    )
                            ) {
                                Box(modifier = Modifier.height(64.dp).fillMaxWidth()) {
                                    AsyncImage(
                                        model = fullUrl,
                                        contentDescription = wp.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxWidth().height(64.dp)
                                    )
                                    if (isSelected) {
                                        Box(
                                            modifier = Modifier
                                                .padding(4.dp)
                                                .size(20.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primary)
                                                .align(Alignment.TopEnd),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Rounded.Check,
                                                contentDescription = null,
                                                tint = Color.Black,
                                                modifier = Modifier.size(12.dp)
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = wp.name,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else TextPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
