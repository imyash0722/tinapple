package org.tinapple.hub.network

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

object DiscoveryEngine {
    const val DEFAULT_TAILSCALE_HOST = "100.67.207.60"
    private const val PREFS_NAME = "tinapple_network_prefs"
    private const val KEY_SERVER_ORIGIN = "cached_server_origin"

    val DEFAULT_CANDIDATES = listOf(
        "http://192.168.1.103:8088",                 // Local Wi-Fi LAN IP
        "http://100.67.207.60:8088",                  // Direct Tailscale IP
        "https://tinapple-server.tail3dee69.ts.net",  // Tailscale HTTPS Domain
        "http://tinapple-server:8088",                // Local Hostname
        "http://192.168.4.1:8088"                     // AP Hotspot
    )

    private val probeClient = OkHttpClient.Builder()
        .connectTimeout(1500, TimeUnit.MILLISECONDS)
        .readTimeout(1500, TimeUnit.MILLISECONDS)
        .build()

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getCachedServerOrigin(context: Context): String =
        getPrefs(context).getString(KEY_SERVER_ORIGIN, null) ?: DEFAULT_CANDIDATES.first()

    fun setCustomServerOrigin(context: Context, origin: String) {
        val clean = origin.trim().trimEnd('/')
        getPrefs(context).edit().putString(KEY_SERVER_ORIGIN, clean).apply()
    }

    suspend fun discoverActiveServer(context: Context): String = withContext(Dispatchers.IO) {
        val cached = getPrefs(context).getString(KEY_SERVER_ORIGIN, null)
        if (!cached.isNullOrBlank() && probeHealth(cached)) {
            return@withContext cached
        }

        val candidates = mutableListOf<String>()
        if (!cached.isNullOrBlank() && !candidates.contains(cached)) {
            candidates.add(cached)
        }
        for (c in DEFAULT_CANDIDATES) {
            if (!candidates.contains(c)) candidates.add(c)
        }

        val deferredProbes = candidates.map { url ->
            async {
                val ok = probeHealth(url)
                if (ok) url else null
            }
        }

        val results = deferredProbes.awaitAll()
        val working = results.firstOrNull { it != null } ?: cached ?: DEFAULT_CANDIDATES.first()

        getPrefs(context).edit().putString(KEY_SERVER_ORIGIN, working).apply()
        working
    }

    private fun probeHealth(baseUrl: String): Boolean {
        return try {
            val clean = baseUrl.trimEnd('/')
            val request = Request.Builder()
                .url("$clean/health")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            probeClient.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (_: Exception) {
            false
        }
    }
}
