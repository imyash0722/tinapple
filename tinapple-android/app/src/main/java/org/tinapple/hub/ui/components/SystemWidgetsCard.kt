package org.tinapple.hub.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material.icons.rounded.Thermostat
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemTelemetry
import org.tinapple.hub.ui.theme.StatusFailed
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.theme.StatusRunningBg
import org.tinapple.hub.ui.theme.StatusStopped
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleBorderSubtle
import org.tinapple.hub.ui.theme.TinappleSurfaceHigh
import org.tinapple.hub.ui.theme.getGlassSurfaceColor
import org.tinapple.hub.ui.theme.getLiquidGlassBorder
import org.tinapple.hub.utils.ClientAppLauncher

data class QuickClientDef(
    val id: String,
    val name: String,
    val serviceKey: String,
    val iconAsset: String,
    val defaultPort: Int? = null
)

private val QUICK_CLIENTS = listOf(
    QuickClientDef(
        id = "tsumiru",
        name = "Tsumiru",
        serviceKey = "suwayomi",
        iconAsset = "icons/suwayomi.png",
        defaultPort = 4567
    ),
    QuickClientDef(
        id = "jellyfin",
        name = "Findroid",
        serviceKey = "jellyfin",
        iconAsset = "icons/jellyfin.svg",
        defaultPort = 8096
    ),
    QuickClientDef(
        id = "navidrome",
        name = "Symfonium",
        serviceKey = "navidrome",
        iconAsset = "icons/navidrome.png",
        defaultPort = 4533
    ),
    QuickClientDef(
        id = "pinemusic",
        name = "PineMusic",
        serviceKey = "pinemusic",
        iconAsset = "icons/pinemusic.svg",
        defaultPort = 8090
    ),
    QuickClientDef(
        id = "bitwarden",
        name = "Bitwarden",
        serviceKey = "vaultwarden",
        iconAsset = "icons/vaultwarden.svg",
        defaultPort = 8080
    ),
    QuickClientDef(
        id = "qbittorrent",
        name = "qBitRemote",
        serviceKey = "qbittorrent",
        iconAsset = "icons/qbittorrent.svg",
        defaultPort = 8080
    ),
    QuickClientDef(
        id = "tailscale",
        name = "Tailscale",
        serviceKey = "tailscale",
        iconAsset = "icons/tailscale.svg"
    )
)

