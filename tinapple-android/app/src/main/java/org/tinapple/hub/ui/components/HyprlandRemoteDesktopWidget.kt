package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.R
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.ui.ExpressiveCard
import org.tinapple.hub.ui.IconBadge
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.Pill
import org.tinapple.hub.ui.Radius
import org.tinapple.hub.ui.Tint
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.utils.ClientAppLauncher

@Composable
fun HyprlandRemoteDesktopWidget(
    serverOrigin: String,
    onOpenTerminal: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme

    val cleanHost = if (serverOrigin.contains("taildb42a2.ts.net")) {
        DiscoveryEngine.DEFAULT_TAILSCALE_HOST
    } else {
        serverOrigin
            .removePrefix("http://")
            .removePrefix("https://")
            .removeSuffix(":8088")
            .ifEmpty { DiscoveryEngine.DEFAULT_TAILSCALE_HOST }
    }

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
            // Header Row: Desktop Icon + Title + Live indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconBadge(
                    icon = R.drawable.rounded_desktop_windows,
                    tint = Tint.PRIMARY
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Hyprland Remote Desktop",
                        style = Expressive.title(17.sp),
                        fontWeight = FontWeight.Bold,
                        color = cs.onSurface
                    )
                    Text(
                        text = "HEADLESS-1 · 1080p Virtual Display",
                        style = Expressive.title(12.sp),
                        color = cs.onSurfaceVariant
                    )
                }

                // Status Indicator Pill
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(StatusRunning.copy(alpha = 0.15f))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(StatusRunning)
                        )
                        Text(
                            text = "Port 5900",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = StatusRunning
                        )
                    }
                }
            }

            // Specs badges row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Pill(
                    text = "1920x1080 @ 60Hz",
                    container = cs.primaryContainer,
                    content = cs.onPrimaryContainer
                )
                Pill(
                    text = "wayvnc / RFB 3.8",
                    container = Layer.field,
                    content = cs.onSurface
                )
                Pill(
                    text = "xdg-desktop-portal",
                    container = cs.tertiaryContainer,
                    content = cs.onTertiaryContainer
                )
            }

            // Dual Action Buttons Row: Connect VNC + Open SSH Terminal
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Primary: Connect Remote Desktop
                Button(
                    onClick = {
                        ClientAppLauncher.launchHyprlandVnc(context, cleanHost)
                    },
                    modifier = Modifier
                        .weight(1.3f)
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = cs.primary,
                        contentColor = cs.onPrimary
                    )
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_desktop_windows),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Connect VNC",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Secondary: Open SSH / PTY Terminal
                OutlinedButton(
                    onClick = onOpenTerminal,
                    modifier = Modifier
                        .weight(1.1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = cs.onSurface
                    )
                ) {
                    Icon(
                        painter = painterResource(R.drawable.rounded_terminal),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Terminal",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
