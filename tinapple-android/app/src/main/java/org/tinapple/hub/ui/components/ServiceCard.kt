package org.tinapple.hub.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudDownload
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Router
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.ui.theme.StatusFailed
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.theme.StatusStopped
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleSurfaceHigh
import org.tinapple.hub.ui.theme.TinappleSurfaceHighest
import org.tinapple.hub.ui.theme.TinappleSurfaceLow

@Composable
fun ServiceCard(
    service: ServiceItem,
    portalUrl: String?,
    isToggling: Boolean,
    onToggle: (ServiceItem, Boolean) -> Unit,
    onOpenPortal: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val isRunning = service.isRunning
    val isFailed = service.isFailed

    val statusColor = when {
        isRunning -> StatusRunning
        isFailed -> StatusFailed
        else -> StatusStopped
    }

    val statusText = when {
        isToggling && isRunning -> "Stopping..."
        isToggling && !isRunning -> "Starting..."
        isRunning -> "Active"
        isFailed -> "Failed"
        else -> "Inactive"
    }

    val infiniteTransition = rememberInfiniteTransition(label = "servicePulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.45f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(TinappleSurfaceLow)
            .border(
                width = 1.dp,
                color = if (isRunning) MaterialTheme.colorScheme.primary.copy(alpha = 0.25f) else TinappleBorder,
                shape = RoundedCornerShape(16.dp)
            )
            .padding(16.dp)
    ) {
        Column {
            // Header Row: Icon + Title & Status + Switch
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Category Icon squircle
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(getCategoryContainerColor(service.category))
                        .border(
                            1.dp,
                            getCategoryAccentColor(service.category).copy(alpha = 0.35f),
                            RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    val icon = getCategoryIcon(service.category)
                    if (icon != null) {
                        Icon(
                            imageVector = icon,
                            contentDescription = service.category,
                            modifier = Modifier.size(24.dp),
                            tint = getCategoryAccentColor(service.category)
                        )
                    } else {
                        Text(
                            text = (service.effectiveDisplayName.firstOrNull() ?: 'S').uppercase(),
                            color = getCategoryAccentColor(service.category),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                // Title + Subtitle
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = service.effectiveDisplayName,
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Pulsing status dot
                        Box(contentAlignment = Alignment.Center) {
                            if (isRunning && !isToggling) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .scale(pulseScale)
                                        .clip(CircleShape)
                                        .background(statusColor.copy(alpha = 0.3f))
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(statusColor)
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = statusText,
                            color = statusColor,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Switch or progress spinner
                if (isToggling) {
                    Box(
                        modifier = Modifier.size(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                } else {
                    Switch(
                        checked = isRunning,
                        onCheckedChange = { onToggle(service, it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = MaterialTheme.colorScheme.primary,
                            uncheckedThumbColor = TextMuted,
                            uncheckedTrackColor = TinappleSurfaceHighest
                        )
                    )
                }
            }

            // Description / tagline if available
            val desc = service.tagline?.takeIf { it.isNotBlank() } ?: service.description
            if (desc.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = desc,
                    color = TextSecondary,
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
            }

            // Footer Row: Portal Link Button & Memory / Category tag
            if (portalUrl != null || service.port != null || service.memoryBytes != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (portalUrl != null) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                .border(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.35f),
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .clickable { onOpenPortal(portalUrl) }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.OpenInNew,
                                contentDescription = "Open Web UI",
                                modifier = Modifier.size(13.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Port :${service.port}",
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    } else if (service.port != null && service.port > 0) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(TinappleSurfaceHigh)
                                .padding(horizontal = 8.dp, vertical = 5.dp)
                        ) {
                            Text(
                                text = "Port :${service.port}",
                                color = TextMuted,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }

                    // Memory or category chip
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (service.memoryBytes != null && service.memoryBytes > 0) {
                            val mb = service.memoryBytes / (1024 * 1024)
                            Text(
                                text = "$mb MB",
                                color = TextMuted,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(TinappleSurfaceHigh)
                                .padding(horizontal = 7.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = service.category.uppercase(),
                                color = TextMuted,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun getCategoryIcon(category: String): ImageVector? {
    return when (category.lowercase()) {
        "media" -> Icons.Rounded.Movie
        "downloads" -> Icons.Rounded.CloudDownload
        "network" -> Icons.Rounded.Router
        "system" -> Icons.Rounded.Memory
        "core" -> Icons.Rounded.Dns
        else -> null
    }
}

private fun getCategoryAccentColor(category: String): Color {
    return when (category.lowercase()) {
        "media" -> Color(0xFFA855F7) // Purple
        "downloads" -> Color(0xFFF97316) // Orange
        "network" -> Color(0xFF06B6D4) // Cyan
        "system" -> Color(0xFF10B981) // Emerald
        "core" -> Color(0xFF38BDF8) // Sky
        else -> Color(0xFF94A3B8) // Slate
    }
}

private fun getCategoryContainerColor(category: String): Color {
    return getCategoryAccentColor(category).copy(alpha = 0.14f)
}
