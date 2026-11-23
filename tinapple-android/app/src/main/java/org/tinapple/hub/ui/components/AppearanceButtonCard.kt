package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import org.tinapple.hub.R
import org.tinapple.hub.data.AppearanceSettings
import org.tinapple.hub.data.ThemePalette
import org.tinapple.hub.data.WallpaperItem
import org.tinapple.hub.ui.Caption
import org.tinapple.hub.ui.ExpressiveCard
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.Radius
import org.tinapple.hub.ui.TonalPill
import org.tinapple.hub.ui.theme.Expressive

@Composable
fun AppearanceButtonCard(
    currentPalette: ThemePalette,
    selectedWallpaper: WallpaperItem?,
    settings: AppearanceSettings,
    serverOrigin: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme
    val wallpaperUrl = selectedWallpaper?.safeUrl(serverOrigin)

    ExpressiveCard(
        color = Layer.pane,
        contentColor = cs.onSurface,
        radius = Radius.card,
        onClick = onClick,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Leading Icon: Wallpaper thumbnail or clean Material Symbols Palette
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(cs.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    if (!wallpaperUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(wallpaperUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(16.dp))
                        )
                    } else {
                        Icon(
                            painter = painterResource(R.drawable.rounded_palette),
                            contentDescription = "Themes",
                            tint = cs.onPrimaryContainer,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    // Floating color badge
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(Color(currentPalette.primaryHex))
                            .border(2.dp, Color.White, CircleShape)
                            .align(Alignment.BottomEnd)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Caption("APPEARANCE & THEMES", color = cs.primary)
                    Text(
                        text = currentPalette.name,
                        style = Expressive.wide(18.sp),
                        color = cs.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${selectedWallpaper?.name ?: "Default"} · ${if (settings.useMatugen) "Matugen Dynamic" else "Preset Palette"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            TonalPill(
                text = "Customize",
                onClick = onClick,
                trailingIcon = R.drawable.rounded_arrow_forward,
                height = 38.dp,
                color = Layer.onPane
            )
        }
    }
}
