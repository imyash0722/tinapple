package org.tinapple.hub.bridge

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.tinapple.hub.model.CanvasWidget

/**
 * JavaScript to Android Kotlin Bridge Interface
 * Handles real-time widget drag events, haptic feedback, and Android system intents.
 */
class TinappleBridge(
    private val context: Context,
    private val onWidgetUpdate: ((String, Float, Float) -> Unit)? = null
) {
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    @JavascriptInterface
    fun onWidgetMoved(widgetId: String, x: Float, y: Float) {
        onWidgetUpdate?.invoke(widgetId, x, y)
    }

    @JavascriptInterface
    fun onWidgetResized(widgetId: String, w: Float, h: Float) {
        // Handle widget resize event in native Kotlin layer
    }

    @JavascriptInterface
    fun onWidgetSaved(widgetJson: String) {
        // Persist or synchronize widget data
    }

    @JavascriptInterface
    fun onLayoutModeChanged(mode: String) {
        // Handle canvas vs grid mode switch in native layout
    }

    @JavascriptInterface
    fun performHapticFeedback(type: String) {
        if (vibrator == null || !vibrator.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val effect = when (type) {
                "heavy" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                "medium" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                "selection" -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                else -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
            }
            vibrator.vibrate(effect)
        } else {
            val duration = when (type) {
                "heavy" -> 60L
                "medium" -> 35L
                else -> 15L
            }
            vibrator.vibrate(duration)
        }
    }

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }
}
