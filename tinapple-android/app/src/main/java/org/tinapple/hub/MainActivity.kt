package org.tinapple.hub

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.InputStream
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import org.tinapple.hub.bridge.TinappleBridge

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null

    // Default Appliance Server URLs (Tailscale, Local Hotspot, or LAN)
    companion object {
        const val PRIMARY_HUB_URL = "http://100.108.215.120:8088"
        const val HOTSPOT_HUB_URL = "http://192.168.4.1:8088"
        const val MDNS_HUB_URL = "http://pineapple-server:8088"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on for dashboard kiosk monitoring & fullscreen immersion
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        setContent {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        webView = this
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            allowFileAccess = true
                            allowContentAccess = true
                            useWideViewPort = true
                            loadWithOverviewMode = true
                            setSupportZoom(true)
                            builtInZoomControls = false
                            displayZoomControls = false
                            cacheMode = WebSettings.LOAD_DEFAULT
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        }

                        // Register Kotlin Native Bridge
                        addJavascriptInterface(TinappleBridge(context), "TinappleBridge")

                        webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): WebResourceResponse? {
                                val path = request?.url?.path ?: return null
                                if (path.startsWith("/assets/") || path.startsWith("/icons/") || path.startsWith("/wallpapers/") || path == "/" || path == "/index.html") {
                                    val assetPath = "web" + if (path == "/") "/index.html" else path
                                    try {
                                        val stream: InputStream = context.assets.open(assetPath)
                                        val mimeType = when {
                                            path.endsWith(".html") || path == "/" -> "text/html"
                                            path.endsWith(".js") -> "application/javascript"
                                            path.endsWith(".css") -> "text/css"
                                            path.endsWith(".svg") -> "image/svg+xml"
                                            path.endsWith(".png") -> "image/png"
                                            path.endsWith(".woff2") -> "font/woff2"
                                            path.endsWith(".json") -> "application/json"
                                            else -> "text/plain"
                                        }
                                        return WebResourceResponse(mimeType, "UTF-8", stream)
                                    } catch (_: Exception) {}
                                }
                                return super.shouldInterceptRequest(view, request)
                            }

                            override fun onReceivedError(
                                view: WebView?,
                                errorCode: Int,
                                description: String?,
                                failingUrl: String?
                            ) {
                                // Fallback to Hotspot gateway if Tailscale IP is unreachable
                                if (failingUrl?.startsWith(PRIMARY_HUB_URL) == true) {
                                    view?.loadUrl(HOTSPOT_HUB_URL)
                                }
                            }
                        }

                        webChromeClient = WebChromeClient()
                        loadUrl(PRIMARY_HUB_URL)
                    }
                }
            )
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView?.canGoBack() == true) {
            webView?.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        webView?.destroy()
        super.onDestroy()
    }
}
