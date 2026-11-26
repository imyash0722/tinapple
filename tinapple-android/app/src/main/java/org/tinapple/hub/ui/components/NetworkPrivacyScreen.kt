package org.tinapple.hub.ui.components

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.displayCutoutPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.UploadFile
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
import org.tinapple.hub.data.NetworkerStatus
import org.tinapple.hub.data.NetworkerTarget
import org.tinapple.hub.data.ProtonProfileMeta
import org.tinapple.hub.ui.ExpressiveCard
import org.tinapple.hub.ui.IconBadge
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.Pill
import org.tinapple.hub.ui.Radius
import org.tinapple.hub.ui.Tint
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.ui.theme.StatusFailed
import org.tinapple.hub.ui.theme.StatusRunning

private val COUNTRY_MAP = mapOf(
    "US" to "United States",
    "NL" to "Netherlands",
    "JP" to "Japan",
    "CH" to "Switzerland",
    "RO" to "Romania",
    "PL" to "Poland",
    "CA" to "Canada",
    "GB" to "United Kingdom",
    "DE" to "Germany",
    "FR" to "France",
    "NO" to "Norway",
    "SG" to "Singapore"
)

private fun formatCountryDisplay(country: String?, code: String?): String {
    val c = country?.trim().orEmpty()
    val cc = code?.trim()?.uppercase().orEmpty()
    return when {
        c.isNotEmpty() && cc.isNotEmpty() && !c.equals(cc, ignoreCase = true) -> "$c ($cc)"
        c.isNotEmpty() && COUNTRY_MAP.containsKey(c.uppercase()) -> "${COUNTRY_MAP[c.uppercase()]} (${c.uppercase()})"
        c.isNotEmpty() -> c
        cc.isNotEmpty() && COUNTRY_MAP.containsKey(cc) -> "${COUNTRY_MAP[cc]} ($cc)"
        cc.isNotEmpty() -> cc
        else -> "Unknown Country"
    }
}

private fun queryDisplayName(context: android.content.Context, uri: Uri): String {
    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0) return cursor.getString(idx) ?: "proton-custom.conf"
        }
    }
    return uri.lastPathSegment?.substringAfterLast("/") ?: "proton-custom.conf"
}

