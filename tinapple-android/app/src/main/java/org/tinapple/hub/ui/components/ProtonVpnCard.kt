package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.data.ProtonStatus
import org.tinapple.hub.ui.theme.StatusDisabled
import org.tinapple.hub.ui.theme.StatusDisabledBg
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.theme.StatusRunningBg
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleSurfaceLow

@Composable
fun ProtonVpnCard(
    status: ProtonStatus,
    isToggling: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val isActive = status.active || status.status == "active"
    val accent = if (isActive) Color(0xFF10B981) else Color(0xFF8B5CF6)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(TinappleSurfaceLow)
            .border(1.dp, TinappleBorder, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(accent.copy(alpha = 0.15f))
                        .border(1.dp, accent.copy(alpha = 0.3f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Shield,
                        contentDescription = "VPN Shield",
                        tint = accent,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Proton VPN Exit Node",
                            color = TextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isActive) StatusRunningBg else StatusDisabledBg)
                                .border(1.dp, if (isActive) StatusRunning.copy(alpha = 0.3f) else StatusDisabled.copy(alpha = 0.3f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = if (isActive) "Active" else "Off",
                                color = if (isActive) StatusRunning else TextMuted,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    val detail = when {
                        isActive && !status.server.isNullOrBlank() -> "${status.server} • ${status.country ?: "WireGuard"}"
                        isActive && !status.ip.isNullOrBlank() -> "Exit IP: ${status.ip}"
                        isActive -> "Encrypted WireGuard Tunnel Active"
                        else -> "Local Direct Gateway (Unencrypted)"
                    }

                    Text(
                        text = detail,
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            if (isToggling) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            } else {
                Switch(
                    checked = isActive,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = StatusRunning,
                        uncheckedThumbColor = Color(0xFF64748B),
                        uncheckedTrackColor = Color(0xFF1E293B)
                    )
                )
            }
        }
    }
}
