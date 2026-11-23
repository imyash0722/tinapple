package org.tinapple.hub.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.displayCutoutPadding
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import org.tinapple.hub.R
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemTelemetry
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.ui.components.ServiceBrandIconResolver
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.theme.TinappleDarkBackground
import org.tinapple.hub.ui.viewmodel.TinappleViewModel
import org.tinapple.hub.utils.ClientAppLauncher
import org.tinapple.hub.utils.LaunchResult
import kotlin.math.roundToInt

@Composable
fun ServerHomeScreen(
    viewModel: TinappleViewModel,
    onOpenAppearance: () -> Unit,
    onOpenPortal: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val wallpaperUrl = uiState.selectedWallpaper.safeUrl(uiState.activeServerOrigin)

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .displayCutoutPadding()
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Server Hero Card (ii-tools inspired)
        item(key = "server_hero") {
            ServerHeroCard(
                hostname = uiState.systemInfo.hostname.ifEmpty { "pineapple-server" },
                serverOrigin = uiState.activeServerOrigin,
                wallpaperUrl = wallpaperUrl,
                uptimeSeconds = uiState.systemInfo.totalUptimeSeconds,
                blurDp = uiState.appearanceSettings.blurDp,
                dimAlpha = uiState.appearanceSettings.dimAlpha,
                isRefreshing = uiState.isRefreshing || uiState.isDiscovering,
                onRefresh = { viewModel.refreshAll(forceDiscovery = true) },
                onOpenAppearance = onOpenAppearance
            )
        }

        // 2. System Telemetry Card (ii-tools LoadColumn 4-metric gauge)
        item(key = "server_perf") {
            ServerPerfCard(
                telemetry = uiState.telemetry,
                onRefresh = { viewModel.refreshAll(forceDiscovery = false) }
            )
        }

        // 3. Quick Client App Launcher Strip (ii-tools ToolsStrip)
        item(key = "client_apps_strip") {
            ClientToolsStrip(
                services = uiState.services,
                getPortalUrl = { svc -> viewModel.apiClient.getServicePortalUrl(svc) },
                onOpenPortal = onOpenPortal
            )
        }

        // 4. Quick Server Controls & Network
        item(key = "server_controls") {
            ServerControlsCard(
                protonStatus = uiState.protonStatus,
                isTogglingProton = uiState.isTogglingProton,
                onToggleProton = { active -> viewModel.toggleProton(active) },
                onHealTorrents = { viewModel.refreshAll(forceDiscovery = false) }
            )
        }

        // 5. Homelab Services Group (ii-tools CardGroup & ToolRow)
        item(key = "services_header") {
            SectionHeader(
                title = "Homelab Daemons",
                action = "Refresh",
                onAction = { viewModel.refreshAll(forceDiscovery = false) }
            )
        }

        item(key = "services_list") {
            ServerServicesGroup(
                services = uiState.services,
                togglingServiceMap = uiState.togglingServiceMap,
                getPortalUrl = { svc -> viewModel.apiClient.getServicePortalUrl(svc) },
                onToggleService = { svc, start -> viewModel.toggleService(svc, start) },
                onOpenPortal = onOpenPortal
            )
        }

        item(key = "bottom_spacer") {
            Spacer(modifier = Modifier.height(28.dp))
        }
    }
}

