package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
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
import org.tinapple.hub.data.MangaItem
import org.tinapple.hub.ui.ExpressiveCard
import org.tinapple.hub.ui.IconBadge
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.Pill
import org.tinapple.hub.ui.Radius
import org.tinapple.hub.ui.Tint
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.utils.ClientAppLauncher

@Composable
fun SuwayomiShelfWidget(
    mangaList: List<MangaItem>,
    serverOrigin: String,
    onOpenTsumiru: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme

    ExpressiveCard(
        color = Layer.pane,
        contentColor = cs.onSurface,
        modifier = modifier,
        radius = Radius.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header Row: Icon + Title + Open Tsumiru action
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconBadge(
                    icon = R.drawable.rounded_photo_library,
                    tint = Tint.PRIMARY
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Suwayomi Manga Shelf",
                        style = Expressive.title(17.sp),
                        fontWeight = FontWeight.Bold,
                        color = cs.onSurface
                    )
                    Text(
                        text = if (mangaList.isNotEmpty()) "${mangaList.size} series available · Tsumiru" else "Tachiyomi Extension Engine",
                        style = Expressive.title(12.sp),
                        color = cs.onSurfaceVariant
                    )
                }

                // Action Pill to launch Tsumiru
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(cs.primaryContainer)
                        .clickable(onClick = onOpenTsumiru)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "Tsumiru",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onPrimaryContainer
                        )
                        Icon(
                            painter = painterResource(R.drawable.rounded_open_in_new),
                            contentDescription = "Open in Tsumiru",
                            tint = cs.onPrimaryContainer,
                            modifier = Modifier.size(13.dp)
                        )
                    }
                }
            }

            // Manga List or Empty State
            if (mangaList.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Layer.onPane),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.rounded_photo_library),
                            contentDescription = null,
                            tint = cs.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "Syncing Suwayomi library...",
                            fontSize = 13.sp,
                            color = cs.onSurfaceVariant
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    mangaList.forEach { manga ->
                        MangaItemCard(
                            manga = manga,
                            serverOrigin = serverOrigin,
                            onClick = {
                                ClientAppLauncher.launchMangaInTsumiru(context, manga)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MangaItemCard(
    manga: MangaItem,
    serverOrigin: String,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val coverUrl = manga.fullThumbnailUrl(serverOrigin)

    Column(
        modifier = Modifier
            .width(112.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
    ) {
        // Thumbnail with unread count badge overlay
        Box(
            modifier = Modifier
                .width(112.dp)
                .height(152.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Layer.onPane)
        ) {
            if (!coverUrl.isNullOrBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(coverUrl)
                        .crossfade(200)
                        .build(),
                    contentDescription = manga.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(152.dp)
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxWidth().height(152.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_photo_library),
                        contentDescription = null,
                        tint = cs.onSurfaceVariant.copy(alpha = 0.4f),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // Top-right Unread Count Pill
            if (manga.unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                ) {
                    Pill(
                        text = "${manga.unreadCount}",
                        container = cs.primary,
                        content = cs.onPrimary
                    )
                }
            }

            // Bottom gradient shadow for contrast
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(36.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.75f))
                        )
                    )
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Title (2 lines)
        Text(
            text = manga.title,
            style = Expressive.title(13.sp),
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            color = cs.onSurface,
            lineHeight = 16.sp
        )

        // Source badge
        manga.source?.name?.takeIf { it.isNotBlank() }?.let { sourceName ->
            Text(
                text = sourceName,
                style = Expressive.title(11.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = cs.onSurfaceVariant
            )
        }
    }
}
