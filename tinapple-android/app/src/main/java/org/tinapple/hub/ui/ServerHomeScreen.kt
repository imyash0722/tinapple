package org.tinapple.hub.ui

import android.widget.Toast
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import org.tinapple.hub.R
import org.tinapple.hub.data.AVAILABLE_CLIENT_APPS
import org.tinapple.hub.data.MusicNowPlayingState
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemTelemetry
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.ui.components.HyprlandRemoteDesktopWidget
import org.tinapple.hub.ui.components.JellyfinMediaWidget
import org.tinapple.hub.ui.components.ServiceBrandIconResolver
import org.tinapple.hub.ui.components.SuwayomiShelfWidget
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.viewmodel.TinappleViewModel
import org.tinapple.hub.utils.ClientAppLauncher
import org.tinapple.hub.utils.LaunchResult
import kotlin.math.roundToInt

@Composable
fun ServerHomeScreen(
    viewModel: TinappleViewModel,
    onOpenAppearance: () -> Unit,
    onOpenNetworker: () -> Unit,
    onOpenPortal: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val wallpaperUrl = uiState.localWallpaperFilePath?.let { "file://$it" }
        ?: uiState.selectedWallpaper.safeUrl(uiState.activeServerOrigin)

    var isShowingCustomizer by remember { mutableStateOf(false) }

    if (isShowingCustomizer) {
        CustomizeWidgetsSheet(
            enabledWidgets = uiState.enabledWidgets,
            pinnedClientApps = uiState.pinnedClientApps,
            onToggleWidget = { id, enabled -> viewModel.toggleWidget(id, enabled) },
            onTogglePinnedApp = { appKey, pinned -> viewModel.togglePinnedApp(appKey, pinned) },
            onDismiss = { isShowingCustomizer = false }
        )
    }

    // LazyColumn draws directly edge-to-edge under camera cutout and status bar
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top spacing so the topmost section sits comfortably below the camera cutout/punch hole
        item(key = "top_cutout_spacer") {
            Spacer(modifier = Modifier.height(34.dp))
        }

        // 1. Server Hero Card (keeps Refresh, Customize & Appearance Settings right at top)
        if (uiState.enabledWidgets.contains("hero")) {
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
                    onOpenAppearance = onOpenAppearance,
                    onOpenCustomize = { isShowingCustomizer = true }
                )
            }
        }

        // 2. System Telemetry Card (Host System Load)
        if (uiState.enabledWidgets.contains("telemetry")) {
            item(key = "server_perf") {
                ServerPerfCard(
                    telemetry = uiState.telemetry,
                    onRefresh = { viewModel.refreshAll(forceDiscovery = false) }
                )
            }
        }

        // 3. Quick Server Controls & Network (1-tap jump into Network page + MagicDNS copy)
        if (uiState.enabledWidgets.contains("controls")) {
            item(key = "server_controls") {
                ServerControlsCard(
                    protonStatus = uiState.protonStatus,
                    networkerStatus = uiState.networkerStatus,
                    isTogglingProton = uiState.isTogglingProton,
                    onOpenNetworker = onOpenNetworker
                )
            }
        }

        // 4. Quick Client App Launcher Strip (Customizable / User-Editable)
        if (uiState.enabledWidgets.contains("client_apps")) {
            item(key = "client_apps_strip") {
                ClientToolsStrip(
                    services = uiState.services,
                    pinnedApps = uiState.pinnedClientApps,
                    getPortalUrl = { svc -> viewModel.apiClient.getServicePortalUrl(svc) },
                    onOpenPortal = onOpenPortal
                )
            }
        }

        item(key = "bottom_spacer") {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/** Dedicated Media & Remote Screen Page (Music, Suwayomi Manga, Jellyfin, Hyprland VNC) */
@Composable
fun ServerMediaScreen(
    viewModel: TinappleViewModel,
    onOpenTerminal: () -> Unit,
    onOpenPortal: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .displayCutoutPadding()
            .statusBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item(key = "media_header") {
            SectionHeader(
                title = "Media & Remote",
                actionIcon = R.drawable.rounded_refresh,
                onAction = { viewModel.refreshAll(forceDiscovery = false) }
            )
        }

        item(key = "now_playing") {
            NowPlayingCard(
                nowPlaying = uiState.nowPlaying,
                onLaunchVibrdrome = {
                    val navService = uiState.services.firstOrNull {
                        ClientAppLauncher.getServiceKey(it.name, it.displayName) == "navidrome"
                    }
                    val portalUrl = navService?.let { viewModel.apiClient.getServicePortalUrl(it) }
                    val res = ClientAppLauncher.launchByServiceKey(context, "vibrdrome", portalUrl)
                    if (res is LaunchResult.OpenedWeb) {
                        onOpenPortal(res.url)
                    }
                }
            )
        }

        item(key = "suwayomi_manga_shelf") {
            SuwayomiShelfWidget(
                mangaList = uiState.mangaItems,
                serverOrigin = uiState.activeServerOrigin,
                onOpenTsumiru = {
                    ClientAppLauncher.launchByServiceKey(context, "tsumiru")
                }
            )
        }

        item(key = "jellyfin_media_shelf") {
            JellyfinMediaWidget(
                mediaList = uiState.jellyfinRecent,
                serverOrigin = uiState.activeServerOrigin,
                onOpenPlezy = {
                    ClientAppLauncher.launchByServiceKey(context, "plezy")
                }
            )
        }

        item(key = "hyprland_remote_desktop") {
            HyprlandRemoteDesktopWidget(
                serverOrigin = uiState.activeServerOrigin,
                onOpenTerminal = onOpenTerminal
            )
        }

        item(key = "media_bottom_spacer") {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/** Dedicated Searchable & Filterable Services Page */
@Composable
fun ServerServicesScreen(
    viewModel: TinappleViewModel,
    onOpenPortal: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current

    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("all") }

    val filteredServices = remember(uiState.services, searchQuery, statusFilter) {
        uiState.services.filter { svc ->
            val matchesStatus = when (statusFilter) {
                "running" -> svc.running
                "stopped" -> !svc.running
                else -> true
            }
            val q = searchQuery.trim().lowercase()
            val matchesQuery = q.isEmpty() ||
                (svc.displayName ?: svc.name).lowercase().contains(q) ||
                svc.name.lowercase().contains(q) ||
                (svc.displayPort?.toString() ?: "").contains(q)
            matchesStatus && matchesQuery
        }
    }
    val runningCount = uiState.services.count { it.running }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .displayCutoutPadding()
            .statusBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "services_header") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Homelab Daemons",
                        style = Expressive.wide(22.sp),
                        color = cs.onSurface
                    )
                    Text(
                        text = "$runningCount running · ${uiState.services.size} total",
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onSurfaceVariant
                    )
                }

                IconButton(
                    onClick = { viewModel.refreshAll(forceDiscovery = false) },
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(Layer.pane)
                ) {
                    if (uiState.isRefreshing) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(
                            painter = painterResource(R.drawable.rounded_refresh),
                            contentDescription = "Refresh services",
                            tint = cs.primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        item(key = "services_search_filter") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search services or ports...", maxLines = 1) },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Rounded.Close, contentDescription = "Clear search")
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Layer.pane,
                        unfocusedContainerColor = Layer.pane
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        "all" to "All (${uiState.services.size})",
                        "running" to "Running ($runningCount)",
                        "stopped" to "Stopped (${uiState.services.size - runningCount})"
                    ).forEach { (key, label) ->
                        FilterChip(
                            selected = statusFilter == key,
                            onClick = { statusFilter = key },
                            label = { Text(label, maxLines = 1) }
                        )
                    }
                }
            }
        }

        items(filteredServices, key = { it.name }) { service ->
            val isToggling = uiState.togglingServiceMap[service.name] == true
            val portalUrl = viewModel.apiClient.getServicePortalUrl(service)
            val serviceKey = ClientAppLauncher.getServiceKey(service.name, service.displayName)
            val isInstalled = ClientAppLauncher.findInstalledClient(context, serviceKey) != null
            val shortType = when {
                isInstalled -> "Native app"
                portalUrl != null -> "Web UI"
                else -> "Daemon"
            }
            val portLabel = service.displayPort ?: service.port

            ToolRow(
                title = service.displayName ?: service.name,
                summary = if (portLabel != null) ":$portLabel · $shortType" else shortType,
                icon = R.drawable.rounded_terminal,
                tint = if (service.running) Tint.PRIMARY else Tint.SECONDARY,
                leading = {
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
                },
                trailing = {
                    if (isToggling) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Switch(
                            checked = service.running,
                            onCheckedChange = { viewModel.toggleService(service, it) },
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

        item(key = "services_bottom_spacer") {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/** Expressive Server Hero Card matching ii-tools PcHero with Tinapple dual-facet logo */
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
    onOpenAppearance: () -> Unit,
    onOpenCustomize: () -> Unit
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

    val uptimeText = if (uptimeSeconds > 0) {
        val days = uptimeSeconds / 86400
        val hours = (uptimeSeconds % 86400) / 3600
        val mins = (uptimeSeconds % 3600) / 60
        if (days > 0) "${days}d ${hours}h uptime" else "${hours}h ${mins}m uptime"
    } else "Tailscale Mesh Active"

    ExpressiveCard(
        color = cs.primaryContainer,
        contentColor = cs.onPrimaryContainer,
        modifier = Modifier.height(186.dp),
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

        // Top Action & Status Bar inside Hero Card
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Compact online status pill
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
                    text = if (serverOrigin.contains("100.") || serverOrigin.contains(".ts.net")) "Tailscale Online" else "LAN Online",
                    style = Expressive.title(13.sp),
                    color = cs.onSurface,
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

                // Customize Widgets Action
                IconButton(
                    onClick = onOpenCustomize,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = cs.surfaceContainerHigh.copy(alpha = 0.85f),
                        contentColor = cs.onSurface
                    ),
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_dashboard_customize),
                        contentDescription = "Customize Widgets",
                        tint = cs.onSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Themes & Appearance Settings
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

        // Bottom Info Row inside Hero Card with Black Backdrop Matugen-Coloured Tinapple Logo
        Row(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Official Tinapple Logo: solid black backdrop squircle with Matugen colored facets inside
            TinappleLogoBadge(
                primaryColor = cs.primary,
                secondaryColor = cs.secondary,
                tertiaryColor = cs.tertiary
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(22.dp))
                    .background(cs.surfaceContainerHigh.copy(alpha = 0.90f))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Text(
                    text = hostname,
                    style = Expressive.wide(16.sp),
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

/** Official Tinapple geometric emblem on solid obsidian black squircle with dynamic Matugen colors */
@Composable
fun TinappleLogoBadge(
    primaryColor: Color,
    secondaryColor: Color,
    tertiaryColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(32.dp)) {
            val w = size.width
            val h = size.height

            // 1. Crown Leaves in secondaryColor (Matugen secondary)
            val crownPath = Path().apply {
                // Center crown leaf
                moveTo(w * 0.5f, h * 0.06f)
                cubicTo(w * 0.44f, h * 0.16f, w * 0.46f, h * 0.28f, w * 0.5f, h * 0.34f)
                cubicTo(w * 0.54f, h * 0.28f, w * 0.56f, h * 0.16f, w * 0.5f, h * 0.06f)
                close()

                // Left leaf
                moveTo(w * 0.5f, h * 0.34f)
                cubicTo(w * 0.36f, h * 0.28f, w * 0.20f, h * 0.16f, w * 0.22f, h * 0.10f)
                cubicTo(w * 0.18f, h * 0.24f, w * 0.32f, h * 0.33f, w * 0.5f, h * 0.34f)
                close()

                // Right leaf
                moveTo(w * 0.5f, h * 0.34f)
                cubicTo(w * 0.64f, h * 0.28f, w * 0.80f, h * 0.16f, w * 0.78f, h * 0.10f)
                cubicTo(w * 0.82f, h * 0.24f, w * 0.68f, h * 0.33f, w * 0.5f, h * 0.34f)
                close()
            }
            drawPath(crownPath, color = secondaryColor)

            // 2. Main Apple / Pineapple Body in primaryColor (Matugen primary)
            val bodyPath = Path().apply {
                moveTo(w * 0.5f, h * 0.36f)
                cubicTo(w * 0.76f, h * 0.34f, w * 0.90f, h * 0.54f, w * 0.84f, h * 0.76f)
                cubicTo(w * 0.78f, h * 0.94f, w * 0.58f, h * 0.96f, w * 0.5f, h * 0.92f)
                cubicTo(w * 0.42f, h * 0.96f, w * 0.22f, h * 0.94f, w * 0.16f, h * 0.76f)
                cubicTo(w * 0.10f, h * 0.54f, w * 0.24f, h * 0.34f, w * 0.5f, h * 0.36f)
                close()
            }
            drawPath(bodyPath, color = primaryColor)

            // 3. Subtle curved specular highlight arc along left shoulder (No X lines)
            val highlightPath = Path().apply {
                moveTo(w * 0.32f, h * 0.50f)
                cubicTo(w * 0.26f, h * 0.60f, w * 0.28f, h * 0.72f, w * 0.36f, h * 0.78f)
            }
            drawPath(
                path = highlightPath,
                color = Color.White.copy(alpha = 0.25f),
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = 2.dp.toPx(),
                    cap = androidx.compose.ui.graphics.StrokeCap.Round
                )
            )

            // 4. White glint sparkle
            drawCircle(
                color = Color.White.copy(alpha = 0.85f),
                radius = 1.8f.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(w * 0.38f, h * 0.48f)
            )
        }
    }
}

/** Navidrome Now Playing & Music Remote Player Card */
@Composable
private fun NowPlayingCard(
    nowPlaying: MusicNowPlayingState,
    onLaunchVibrdrome: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val track = nowPlaying.track

    ExpressiveCard(
        color = Layer.pane,
        contentColor = cs.onSurface,
        radius = Radius.card,
        onClick = onLaunchVibrdrome
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Caption("NAVIDROME MUSIC STREAM", color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
                Pill(
                    text = if (nowPlaying.active) "Streaming" else "Idle",
                    container = if (nowPlaying.active) Color(0xFF10B981).copy(alpha = 0.2f) else Layer.field,
                    content = if (nowPlaying.active) Color(0xFF10B981) else cs.onSurfaceVariant
                )
            }

            if (track != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Album Cover
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(cs.surfaceContainerHigh),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!track.coverUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(track.coverUrl)
                                    .crossfade(200)
                                    .build(),
                                contentDescription = track.album ?: track.title,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(
                                painter = painterResource(R.drawable.rounded_album),
                                contentDescription = null,
                                tint = cs.onSurfaceVariant,
                                modifier = Modifier.size(30.dp)
                            )
                        }
                    }

                    // Track & Artist Info
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = track.title,
                            style = Expressive.title(15.sp),
                            color = cs.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${track.artist}${track.album?.let { " · $it" } ?: ""}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = cs.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    // Player Control Button: Open Vibrdrome
                    IconButton(
                        onClick = onLaunchVibrdrome,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(cs.secondaryContainer)
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.rounded_play_arrow),
                            contentDescription = "Open Vibrdrome",
                            tint = cs.onSecondaryContainer,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(cs.secondaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.rounded_music_note),
                            contentDescription = null,
                            tint = cs.onSecondaryContainer,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Text(
                            text = "Music Stream Idle",
                            style = Expressive.title(14.sp),
                            color = cs.onSurface
                        )
                        Text(
                            text = "Tap to open Vibrdrome client",
                            style = MaterialTheme.typography.bodyMedium,
                            color = cs.onSurfaceVariant
                        )
                    }
                    TonalPill(
                        text = "Vibrdrome",
                        onClick = onLaunchVibrdrome,
                        height = 36.dp
                    )
                }
            }
        }
    }
}