/** Expressive Server Hero Card matching ii-tools PcHero */
@Composable
private fun ServerHeroCard(
    hostname: String,
    serverOrigin: String,
    wallpaperUrl: String,
    uptimeSeconds: Long,
    blurDp: Int,
    dimAlpha: Float,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onOpenAppearance: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    val cleanHost = serverOrigin
        .removePrefix("http://")
        .removePrefix("https://")
        .removeSuffix(":8088")
        .ifEmpty { DiscoveryEngine.DEFAULT_TAILSCALE_HOST }

    val uptimeText = if (uptimeSeconds > 0) {
        val days = uptimeSeconds / 86400
        val hours = (uptimeSeconds % 86400) / 3600
        val mins = (uptimeSeconds % 3600) / 60
        if (days > 0) "${days}d ${hours}h uptime" else "${hours}h ${mins}m uptime"
    } else "Tailscale Mesh Active"

    ExpressiveCard(
        color = cs.primaryContainer,
        contentColor = cs.onPrimaryContainer,
        modifier = Modifier.height(260.dp),
        radius = Radius.card
    ) {
        // Wallpaper Backdrop with dynamic Blur & Scrim
        if (wallpaperUrl.isNotBlank()) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(wallpaperUrl)
                    .crossfade(300)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .then(if (blurDp > 0) Modifier.blur(blurDp.dp) else Modifier),
                alpha = 1.0f - (dimAlpha * 0.35f)
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.40f),
                                Color.Black.copy(alpha = 0.70f),
                                Color.Black.copy(alpha = 0.88f)
                            )
                        )
                    )
            )
        }

        // Top Status Bar inside Hero Card
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Online status pill with MagicDNS host
            Row(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(cs.surfaceContainerHigh.copy(alpha = 0.85f))
                    .padding(start = 12.dp, end = 14.dp)
                    .height(36.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(StatusRunning)
                )
                Text(
                    text = cleanHost,
                    style = Expressive.title(14.sp),
                    color = cs.onSurface,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Refresh button
                IconButton(
                    onClick = onRefresh,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = cs.surfaceContainerHigh.copy(alpha = 0.85f),
                        contentColor = cs.onSurface
                    ),
                    modifier = Modifier.size(36.dp)
                ) {
                    if (isRefreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = cs.primary
                        )
                    } else {
                        Icon(
                            painter = painterResource(R.drawable.rounded_refresh),
                            contentDescription = "Refresh",
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                // Themes & Preferences Action using clean Material Symbols palette
                IconButton(
                    onClick = onOpenAppearance,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = cs.surfaceContainerHigh.copy(alpha = 0.85f),
                        contentColor = cs.onSurface
                    ),
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_palette),
                        contentDescription = "Themes & Appearance",
                        tint = cs.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        // Bottom Info Row inside Hero Card
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(14.dp)
                .height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(cs.surfaceContainerHigh.copy(alpha = 0.90f))
                    .padding(horizontal = 18.dp, vertical = 12.dp),
            ) {
                Text(
                    text = hostname,
                    style = Expressive.xwide(26.sp),
                    color = cs.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Acer Aspire V3-571 · $uptimeText",
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/** Expressive 4-metric system telemetry gauge inspired by ii-tools PerfCard */
@Composable
private fun ServerPerfCard(
    telemetry: SystemTelemetry?,
    onRefresh: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val t = telemetry

    ExpressiveCard(
        color = Layer.pane,
        contentColor = cs.onSurface,
        radius = Radius.card
    ) {
        Column(
            modifier = Modifier.padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Caption("HOST SYSTEM LOAD", color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
                Icon(
                    painter = painterResource(R.drawable.rounded_speed),
                    contentDescription = null,
                    tint = cs.primary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // CPU
                LoadColumn(
                    value = t?.cpu?.usagePercent?.roundToInt()?.toString() ?: "—",
                    unit = "%",
                    label = "CPU · ${t?.thermal?.maxTempC?.roundToInt() ?: 45}°",
                    fraction = t?.let { (it.cpu.usagePercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.primary
                )

                // RAM
                LoadColumn(
                    value = t?.memory?.let { "%.1f".format(it.usedBytes / 1_073_741_824.0) } ?: "—",
                    unit = "GB",
                    label = t?.memory?.let { "RAM of %.0fG".format(it.totalBytes / 1_073_741_824.0) } ?: "RAM",
                    fraction = t?.memory?.let { (it.usedPercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.secondary
                )

                // DISK
                LoadColumn(
                    value = t?.disk?.let { "${(it.freeBytes / 1_073_741_824L)}" } ?: "—",
                    unit = "GB",
                    label = "DISK FREE",
                    fraction = t?.disk?.let { (it.usedPercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.tertiary
                )

                // POWER / THERMAL
                LoadColumn(
                    value = t?.thermal?.maxTempC?.roundToInt()?.toString() ?: "44",
                    unit = "°C",
                    label = t?.thermal?.powerProfile?.uppercase() ?: "BALANCED",
                    fraction = t?.thermal?.let { (it.maxTempC / 100.0).toFloat() } ?: 0.44f,
                    modifier = Modifier.weight(1f),
                    activeColor = if ((t?.thermal?.maxTempC ?: 0.0) > 75) cs.error else cs.primary
                )
            }
        }
    }
}

/** Client App Launcher Strip (Manga, Video, Music, Passwords, Torrents) */
@Composable
private fun ClientToolsStrip(
    services: List<ServiceItem>,
    getPortalUrl: (ServiceItem) -> String?,
    onOpenPortal: (String) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current

    val primaryApps = listOf(
        Triple("suwayomi", "Tsumiru", R.drawable.rounded_photo_library),
        Triple("jellyfin", "Findroid", R.drawable.rounded_theaters),
        Triple("navidrome", "Symfonium", R.drawable.rounded_music_note),
        Triple("pinemusic", "PineMusic", R.drawable.rounded_equalizer),
        Triple("vaultwarden", "Bitwarden", R.drawable.rounded_lock),
        Triple("qbittorrent", "qBittorrent", R.drawable.rounded_download),
        Triple("syncthing", "Syncthing", R.drawable.rounded_sync)
    )

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionHeader(
            title = "Client Apps",
            action = null
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            for ((serviceKey, label, fallbackIconRes) in primaryApps) {
                val matchingService = services.firstOrNull {
                    ClientAppLauncher.getServiceKey(it.name, it.displayName) == serviceKey
                }
                val portalUrl = matchingService?.let { getPortalUrl(it) }
                val installedPkg = ClientAppLauncher.findInstalledClient(context, serviceKey)
                val isInstalled = installedPkg != null

                Column(
                    modifier = Modifier
                        .width(96.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(Layer.pane)
                        .clickable {
                            val res = ClientAppLauncher.launchByServiceKey(context, serviceKey, portalUrl)
                            if (res is LaunchResult.OpenedWeb) {
                                onOpenPortal(res.url)
                            }
                        }
                        .padding(horizontal = 8.dp, vertical = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // App icon: loads installed package icon or brand SVG/drawable
                    if (installedPkg != null) {
                        AppIcon(pkg = installedPkg.packageName, size = 46.dp)
                    } else {
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(cs.secondaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(fallbackIconRes),
                                contentDescription = label,
                                tint = cs.onSecondaryContainer,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    Text(
                        text = label,
                        style = Expressive.title(12.sp),
                        color = cs.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Pill(
                        text = if (isInstalled) "App" else "Web",
                        container = if (isInstalled) Color(0xFF10B981).copy(alpha = 0.2f) else Layer.field,
                        content = if (isInstalled) Color(0xFF10B981) else cs.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/** Quick Controls for Proton VPN, Tailscale MagicDNS, Hotspot, and Power */
@Composable
private fun ServerControlsCard(
    protonStatus: org.tinapple.hub.data.ProtonStatus?,
    isTogglingProton: Boolean,
    onToggleProton: (Boolean) -> Unit,
    onHealTorrents: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val isVpnActive = protonStatus?.active == true

    CardGroup {
        // Proton VPN Exit Node Row
        ToolRow(
            title = "Proton VPN Exit Node",
            summary = if (isVpnActive) "Active Egress: ${protonStatus?.ip ?: "Proton WG"}" else "Direct Ingress / Offline",
            icon = R.drawable.rounded_vpn_lock,
            tint = if (isVpnActive) Tint.PRIMARY else Tint.SECONDARY,
            trailing = {
                if (isTogglingProton) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Switch(
                        checked = isVpnActive,
                        onCheckedChange = { onToggleProton(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = cs.primary,
                            checkedTrackColor = cs.primaryContainer
                        )
                    )
                }
            }
        )

        // Tailscale MagicDNS Direct Peer
        ToolRow(
            title = "Tailscale MagicDNS",
            summary = "Direct Peer · pineapple-server · 192.168.4.0/24 Subnet",
            icon = R.drawable.rounded_lan,
            tint = Tint.PRIMARY
        )

        // Server Power & Heal Torrents Row
        ToolRow(
            title = "Download Queue Auto-Resumer",
            summary = "Resume qBittorrent, Suwayomi queue & lossless PineMusic",
            icon = R.drawable.rounded_restart_alt,
            tint = Tint.SECONDARY,
            onClick = onHealTorrents
        )
    }
}

/** Homelab Services Group formatted in CardGroup & ToolRow */
@Composable
private fun ServerServicesGroup(
    services: List<ServiceItem>,
    togglingServiceMap: Map<String, Boolean>,
    getPortalUrl: (ServiceItem) -> String?,
    onToggleService: (ServiceItem, Boolean) -> Unit,
    onOpenPortal: (String) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current

    CardGroup {
        for (service in services) {
            val isToggling = togglingServiceMap[service.name] == true
            val portalUrl = getPortalUrl(service)
            val serviceKey = ClientAppLauncher.getServiceKey(service.name, service.displayName)
            val installedPkg = ClientAppLauncher.findInstalledClient(context, serviceKey)
            val isInstalled = installedPkg != null

            ToolRow(
                title = service.displayName ?: service.name,
                summary = "Port: ${service.displayPort ?: service.port ?: "systemd"} · ${if (isInstalled) "● Native Client Available" else if (portalUrl != null) "● Web Portal" else "● Background Service"}",
                icon = R.drawable.rounded_terminal,
                tint = if (service.running) Tint.PRIMARY else Tint.SECONDARY,
                leading = {
                    if (installedPkg != null) {
                        AppIcon(pkg = installedPkg.packageName, size = 40.dp)
                    } else {
                        val iconAsset = ServiceBrandIconResolver.getIconAssetPath(service.name, service.displayName)
                        if (iconAsset != null) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data("file:///android_asset/$iconAsset")
                                    .build(),
                                contentDescription = service.displayName,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(cs.surfaceContainerHigh)
                                    .padding(6.dp)
                            )
                        } else {
                            IconBadge(R.drawable.rounded_dns, if (service.running) Tint.PRIMARY else Tint.SECONDARY)
                        }
                    }
                },
                trailing = {
                    if (isToggling) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Switch(
                            checked = service.running,
                            onCheckedChange = { onToggleService(service, it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = cs.primary,
                                checkedTrackColor = cs.primaryContainer
                            )
                        )
                    }
                },
                onClick = {
                    val res = ClientAppLauncher.launchService(context, service, portalUrl)
                    if (res is LaunchResult.OpenedWeb) {
                        onOpenPortal(res.url)
                    }
                }
            )
        }
    }
}
