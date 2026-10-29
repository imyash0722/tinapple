package org.tinapple.hub.model

/**
 * Universal Tinapple Homarr Canvas Data Model (Kotlin)
 * 100% Schema-Compatible with TypeScript definitions in tinapple-hub/src/types/canvas.ts
 */

enum class WidgetCategory {
    TELEMETRY,
    NETWORK,
    MEDIA,
    STORAGE,
    SYSTEM,
    CUSTOM
}

data class WidgetCustomLink(
    val id: String,
    val name: String,
    val url: String,
    val icon: String? = "🔗"
)

data class WidgetCustomConfig(
    val url: String? = null,
    val markdown: String? = null,
    val refreshSeconds: Int? = 30,
    val links: List<WidgetCustomLink> = emptyList(),
    val targetPort: Int? = null,
    val pingEndpoint: String? = null
)

data class CanvasWidget(
    val id: String,
    val type: String,
    val title: String,
    val description: String? = null,
    val icon: String = "🧩",
    val category: String = "system",
    var x: Float,
    var y: Float,
    var w: Float,
    var h: Float,
    var zIndex: Int = 1,
    var visible: Boolean = true,
    val color: String? = "#AA5CC3",
    val colSpan: Int? = 6,
    val customConfig: WidgetCustomConfig? = null
)

data class CanvasViewport(
    var panX: Float = 0f,
    var panY: Float = 0f,
    var zoom: Float = 1.0f
)

data class CanvasState(
    val version: Int = 2,
    val viewport: CanvasViewport = CanvasViewport(),
    val layoutMode: String = "canvas",
    val snapToGrid: Boolean = true,
    val gridSize: Int = 20,
    val widgets: List<CanvasWidget> = emptyList()
)