/** Expressive 4-metric system telemetry gauge inspired by ii-tools PerfCard with non-truncating labels */
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

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                // CPU
                LoadColumn(
                    value = t?.cpu?.usagePercent?.roundToInt()?.toString() ?: "—",
                    unit = "%",
                    label = "CPU",
                    fraction = t?.let { (it.cpu.usagePercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.primary
                )

                // RAM
                LoadColumn(
                    value = t?.memory?.let { "%.1f".format(it.usedBytes / 1_073_741_824.0) } ?: "—",
                    unit = "GB",
                    label = "RAM",
                    fraction = t?.memory?.let { (it.usedPercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.secondary
                )

                // DISK: Free GB (with total in sub-label so digits never collide)
                val freeGb = t?.disk?.let { (it.freeBytes / 1_073_741_824L) }
                val totalGb = t?.disk?.let { (it.totalBytes / 1_073_741_824L) }

                LoadColumn(
                    value = freeGb?.toString() ?: "—",
                    unit = "GB",
                    label = totalGb?.let { "Free / ${it}G" } ?: "Disk Free",
                    fraction = t?.disk?.let { (it.usedPercent / 100.0).toFloat() },
                    modifier = Modifier.weight(1f),
                    activeColor = cs.tertiary
                )

                // POWER / THERMAL
                LoadColumn(
                    value = t?.thermal?.maxTempC?.roundToInt()?.toString() ?: "44",
                    unit = "°C",
                    label = "Temp",
                    fraction = t?.thermal?.let { (it.maxTempC / 100.0).toFloat() } ?: 0.44f,
                    modifier = Modifier.weight(1f),
                    activeColor = if ((t?.thermal?.maxTempC ?: 0.0) > 75) cs.error else cs.primary
                )
            }
        }
    }
}

