package org.tinapple.hub.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.model.CanvasViewport
import org.tinapple.hub.model.CanvasWidget
import kotlin.math.roundToInt

// Matugen Dark Theme Palette Tokens (Matching Web UI)
val DarkBackground = Color(0xFF050A16)
val CardBackground = Color(0xFF0F172A)
val CardBorder = Color(0x26FFFFFF)
val AccentGold = Color(0xFFF59E0B)
val AccentPurple = Color(0xFFAA74E8)
val AccentEmerald = Color(0xFF10B981)

@Composable
fun TinappleDraggableCanvas(
    widgets: List<CanvasWidget>,
    isEditMode: Boolean,
    onWidgetMoved: (String, Float, Float) -> Unit,
    modifier: Modifier = Modifier
) {
    var panX by remember { mutableFloatStateOf(0f) }
    var panY by remember { mutableFloatStateOf(0f) }
    var zoom by remember { mutableFloatStateOf(1f) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .pointerInput(Unit) {
                // Background transform gestures: pan & pinch-to-zoom
                detectTransformGestures { _, pan, gestureZoom, _ ->
                    panX += pan.x
                    panY += pan.y
                    zoom = (zoom * gestureZoom).coerceIn(0.5f, 1.8f)
                }
            }
    ) {
        // 2D World Surface
        Box(
            modifier = Modifier
                .size(3200.dp, 2200.dp)
                .graphicsLayer(
                    scaleX = zoom,
                    scaleY = zoom,
                    translationX = panX,
                    translationY = panY
                )
        ) {
            widgets.filter { it.visible }.forEach { widget ->
                var offsetX by remember(widget.id) { mutableFloatStateOf(widget.x) }
                var offsetY by remember(widget.id) { mutableFloatStateOf(widget.y) }

                Box(
                    modifier = Modifier
                        .offset { IntOffset(offsetX.roundToInt(), offsetY.roundToInt()) }
                        .size(widget.w.dp, widget.h.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(CardBackground)
                        .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
                        .pointerInput(isEditMode) {
                            if (isEditMode) {
                                detectDragGestures { change, dragAmount ->
                                    change.consume()
                                    offsetX += dragAmount.x / zoom
                                    offsetY += dragAmount.y / zoom
                                    onWidgetMoved(widget.id, offsetX, offsetY)
                                }
                            }
                        }
                        .padding(16.dp)
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Header
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = widget.icon,
                                    fontSize = 18.sp,
                                    modifier = Modifier.padding(end = 8.dp)
                                )
                                Text(
                                    text = widget.title,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            if (isEditMode) {
                                Text(
                                    text = "DRAG",
                                    color = AccentGold,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Widget Content Preview
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF030712))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = widget.description ?: "Appliance Node: ${widget.type}",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }

        // Floating HUD Control Bar (Bottom-Right Radar & Zoom)
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xE6020617))
                .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = { zoom = (zoom - 0.15f).coerceIn(0.5f, 1.8f) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text("-", color = Color.White, fontFamily = FontFamily.Monospace)
            }
            Text(
                text = "${(zoom * 100).roundToInt()}%",
                color = Color.White,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
            Button(
                onClick = { zoom = (zoom + 0.15f).coerceIn(0.5f, 1.8f) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text("+", color = Color.White, fontFamily = FontFamily.Monospace)
            }
            Button(
                onClick = {
                    panX = 0f
                    panY = 0f
                    zoom = 1f
                },
                colors = ButtonDefaults.buttonColors(containerColor = AccentGold),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text("RESET", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            }
        }
    }
}
