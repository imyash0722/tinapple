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
import org.tinapple.hub.data.JellyfinMediaItem
import org.tinapple.hub.ui.ExpressiveCard
import org.tinapple.hub.ui.IconBadge
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.Pill
import org.tinapple.hub.ui.Radius
import org.tinapple.hub.ui.Tint
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.utils.ClientAppLauncher

@Composable
fun JellyfinMediaWidget(
    mediaList: List<JellyfinMediaItem>,
    serverOrigin: String,
    onOpenPlezy: () -> Unit,
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
            // Header Row: Icon + Title + Open Plezy action
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconBadge(
                    icon = R.drawable.rounded_theaters,
                    tint = Tint.SECONDARY
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Jellyfin Media",
                        style = Expressive.title(17.sp),
                        fontWeight = FontWeight.Bold,
                        color = cs.onSurface
                    )
                    Text(
                        text = if (mediaList.isNotEmpty()) "${mediaList.size} items ready · Plezy Player" else "Personal Cloud Theater",
                        style = Expressive.title(12.sp),
                        color = cs.onSurfaceVariant
                    )
                }

                // Action Pill to launch Plezy
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(cs.secondaryContainer)
                        .clickable(onClick = onOpenPlezy)
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "Plezy",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = cs.onSecondaryContainer
                        )
                        Icon(
                            painter = painterResource(R.drawable.rounded_open_in_new),
                            contentDescription = "Open in Plezy",
                            tint = cs.onSecondaryContainer,
                            modifier = Modifier.size(13.dp)
                        )
                    }
                }
            }

            // Media List or Empty State
            if (mediaList.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Layer.onPane),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.rounded_theaters),
                            contentDescription = null,
                            tint = cs.onSurfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "Connecting to Jellyfin library...",
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
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    mediaList.forEach { item ->
                        MediaItemCard(
                            item = item,
                            serverOrigin = serverOrigin,
                            onClick = {
                                ClientAppLauncher.launchJellyfinInPlezy(context, item)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MediaItemCard(
    item: JellyfinMediaItem,
    serverOrigin: String,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val imageUrl = item.fullImageUrl(serverOrigin)

    Column(
        modifier = Modifier
            .width(160.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
    ) {
        // 16:9 Thumbnail Box
        Box(
            modifier = Modifier
                .width(160.dp)
                .height(98.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Layer.onPane)
        ) {
            if (!imageUrl.isNullOrBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(imageUrl)
                        .crossfade(200)
                        .build(),
                    contentDescription = item.displayTitle,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(98.dp)
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxWidth().height(98.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_theaters),
                        contentDescription = null,
                        tint = cs.onSurfaceVariant.copy(alpha = 0.4f),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // Duration Pill
            if (item.durationMinutes > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp)
                ) {
                    Pill(
                        text = "${item.durationMinutes}m",
                        container = Layer.field,
                        content = cs.onSurface
                    )
                }
            } else if (item.type.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp)
                ) {
                    Pill(
                        text = item.type,
                        container = Layer.field,
                        content = cs.onSurface
                    )
                }
            }

            // Subtle gradient
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(30.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f))
                        )
                    )
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Display Title (Series Name or Media Title)
        Text(
            text = item.displayTitle,
            style = Expressive.title(13.sp),
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            color = cs.onSurface
        )

        // Subtitle (Episode name or type)
        item.displaySubtitle?.let { sub ->
            Text(
                text = sub,
                style = Expressive.title(11.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = cs.onSurfaceVariant
            )
        }
    }
}