@Composable
fun NetworkPrivacyScreen(
    status: NetworkerStatus,
    busyKey: String?,
    errorBanner: String?,
    onRefresh: () -> Unit,
    onDismissError: () -> Unit,
    onToggleProton: (Boolean) -> Unit,
    onReloadProton: () -> Unit,
    onSelectProfile: (String) -> Unit,
    onUploadConfig: (fileName: String, configText: String, connectNow: Boolean) -> Unit,
    onDeleteProfile: (String) -> Unit,
    onToggleTor: (Boolean) -> Unit,
    onReloadTor: () -> Unit,
    onSetRoute: (targetId: String, mode: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val proton = status.proton
    val tor = status.tor
    val profiles = proton.profiles
    val activeProfile = profiles.firstOrNull { it.id == proton.activeProfileId } ?: profiles.firstOrNull()
    val targets = status.targets
    val isBusy = busyKey != null

    var configDropdownExpanded by remember { mutableStateOf(false) }
    var showUploadDialog by remember { mutableStateOf(false) }
    var uploadFileName by remember { mutableStateOf("") }
    var uploadConfigText by remember { mutableStateOf("") }
    var connectAfterUpload by remember { mutableStateOf(true) }

    val confPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            runCatching {
                val name = queryDisplayName(context, uri)
                val content = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }.orEmpty()
                if (content.isNotBlank()) {
                    uploadFileName = name
                    uploadConfigText = content
                }
            }
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .displayCutoutPadding()
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header Bar
        item(key = "header") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Layer.pane)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "Back",
                        tint = cs.onSurface,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "ProtonVPN & Tor",
                        style = Expressive.title(19.sp),
                        color = cs.onSurface
                    )
                    Text(
                        text = "Kernel split-tunneling via tinapple-networker",
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onSurfaceVariant
                    )
                }

                IconButton(
                    onClick = onRefresh,
                    enabled = !isBusy,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Layer.pane)
                ) {
                    if (busyKey == "refresh") {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(
                            imageVector = Icons.Rounded.Refresh,
                            contentDescription = "Refresh status",
                            tint = cs.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // Error Banner
        val activeError = errorBanner ?: status.error
        if (!activeError.isNullOrBlank()) {
            item(key = "error_banner") {
                ExpressiveCard(color = cs.errorContainer.copy(alpha = 0.85f), contentColor = cs.onErrorContainer, radius = Radius.card) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Rounded.ErrorOutline, contentDescription = null, tint = StatusFailed, modifier = Modifier.size(20.dp))
                        Text(
                            text = activeError,
                            style = MaterialTheme.typography.bodySmall,
                            color = cs.onErrorContainer,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = onDismissError, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Rounded.Close, contentDescription = "Dismiss", tint = cs.onErrorContainer, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }

        // Global Harness Warnings
        if (status.warnings.isNotEmpty()) {
            item(key = "warnings") {
                ExpressiveCard(color = Color(0xFF3A280A).copy(alpha = 0.82f), contentColor = Color(0xFFFDE68A), radius = Radius.card) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        status.warnings.forEach { warn ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Rounded.WarningAmber, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                                Text(warn, style = MaterialTheme.typography.bodySmall, color = Color(0xFFFDE68A))
                            }
                        }
                    }
                }
            }
        }

        // Master Tile 1: ProtonVPN [Icon (left), Name (left), Reload (right), Toggle (right)]
        item(key = "master_proton") {
            MasterTunnelTile(
                name = "ProtonVPN",
                subtitle = if (proton.active) {
                    listOfNotNull(proton.exitIp ?: "Connected", proton.countryCode).joinToString(" · ")
                } else if (proton.configured) {
                    "WireGuard tunnel stopped"
                } else {
                    "No WireGuard config active"
                },
                iconAsset = "icons/protonvpn.svg",
                active = proton.active,
                reloading = busyKey == "proton-reload",
                toggling = busyKey == "proton-toggle",
                reloadEnabled = !isBusy && proton.configured,
                toggleEnabled = !isBusy,
                onReload = onReloadProton,
                onToggle = onToggleProton
            )
        }

        // Master Tile 2: Tor Proxy [Icon (left), Name (left), Reload (right), Toggle (right)]
        item(key = "master_tor") {
            MasterTunnelTile(
                name = "Tor Proxy",
                subtitle = if (tor.active) {
                    listOfNotNull(tor.exitIp ?: "Circuit active", tor.country).joinToString(" · ")
                } else {
                    "Transparent proxy offline"
                },
                iconAsset = "icons/tor.svg",
                active = tor.active,
                reloading = busyKey == "tor-reload",
                toggling = busyKey == "tor-toggle",
                reloadEnabled = !isBusy && tor.active,
                toggleEnabled = !isBusy,
                onReload = onReloadTor,
                onToggle = onToggleTor
            )
        }

        // ProtonVPN WireGuard Config Dropdown Tile (+ "+ Add more" at bottom)
        item(key = "proton_config_dropdown") {
            ExpressiveCard(color = Layer.pane, contentColor = cs.onSurface, radius = Radius.card) {
                Box(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !isBusy) { configDropdownExpanded = true }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        BrandSvgBadge(assetPath = "icons/wireguard.svg")

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "ProtonVPN WireGuard Config",
                                style = Expressive.title(15.sp),
                                color = cs.onSurface
                            )
                            Text(
                                text = if (activeProfile != null) {
                                    "${activeProfile.name} · ${formatCountryDisplay(activeProfile.country, activeProfile.countryCode)}${if (activeProfile.freeTier) " · Free Tier" else ""}"
                                } else {
                                    "Tap to select or add a .conf file"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = cs.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Icon(
                            imageVector = Icons.Rounded.KeyboardArrowDown,
                            contentDescription = "Select WireGuard Config",
                            tint = cs.onSurfaceVariant
                        )
                    }

                    DropdownMenu(
                        expanded = configDropdownExpanded,
                        onDismissRequest = { configDropdownExpanded = false },
                        modifier = Modifier.fillMaxWidth(0.86f)
                    ) {
                        if (profiles.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No WireGuard configs uploaded yet") },
                                onClick = {},
                                enabled = false
                            )
                        } else {
                            profiles.forEach { profile: ProtonProfileMeta ->
                                val selected = profile.id == activeProfile?.id
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = profile.name,
                                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                                    color = if (selected) cs.primary else cs.onSurface
                                                )
                                                Text(
                                                    text = "${formatCountryDisplay(profile.country, profile.countryCode)} · ${profile.endpointHost}${if (profile.freeTier) " · Free" else ""}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = cs.onSurfaceVariant
                                                )
                                            }
                                            if (profiles.size > 1) {
                                                IconButton(
                                                    onClick = {
                                                        configDropdownExpanded = false
                                                        onDeleteProfile(profile.id)
                                                    },
                                                    modifier = Modifier.size(32.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Rounded.DeleteOutline,
                                                        contentDescription = "Remove config",
                                                        tint = StatusFailed,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                            }
                                        }
                                    },
                                    onClick = {
                                        configDropdownExpanded = false
                                        if (!selected) onSelectProfile(profile.id)
                                    }
                                )
                            }
                        }

                        HorizontalDivider()

                        DropdownMenuItem(
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Rounded.UploadFile,
                                    contentDescription = null,
                                    tint = cs.primary
                                )
                            },
                            text = {
                                Text(
                                    text = "+ Add more",
                                    fontWeight = FontWeight.Bold,
                                    color = cs.primary
                                )
                            },
                            onClick = {
                                configDropdownExpanded = false
                                showUploadDialog = true
                            }
                        )
                    }
                }
            }
        }

        // Tor Connected Country Tile (Directly Below Proton Dropdown Tile)
        item(key = "tor_country_tile") {
            ExpressiveCard(color = Layer.pane, contentColor = cs.onSurface, radius = Radius.card) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    BrandSvgBadge(assetPath = "icons/tor.svg")

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Tor Connected Country",
                            style = Expressive.title(15.sp),
                            color = cs.onSurface
                        )
                        Text(
                            text = if (tor.active) {
                                listOfNotNull(tor.city, tor.exitIp).joinToString(" · ").ifEmpty { "Automatic exit circuit" }
                            } else {
                                "Enable Tor Proxy above to connect"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = cs.onSurfaceVariant
                        )
                    }

                    Pill(
                        text = if (tor.active) formatCountryDisplay(tor.country, tor.countryCode) else "Offline",
                        container = if (tor.active) cs.tertiaryContainer else Layer.field,
                        content = if (tor.active) cs.onTertiaryContainer else cs.onSurfaceVariant
                    )
                }
            }
        }

        // Section Header: Per-Service Split Tunneling (Hotspot + Exit Node at top)
        item(key = "targets_header") {
            val protonCount = targets.count { it.mode == "protonvpn" }
            val torCount = targets.count { it.mode == "tor" }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Per-Service Routing",
                        style = Expressive.title(16.sp),
                        color = cs.onSurface
                    )
                    Text(
                        text = "Hotspot, Exit Node & services (ProtonVPN / Tor / Direct)",
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onSurfaceVariant
                    )
                }
                Pill(
                    text = "$protonCount WG · $torCount Tor",
                    container = cs.secondaryContainer,
                    content = cs.onSecondaryContainer
                )
            }
        }

        itemsIndexed(targets, key = { _, target -> target.id }) { _, target ->
            ServiceRouteTile(
                target = target,
                freeTier = proton.freeTier,
                isBusy = isBusy,
                isThisBusy = busyKey == "route:${target.id}",
                onToggleProton = { checked ->
                    onSetRoute(target.id, if (checked) "protonvpn" else "direct")
                },
                onToggleTor = { checked ->
                    onSetRoute(target.id, if (checked) "tor" else "direct")
                }
            )
        }

        item(key = "bottom_spacer") {
            Spacer(Modifier.height(24.dp))
        }
    }

    // WireGuard Config Upload / Import Dialog
    if (showUploadDialog) {
        AlertDialog(
            onDismissRequest = { showUploadDialog = false },
            title = {
                Text("Add ProtonVPN WireGuard Config", style = Expressive.title(17.sp))
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = { confPickerLauncher.launch(arrayOf("*/*")) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Rounded.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(uploadFileName.ifBlank { "Pick .conf file (e.g. tinapple-US-FREE-15.conf)" })
                    }

                    OutlinedTextField(
                        value = uploadFileName,
                        onValueChange = { uploadFileName = it },
                        label = { Text("Config Filename") },
                        placeholder = { Text("tinapple-US-FREE-15.conf") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = uploadConfigText,
                        onValueChange = { uploadConfigText = it },
                        label = { Text("WireGuard Config Content") },
                        placeholder = { Text("[Interface]\nPrivateKey = ...\n[Peer]\nEndpoint = ...") },
                        minLines = 5,
                        maxLines = 8,
                        textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Activate config immediately", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = connectAfterUpload,
                            onCheckedChange = { connectAfterUpload = it }
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = uploadConfigText.isNotBlank() && !isBusy,
                    onClick = {
                        val name = uploadFileName.trim().ifBlank { "proton-custom.conf" }
                        onUploadConfig(name, uploadConfigText, connectAfterUpload)
                        showUploadDialog = false
                        uploadFileName = ""
                        uploadConfigText = ""
                    }
                ) {
                    Text("Import")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUploadDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun MasterTunnelTile(
    name: String,
    subtitle: String,
    iconAsset: String,
    active: Boolean,
    reloading: Boolean,
    toggling: Boolean,
    reloadEnabled: Boolean,
    toggleEnabled: Boolean,
    onReload: () -> Unit,
    onToggle: (Boolean) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    ExpressiveCard(color = Layer.pane, contentColor = cs.onSurface, radius = Radius.card) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: Icon + Name
            BrandSvgBadge(assetPath = iconAsset)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = name,
                        style = Expressive.title(16.sp),
                        color = cs.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (active) StatusRunning else cs.outlineVariant)
                    )
                }
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = cs.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Right: Reload + Toggle
            IconButton(
                onClick = onReload,
                enabled = reloadEnabled,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Layer.field)
            ) {
                if (reloading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Icon(
                        painter = painterResource(R.drawable.rounded_refresh),
                        contentDescription = "Reload $name",
                        tint = if (reloadEnabled) cs.primary else cs.onSurfaceVariant.copy(alpha = 0.4f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(Modifier.width(8.dp))

            if (toggling) {
                CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
            } else {
                Switch(
                    checked = active,
                    onCheckedChange = onToggle,
                    enabled = toggleEnabled,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = cs.primary,
                        checkedTrackColor = cs.primaryContainer
                    )
                )
            }
        }
    }
}

@Composable
private fun ServiceRouteTile(
    target: NetworkerTarget,
    freeTier: Boolean,
    isBusy: Boolean,
    isThisBusy: Boolean,
    onToggleProton: (Boolean) -> Unit,
    onToggleTor: (Boolean) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val context = LocalContext.current
    val modeLabel = when (target.mode) {
        "protonvpn" -> "ProtonVPN"
        "tor" -> "Tor Proxy"
        else -> "Direct Network"
    }
    val modeContainer = when (target.mode) {
        "protonvpn" -> cs.primaryContainer
        "tor" -> cs.tertiaryContainer
        else -> Layer.field
    }
    val modeContent = when (target.mode) {
        "protonvpn" -> cs.onPrimaryContainer
        "tor" -> cs.onTertiaryContainer
        else -> cs.onSurfaceVariant
    }
    val showP2pWarning = target.p2pRisk && (target.p2pWarningActive || freeTier)

    ExpressiveCard(color = Layer.pane, contentColor = cs.onSurface, radius = Radius.card) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (target.id) {
                    "hotspot" -> IconBadge(R.drawable.rounded_wifi, Tint.PRIMARY)
                    "exit_node" -> IconBadge(R.drawable.rounded_public, Tint.PRIMARY)
                    else -> {
                        val iconAsset = ServiceBrandIconResolver.getIconAssetPath(target.id, target.name)
                        if (iconAsset != null) {
                            BrandSvgBadge(assetPath = iconAsset, context = context)
                        } else {
                            IconBadge(R.drawable.rounded_terminal, Tint.SECONDARY)
                        }
                    }
                }

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = target.name,
                            style = Expressive.title(15.sp),
                            color = cs.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Pill(text = modeLabel, container = modeContainer, content = modeContent)
                    }
                    Text(
                        text = target.subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                if (isThisBusy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                }
            }

            if (!target.extraNote.isNullOrBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(cs.primaryContainer.copy(alpha = 0.25f))
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Rounded.Info, contentDescription = null, tint = cs.primary, modifier = Modifier.size(15.dp))
                    Text(
                        text = target.extraNote,
                        style = MaterialTheme.typography.labelSmall,
                        color = cs.onSurface
                    )
                }
            }

            if (showP2pWarning) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (target.p2pWarningActive) Color(0xFF4A2E07).copy(alpha = 0.85f)
                            else Color(0xFF3A280A).copy(alpha = 0.45f)
                        )
                        .border(
                            width = 1.dp,
                            color = Color(0xFFF59E0B).copy(alpha = if (target.p2pWarningActive) 0.7f else 0.35f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Rounded.WarningAmber, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(15.dp))
                    Text(
                        text = if (target.id == "exit_node") {
                            "Exit node ProtonVPN on the free plan does not support P2P connections and will block torrenting."
                        } else {
                            target.p2pWarning ?: "ProtonVPN does not support P2P connections in the free tier."
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFFFDE68A)
                    )
                }
            }

            // Two Mutually Exclusive Toggles: ProtonVPN & Tor
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Layer.field.copy(alpha = 0.65f))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "ProtonVPN",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (target.mode == "protonvpn") cs.primary else cs.onSurfaceVariant,
                        fontWeight = if (target.mode == "protonvpn") FontWeight.Bold else FontWeight.Medium
                    )
                    Switch(
                        checked = target.mode == "protonvpn",
                        enabled = !isBusy,
                        onCheckedChange = onToggleProton
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Tor",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (target.mode == "tor") cs.tertiary else cs.onSurfaceVariant,
                        fontWeight = if (target.mode == "tor") FontWeight.Bold else FontWeight.Medium
                    )
                    Switch(
                        checked = target.mode == "tor",
                        enabled = !isBusy,
                        onCheckedChange = onToggleTor
                    )
                }
            }
        }
    }
}

@Composable
private fun BrandSvgBadge(
    assetPath: String,
    context: android.content.Context = LocalContext.current
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Layer.field),
        contentAlignment = Alignment.Center
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("file:///android_asset/$assetPath")
                .build(),
            contentDescription = null,
            modifier = Modifier.size(26.dp)
        )
    }
}