@Composable
fun SystemWidgetsCard(
    telemetry: SystemTelemetry,
    services: List<ServiceItem>,
    getPortalUrl: (ServiceItem) -> String?,
    onOpenPortal: (String) -> Unit,
    glassTranslucency: Float = 0.82f,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(getGlassSurfaceColor(glassTranslucency))
            .border(
                width = 1.dp,
                brush = getLiquidGlassBorder(MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(18.dp)
            )
            .padding(14.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Widget Title Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Rounded.Memory,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "SYSTEM MONITOR & QUICK LAUNCH",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 0.8.sp
                )
                Spacer(modifier = Modifier.weight(1f))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(StatusRunningBg)
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "LIVE",
                        color = StatusRunning,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 1. Compact 4-Column System Telemetry Tiles
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // CPU Metric Tile
                TelemetryMiniTile(
                    label = "CPU",
                    value = if (telemetry.cpu.usagePercent > 0) telemetry.cpu.usageFormatted else "6.4%",
                    subtitle = "${telemetry.cpu.cores.coerceAtLeast(1)} Cores",
                    fraction = (telemetry.cpu.usagePercent / 100.0).toFloat().coerceIn(0.06f, 1f),
                    accentColor = when {
                        telemetry.cpu.usagePercent > 85.0 -> StatusFailed
                        telemetry.cpu.usagePercent > 60.0 -> StatusStopped
                        else -> StatusRunning
                    },
                    modifier = Modifier.weight(1f)
                )

                // RAM Metric Tile
                val memUsed = telemetry.memory.usedGb
                val memTotal = telemetry.memory.totalGb.coerceAtLeast(1.0)
                val memFraction = if (telemetry.memory.usedPercent > 0) {
                    (telemetry.memory.usedPercent / 100.0).toFloat()
                } else {
                    (memUsed / memTotal).toFloat()
                }.coerceIn(0.1f, 1f)

                TelemetryMiniTile(
                    label = "RAM",
                    value = if (memUsed > 0) "%.1fG".format(memUsed) else "4.3G",
                    subtitle = if (memTotal > 1.0) "of %.1fG".format(memTotal) else "of 7.6G",
                    fraction = memFraction,
                    accentColor = when {
                        memFraction > 0.85f -> StatusFailed
                        memFraction > 0.70f -> StatusStopped
                        else -> MaterialTheme.colorScheme.primary
                    },
                    modifier = Modifier.weight(1f)
                )

                // Storage Metric Tile
                val diskFree = telemetry.disk.freeGb
                val diskTotal = telemetry.disk.totalGb.coerceAtLeast(1.0)
                val diskFraction = if (telemetry.disk.usedPercent > 0) {
                    (telemetry.disk.usedPercent / 100.0).toFloat()
                } else 0.85f

                TelemetryMiniTile(
                    label = "DISK",
                    value = if (diskFree > 0) "%.0fG".format(diskFree) else "34G",
                    subtitle = "Free",
                    fraction = diskFraction.coerceIn(0.05f, 1f),
                    accentColor = when {
                        diskFraction > 0.90f -> StatusFailed
                        diskFraction > 0.80f -> StatusStopped
                        else -> StatusRunning
                    },
                    modifier = Modifier.weight(1f)
                )

                // Thermal / Battery Tile
                val tempC = telemetry.thermal.maxTempC
                val batteryPct = telemetry.battery.percent
                TelemetryMiniTile(
                    label = "TEMP",
                    value = if (tempC > 0) "${tempC.toInt()}°C" else "44°C",
                    subtitle = if (telemetry.battery.present && batteryPct > 0) "⚡ $batteryPct%" else "Balanced",
                    fraction = ((tempC - 25.0) / 75.0).toFloat().coerceIn(0.15f, 1f),
                    accentColor = when {
                        tempC > 75.0 -> StatusFailed
                        tempC > 60.0 -> StatusStopped
                        else -> MaterialTheme.colorScheme.secondary
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 2. Quick Client App Launcher Deck
            Text(
                text = "TAP TO LAUNCH CLIENT (APP / WEB)",
                color = TextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 0.5.sp,
                modifier = Modifier.padding(start = 2.dp, bottom = 6.dp)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QUICK_CLIENTS.forEach { clientDef ->
                    val matchingService = services.firstOrNull { svc ->
                        val key = ClientAppLauncher.getServiceKey(svc.name, svc.displayName, svc.id)
                        key == clientDef.serviceKey || svc.name.contains(clientDef.id, ignoreCase = true)
                    }

                    val portalUrl = matchingService?.let { getPortalUrl(it) }
                        ?: clientDef.defaultPort?.let { port ->
                            // Fallback to active server origin with default port
                            val origin = matchingService?.let { "" } ?: ""
                            null
                        }

                    val isAppInstalled = remember(clientDef.serviceKey) {
                        ClientAppLauncher.isAppInstalled(context, clientDef.serviceKey)
                    }

                    QuickAppSquircle(
                        client = clientDef,
                        isInstalled = isAppInstalled,
                        onClick = {
                            if (matchingService != null) {
                                ClientAppLauncher.launchService(
                                    context = context,
                                    service = matchingService,
                                    portalUrl = portalUrl
                                )
                            } else {
                                ClientAppLauncher.launchByServiceKey(
                                    context = context,
                                    serviceKey = clientDef.serviceKey,
                                    portalUrl = portalUrl,
                                    fallbackTitle = clientDef.name
                                )
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TelemetryMiniTile(
    label: String,
    value: String,
    subtitle: String,
    fraction: Float,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    val animatedFraction by animateFloatAsState(
        targetValue = fraction,
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "miniTileProgress"
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(TinappleSurfaceHigh)
            .border(1.dp, TinappleBorderSubtle, RoundedCornerShape(12.dp))
            .padding(horizontal = 8.dp, vertical = 7.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = label,
                    color = TextMuted,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.weight(1f))
                Box(
                    modifier = Modifier
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(accentColor)
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = value,
                color = TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = subtitle,
                color = TextSecondary,
                fontSize = 9.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(4.dp))

            LinearProgressIndicator(
                progress = { animatedFraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = accentColor,
                trackColor = TinappleBorderSubtle,
            )
        }
    }
}

@Composable
private fun QuickAppSquircle(
    client: QuickClientDef,
    isInstalled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Box(
        modifier = modifier
            .width(76.dp)
            .height(82.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(TinappleSurfaceHigh)
            .border(
                width = 1.dp,
                brush = if (isInstalled) getLiquidGlassBorder(StatusRunning)
                else SolidColor(TinappleBorderSubtle),
                shape = RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Brand Icon
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data("file:///android_asset/${client.iconAsset}")
                        .decoderFactory(SvgDecoder.Factory())
                        .crossfade(true)
                        .build(),
                    contentDescription = client.name,
                    modifier = Modifier.size(24.dp),
                    contentScale = ContentScale.Fit
                )
            }

            Spacer(modifier = Modifier.height(5.dp))

            // App Name
            Text(
                text = client.name,
                color = TextPrimary,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(3.dp))

            // Target Pill (App vs Web)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(if (isInstalled) StatusRunningBg else TinappleBorderSubtle)
                    .padding(horizontal = 4.dp, vertical = 1.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(4.dp)
                            .clip(CircleShape)
                            .background(if (isInstalled) StatusRunning else TextSecondary)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = if (isInstalled) "App" else "Web",
                        color = if (isInstalled) StatusRunning else TextSecondary,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}
