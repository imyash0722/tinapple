package org.tinapple.hub

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import org.tinapple.hub.ui.components.AppHeader
import org.tinapple.hub.ui.components.AppearanceCard
import org.tinapple.hub.ui.components.ProtonVpnCard
import org.tinapple.hub.ui.components.ServicesSection
import org.tinapple.hub.ui.theme.StatusFailed
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleDarkBackground
import org.tinapple.hub.ui.theme.TinappleSurfaceLow
import org.tinapple.hub.ui.theme.TinappleTheme
import org.tinapple.hub.ui.viewmodel.TinappleViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: TinappleViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val uiState by viewModel.uiState.collectAsState()

            TinappleTheme(
                primaryColor = Color(uiState.selectedPalette.primaryHex),
                secondaryColor = Color(uiState.selectedPalette.secondaryHex)
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = TinappleDarkBackground
                ) {
                    MainScreen(
                        viewModel = viewModel,
                        onOpenPortal = ::openBrowserUrl
                    )
                }
            }
        }
    }

    private fun openBrowserUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Unable to launch browser for $url", Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
private fun MainScreen(
    viewModel: TinappleViewModel,
    onOpenPortal: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    val wallpaperUrl = uiState.selectedWallpaper.let { item ->
        val origin = uiState.activeServerOrigin.trimEnd('/')
        when {
            item.url.startsWith("http") -> item.url
            item.url.isNotBlank() -> "$origin${if (item.url.startsWith("/")) "" else "/"}${item.url}"
            item.file.isNotBlank() -> "$origin/wallpapers/${item.file}"
            else -> null
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Dynamic Backdrop Wallpaper
        if (!wallpaperUrl.isNullOrBlank()) {
            AsyncImage(
                model = wallpaperUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                alpha = 0.22f
            )

            // Scrim overlay for high contrast readability
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                TinappleDarkBackground.copy(alpha = 0.65f),
                                TinappleDarkBackground.copy(alpha = 0.88f),
                                TinappleDarkBackground
                            )
                        )
                    )
            )
        }

        // Main Scrollable Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Server Node Header
            AppHeader(
                systemInfo = uiState.systemInfo,
                activeServerOrigin = uiState.activeServerOrigin,
                isRefreshing = uiState.isRefreshing || uiState.isDiscovering,
                onRefresh = { viewModel.refreshAll(forceDiscovery = true) }
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Proton VPN Exit Node Toggle
            ProtonVpnCard(
                status = uiState.protonStatus,
                isToggling = uiState.isTogglingProton,
                onToggle = { active -> viewModel.toggleProton(active) }
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Appearance & Themes Section
            AppearanceCard(
                currentPalette = uiState.selectedPalette,
                wallpapers = uiState.wallpapers,
                selectedWallpaper = uiState.selectedWallpaper,
                serverOrigin = uiState.activeServerOrigin,
                onSelectPalette = { viewModel.selectPalette(it) },
                onSelectWallpaper = { viewModel.selectWallpaper(it) }
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Services & Daemons Section
            ServicesSection(
                services = uiState.services,
                togglingServiceMap = uiState.togglingServiceMap,
                getPortalUrl = { svc -> viewModel.apiClient.getServicePortalUrl(svc) },
                onToggleService = { svc, start -> viewModel.toggleService(svc, start) },
                onOpenPortal = onOpenPortal
            )

            Spacer(modifier = Modifier.height(36.dp))
        }

        // Floating Error Banner
        AnimatedVisibility(
            visible = uiState.errorMessage != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(16.dp)
        ) {
            uiState.errorMessage?.let { errorText ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(TinappleSurfaceLow)
                        .border(1.dp, StatusFailed.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.ErrorOutline,
                            contentDescription = null,
                            tint = StatusFailed,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = errorText,
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                            maxLines = 3
                        )
                        IconButton(
                            onClick = { viewModel.clearErrorMessage() },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Close,
                                contentDescription = "Dismiss",
                                tint = TextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
