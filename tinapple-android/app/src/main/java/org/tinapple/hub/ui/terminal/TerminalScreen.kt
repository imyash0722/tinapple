package org.tinapple.hub.ui.terminal

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.ui.Layer
import org.tinapple.hub.ui.theme.Expressive
import org.tinapple.hub.ui.theme.StatusFailed
import org.tinapple.hub.ui.theme.StatusRunning

@Composable
fun TerminalScreen(
    serverOrigin: String,
    hostname: String,
    viewModel: TerminalViewModel,
    onBack: () -> Unit,
    showBackButton: Boolean = true,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    var inputCommand by remember { mutableStateOf("") }
    val cs = MaterialTheme.colorScheme
    val haptics = LocalHapticFeedback.current

    // Auto connect on first composition
    LaunchedEffect(serverOrigin) {
        if (uiState.status == ConnectionStatus.DISCONNECTED || uiState.status == ConnectionStatus.FAILED) {
            viewModel.connect(serverOrigin)
        }
    }

    // Auto scroll to bottom when new terminal lines arrive
    LaunchedEffect(uiState.lines.size) {
        if (uiState.lines.isNotEmpty()) {
            listState.scrollToItem(uiState.lines.size - 1)
        }
    }

    Surface(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .imePadding(),
        color = Color(0xFF090A0F)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // 1. Top Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (showBackButton) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.ArrowBack,
                            contentDescription = "Back",
                            tint = cs.onSurface
                        )
                    }

                    Spacer(modifier = Modifier.width(6.dp))
                } else {
                    Spacer(modifier = Modifier.width(4.dp))
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "SSH PTY · ${hostname.ifBlank { "pineapple-server" }}",
                        style = Expressive.title(16.sp),
                        fontWeight = FontWeight.Bold,
                        color = cs.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        val statusColor = when (uiState.status) {
                            ConnectionStatus.CONNECTED -> StatusRunning
                            ConnectionStatus.CONNECTING -> Color(0xFFEAB308)
                            ConnectionStatus.DISCONNECTED, ConnectionStatus.FAILED -> StatusFailed
                        }
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(statusColor)
                        )
                        Text(
                            text = uiState.statusMessage,
                            style = Expressive.title(11.sp),
                            color = cs.onSurfaceVariant,
                            maxLines = 1
                        )
                    }
                }

                // Action: Clear Terminal Output
                IconButton(
                    onClick = {
                        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.clearScreen()
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.DeleteOutline,
                        contentDescription = "Clear",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(19.dp)
                    )
                }

                // Action: Reconnect Session
                IconButton(
                    onClick = {
                        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.connect(serverOrigin)
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Refresh,
                        contentDescription = "Reconnect",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(19.dp)
                    )
                }
            }

            // 2. Terminal Screen Display (Monospace Output Buffer)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFF040609))
                    .border(1.dp, Color(0xFF1E2330), RoundedCornerShape(14.dp))
                    .padding(10.dp)
            ) {
                if (uiState.lines.isEmpty()) {
                    Text(
                        text = "Interactive PTY Session ready.\nConnecting to /bin/bash on ${uiState.serverHost}...\nType commands or use accessory keys below.",
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        lineHeight = 17.sp
                    )
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 4.dp)
                    ) {
                        items(uiState.lines) { line ->
                            Text(
                                text = line,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 3. Terminus / Termius Accessory Key Bar (Horizontal Scrollable Strip)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 10.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // ESC Key
                TerminusKeyButton(
                    label = "ESC",
                    onClick = { viewModel.sendKey("\u001b") }
                )

                // TAB Key
                TerminusKeyButton(
                    label = "TAB",
                    onClick = { viewModel.sendKey("\t") }
                )

                // CTRL Sticky Modifier Toggle
                TerminusKeyButton(
                    label = "CTRL",
                    isActive = uiState.isCtrlActive,
                    onClick = { viewModel.toggleCtrl() }
                )

                // ALT Sticky Modifier Toggle
                TerminusKeyButton(
                    label = "ALT",
                    isActive = uiState.isAltActive,
                    onClick = { viewModel.toggleAlt() }
                )

                // Direct Ctrl+C (SIGINT)
                TerminusKeyButton(
                    label = "^C",
                    onClick = { viewModel.sendCtrlC() },
                    tintColor = StatusFailed
                )

                // Direct Ctrl+D (EOF)
                TerminusKeyButton(
                    label = "^D",
                    onClick = { viewModel.sendCtrlD() }
                )

                // Direct Ctrl+Z
                TerminusKeyButton(
                    label = "^Z",
                    onClick = { viewModel.sendCtrlZ() }
                )

                // Direct Ctrl+L (Clear)
                TerminusKeyButton(
                    label = "^L",
                    onClick = { viewModel.sendCtrlL() }
                )

                // Navigation Arrows
                TerminusKeyButton(
                    label = "▲",
                    onClick = { viewModel.sendKey("\u001b[A") }
                )
                TerminusKeyButton(
                    label = "▼",
                    onClick = { viewModel.sendKey("\u001b[B") }
                )
                TerminusKeyButton(
                    label = "◄",
                    onClick = { viewModel.sendKey("\u001b[D") }
                )
                TerminusKeyButton(
                    label = "►",
                    onClick = { viewModel.sendKey("\u001b[C") }
                )

                // Punctuation & Shell Operators
                TerminusKeyButton(label = "|", onClick = { viewModel.sendKey("|") })
                TerminusKeyButton(label = "/", onClick = { viewModel.sendKey("/") })
                TerminusKeyButton(label = "\\", onClick = { viewModel.sendKey("\\") })
                TerminusKeyButton(label = "-", onClick = { viewModel.sendKey("-") })
                TerminusKeyButton(label = "_", onClick = { viewModel.sendKey("_") })
                TerminusKeyButton(label = "~", onClick = { viewModel.sendKey("~") })
                TerminusKeyButton(label = "^", onClick = { viewModel.sendKey("^") })
                TerminusKeyButton(label = "$", onClick = { viewModel.sendKey("$") })
                TerminusKeyButton(label = ":", onClick = { viewModel.sendKey(":") })
                TerminusKeyButton(label = ";", onClick = { viewModel.sendKey(";") })
                TerminusKeyButton(label = "\"", onClick = { viewModel.sendKey("\"") })
                TerminusKeyButton(label = "'", onClick = { viewModel.sendKey("'") })
                TerminusKeyButton(label = "`", onClick = { viewModel.sendKey("`") })
                TerminusKeyButton(label = "&", onClick = { viewModel.sendKey("&") })
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 4. Command Input Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF131722))
                        .border(1.dp, Color(0xFF283044), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (inputCommand.isEmpty()) {
                        Text(
                            text = "Type command or input...",
                            color = Color(0xFF64748B),
                            fontSize = 13.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    BasicTextField(
                        value = inputCommand,
                        onValueChange = { inputCommand = it },
                        modifier = Modifier.fillMaxWidth(),
                        textStyle = TextStyle(
                            color = Color(0xFFF1F5F9),
                            fontSize = 13.sp,
                            fontFamily = FontFamily.Monospace
                        ),
                        cursorBrush = SolidColor(cs.primary),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(
                            onSend = {
                                if (inputCommand.isNotEmpty()) {
                                    viewModel.sendCommand(inputCommand)
                                    inputCommand = ""
                                }
                            }
                        )
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Send Button
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(cs.primary)
                        .clickable {
                            if (inputCommand.isNotEmpty()) {
                                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.sendCommand(inputCommand)
                                inputCommand = ""
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Send,
                        contentDescription = "Send",
                        tint = cs.onPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}

/** Terminus / Termius styled accessory key chip with sticky active state */
@Composable
private fun TerminusKeyButton(
    label: String,
    onClick: () -> Unit,
    isActive: Boolean = false,
    tintColor: Color? = null
) {
    val haptics = LocalHapticFeedback.current
    val cs = MaterialTheme.colorScheme

    val bg = if (isActive) {
        cs.primary
    } else {
        Color(0xFF181C26)
    }

    val textCol = if (isActive) {
        cs.onPrimary
    } else {
        tintColor ?: Color(0xFFE2E8F0)
    }

    val borderCol = if (isActive) {
        cs.primary
    } else {
        Color(0xFF2B3245)
    }

    Box(
        modifier = Modifier
            .height(34.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, borderCol, RoundedCornerShape(8.dp))
            .clickable {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .padding(horizontal = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = textCol
        )
    }
}