/** Minimal icon-only Android app launcher dock (no title, no bulky card or text labels) */
@Composable
private fun ClientToolsStrip(
    services: List<ServiceItem>,
    pinnedApps: List<String>,
    getPortalUrl: (ServiceItem) -> String?,
    onOpenPortal: (String) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current

    val activeApps = pinnedApps.mapNotNull { key ->
        AVAILABLE_CLIENT_APPS.firstOrNull { it.key == key }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 4.dp, vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (app in activeApps) {
            val serviceKey = app.key
            val label = app.name
            val fallbackIconRes = app.iconRes
            val matchingService = services.firstOrNull {
                ClientAppLauncher.getServiceKey(it.name, it.displayName) == serviceKey
            }
            val portalUrl = matchingService?.let { getPortalUrl(it) }
            val installedPkg = ClientAppLauncher.findInstalledClient(context, serviceKey)

            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable {
                        val res = ClientAppLauncher.launchByServiceKey(context, serviceKey, portalUrl)
                        if (res is LaunchResult.OpenedWeb) {
                            onOpenPortal(res.url)
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                if (installedPkg != null) {
                    AppIcon(pkg = installedPkg.packageName, size = 50.dp)
                } else {
                    Box(
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Layer.pane),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(fallbackIconRes),
                            contentDescription = label,
                            tint = cs.primary,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
            }
        }
    }
}

/** Quick Controls for Proton VPN, Tor Proxy Split-Tunneling, and Tailscale MagicDNS */
@Composable
private fun ServerControlsCard(
    protonStatus: org.tinapple.hub.data.ProtonStatus?,
    networkerStatus: org.tinapple.hub.data.NetworkerStatus,
    isTogglingProton: Boolean,
    onOpenNetworker: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val isVpnActive = protonStatus?.active == true || networkerStatus.proton.active
    val isTorActive = networkerStatus.tor.active
    val routedCount = networkerStatus.targets.count { it.mode != "direct" }
    val magicDnsHost = DiscoveryEngine.DEFAULT_TAILSCALE_HOST

    val protonSummary = buildString {
        append(if (isVpnActive) "Proton: ${networkerStatus.proton.countryCode ?: "On"}" else "Proton: Off")
        append(" · ")
        append(if (isTorActive) "Tor: ${networkerStatus.tor.countryCode ?: networkerStatus.tor.country ?: "On"}" else "Tor: Off")
        if (routedCount > 0) append(" · $routedCount routed")
    }

    CardGroup {
        // Clickable Tile opening Full ProtonVPN & Tor Split-Tunneling Management Page
        ToolRow(
            title = "ProtonVPN & Tor",
            summary = protonSummary,
            icon = R.drawable.rounded_vpn_lock,
            tint = if (isVpnActive || isTorActive) Tint.PRIMARY else Tint.SECONDARY,
            onClick = onOpenNetworker,
            trailing = {
                if (isTogglingProton) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Icon(
                        painter = painterResource(R.drawable.rounded_chevron_right),
                        contentDescription = "Open ProtonVPN & Tor Manager",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        )

        // Tailscale MagicDNS Direct Peer with Copy Button
        ToolRow(
            title = "Tailscale MagicDNS",
            summary = magicDnsHost,
            icon = R.drawable.rounded_lan,
            tint = Tint.PRIMARY,
            trailing = {
                IconButton(
                    onClick = {
                        clipboardManager.setText(AnnotatedString(magicDnsHost))
                        Toast.makeText(context, "Copied $magicDnsHost to clipboard", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_content_copy),
                        contentDescription = "Copy MagicDNS",
                        tint = cs.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        )
    }
}

/** Customize Widgets Bottom Sheet */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomizeWidgetsSheet(
    enabledWidgets: Set<String>,
    pinnedClientApps: List<String>,
    onToggleWidget: (String, Boolean) -> Unit,
    onTogglePinnedApp: (String, Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val widgetOptions = listOf(
        "hero" to ("Server Overview & Host Status" to "Wallpaper backdrop, hardware specs & live origin"),
        "telemetry" to ("Host System Load" to "Compact 4-metric gauges: CPU, RAM, Disk & Temp"),
        "controls" to ("ProtonVPN, Tor & MagicDNS" to "Quick VPN summary link and MagicDNS copy"),
        "client_apps" to ("Quick Client Apps Strip" to "Syncthing, Bitwarden, Tsumiru, Plezy, Vibrdrome")
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Layer.pane,
        contentColor = cs.onSurface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Customize Companion UI",
                    style = Expressive.wide(20.sp),
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onDismiss) {
                    Icon(painter = painterResource(R.drawable.rounded_close), contentDescription = "Close")
                }
            }

            Text(
                text = "Toggle section cards displayed on your companion home screen.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            CardGroup {
                for ((id, pair) in widgetOptions) {
                    val (title, summary) = pair
                    val isChecked = enabledWidgets.contains(id)

                    ToolRow(
                        title = title,
                        summary = summary,
                        icon = when (id) {
                            "hero" -> R.drawable.rounded_computer
                            "now_playing" -> R.drawable.rounded_music_note
                            "telemetry" -> R.drawable.rounded_speed
                            "client_apps" -> R.drawable.rounded_apps
                            "controls" -> R.drawable.rounded_vpn_lock
                            else -> R.drawable.rounded_dns
                        },
                        tint = if (isChecked) Tint.PRIMARY else Tint.SECONDARY,
                        trailing = {
                            Switch(
                                checked = isChecked,
                                onCheckedChange = { onToggleWidget(id, it) },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = cs.primary,
                                    checkedTrackColor = cs.primaryContainer
                                )
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Pinned Client Apps",
                style = Expressive.wide(18.sp),
                color = cs.onSurface
            )

            Text(
                text = "Choose which apps appear in your quick client apps strip.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            CardGroup {
                for (app in AVAILABLE_CLIENT_APPS) {
                    val isPinned = pinnedClientApps.contains(app.key)
                    ToolRow(
                        title = app.name,
                        summary = app.description,
                        icon = app.iconRes,
                        tint = if (isPinned) Tint.PRIMARY else Tint.SECONDARY,
                        trailing = {
                            Switch(
                                checked = isPinned,
                                onCheckedChange = { onTogglePinnedApp(app.key, it) },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = cs.primary,
                                    checkedTrackColor = cs.primaryContainer
                                )
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
