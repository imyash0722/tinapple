package org.tinapple.hub.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import org.tinapple.hub.data.ServiceItem

sealed class LaunchResult {
    data class LaunchedApp(val packageName: String, val appLabel: String) : LaunchResult()
    data class OpenedWeb(val url: String) : LaunchResult()
    data class Failed(val reason: String) : LaunchResult()
    object NotFound : LaunchResult()
}

data class ClientAppInfo(
    val packageName: String,
    val appLabel: String
)

object ClientAppLauncher {

    // Candidate package list for each homelab service, ordered by preference
    private val SERVICE_PACKAGE_CANDIDATES: Map<String, List<String>> = mapOf(
        "suwayomi" to listOf(
            "io.github.aaronbamblett.tsumiru",
            "io.github.aaronbamblett.tsumiru.dev",
            "app.tsumiru.Tsumiru",
            "app.tsumiru",
            "org.suwayomi.tsumiru",
            "io.github.suwayomi.tsumiru",
            "org.keiyoushi.tachiyomi",
            "eu.kanade.tachiyomi",
            "tachiyomi.mihon",
            "app.suwayomi.tachidesk"
        ),
        "tsumiru" to listOf(
            "io.github.aaronbamblett.tsumiru",
            "io.github.aaronbamblett.tsumiru.dev",
            "app.tsumiru.Tsumiru",
            "app.tsumiru",
            "org.suwayomi.tsumiru",
            "io.github.suwayomi.tsumiru",
            "org.keiyoushi.tachiyomi",
            "eu.kanade.tachiyomi",
            "tachiyomi.mihon"
        ),
        "jellyfin" to listOf(
            "com.edde746.plezy",
            "app.plezy",
            "com.plezy",
            "dev.jdtech.jellyfin",
            "org.jellyfin.mobile"
        ),
        "plezy" to listOf(
            "com.edde746.plezy",
            "app.plezy",
            "com.plezy",
            "dev.jdtech.jellyfin",
            "org.jellyfin.mobile"
        ),
        "navidrome" to listOf(
            "com.vibrdrome.app",
            "com.vibrdrome",
            "app.vibrdrome",
            "app.symfonium.music.player",
            "github.daneren2005.dsub",
            "com.substreamer.substreamer",
            "ch.blinkenlights.android.vanilla"
        ),
        "vibrdrome" to listOf(
            "com.vibrdrome.app",
            "com.vibrdrome",
            "app.vibrdrome",
            "app.symfonium.music.player",
            "github.daneren2005.dsub"
        ),
        "pinemusic" to listOf(
            "org.tinapple.pinemusic",
            "com.vibrdrome.app",
            "app.symfonium.music.player"
        ),
        "vaultwarden" to listOf(
            "com.x8bit.bitwarden"
        ),
        "bitwarden" to listOf(
            "com.x8bit.bitwarden"
        ),
        "qbittorrent" to listOf(
            "me.kianoosh.qbittorrentremote",
            "com.lgallardo.qbittorrentclient"
        ),
        "syncthing" to listOf(
            "com.nutomic.syncthingandroid",
            "com.github.catfriend1.syncthingandroid"
        ),
        "tailscale" to listOf(
            "com.tailscale.ipn"
        ),
        "matrix" to listOf(
            "io.element.android.x",
            "im.vector.app"
        ),
        "element" to listOf(
            "io.element.android.x",
            "im.vector.app"
        ),
        "ombi" to listOf(
            "com.pietervangils.ombi"
        ),
        "adguard" to listOf(
            "com.adguard.android"
        ),
        "hyprland" to listOf(
            "org.gnu.arch.avnc",
            "com.ii.tools",
            "com.ii_tools",
            "com.realvnc.viewer.android",
            "com.undatech.opaque"
        ),
        "vnc" to listOf(
            "org.gnu.arch.avnc",
            "com.ii.tools",
            "com.ii_tools",
            "com.realvnc.viewer.android",
            "com.undatech.opaque"
        )
    )

    fun getServiceKey(serviceName: String, displayName: String? = null, id: String? = null): String {
        val combined = "${id ?: ""} ${displayName ?: ""} $serviceName".lowercase()
        return when {
            combined.contains("tsumiru") -> "tsumiru"
            combined.contains("suwayomi") || combined.contains("manga") -> "suwayomi"
            combined.contains("plezy") -> "plezy"
            combined.contains("jellyfin") -> "jellyfin"
            combined.contains("vibrdrome") -> "vibrdrome"
            combined.contains("pinemusic") -> "pinemusic"
            combined.contains("navidrome") -> "navidrome"
            combined.contains("vaultwarden") || combined.contains("bitwarden") -> "vaultwarden"
            combined.contains("qbittorrent") || combined.contains("torrent") || combined.contains("watcherr") || combined.contains("healer") -> "qbittorrent"
            combined.contains("syncthing") -> "syncthing"
            combined.contains("tailscale") -> "tailscale"
            combined.contains("element") || combined.contains("matrix") -> "matrix"
            combined.contains("ombi") -> "ombi"
            combined.contains("adguard") -> "adguard"
            combined.contains("hyprland") || combined.contains("wayvnc") || combined.contains("remote desktop") || combined.contains("vnc") -> "hyprland"
            else -> serviceName.lowercase().removeSuffix(".service").substringBefore("@")
        }
    }

    fun findInstalledClient(context: Context, serviceKey: String): ClientAppInfo? {
        val candidates = SERVICE_PACKAGE_CANDIDATES[serviceKey] ?: emptyList()
        val pm = context.packageManager
        for (pkg in candidates) {
            val launchIntent = pm.getLaunchIntentForPackage(pkg)
            if (launchIntent != null) {
                val label = try {
                    val appInfo = pm.getApplicationInfo(pkg, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (_: Exception) {
                    pkg
                }
                return ClientAppInfo(packageName = pkg, appLabel = label)
            }
        }
        return null
    }

    fun isAppInstalled(context: Context, service: ServiceItem): Boolean {
        val key = getServiceKey(service.name, service.displayName, service.id)
        return findInstalledClient(context, key) != null
    }

    fun isAppInstalled(context: Context, serviceKey: String): Boolean {
        return findInstalledClient(context, serviceKey) != null
    }

    fun getInstalledAppLabel(context: Context, service: ServiceItem): String? {
        val key = getServiceKey(service.name, service.displayName, service.id)
        return findInstalledClient(context, key)?.appLabel
    }

    fun launchService(
        context: Context,
        service: ServiceItem,
        portalUrl: String?,
        showToast: Boolean = true
    ): LaunchResult {
        val key = getServiceKey(service.name, service.displayName, service.id)
        return launchByServiceKey(
            context = context,
            serviceKey = key,
            portalUrl = portalUrl,
            fallbackTitle = service.effectiveDisplayName,
            showToast = showToast
        )
    }

    fun launchByServiceKey(
        context: Context,
        serviceKey: String,
        portalUrl: String? = null,
        fallbackTitle: String? = null,
        showToast: Boolean = true
    ): LaunchResult {
        val pm = context.packageManager
        val installed = findInstalledClient(context, serviceKey)

        if (installed != null) {
            val launchIntent = pm.getLaunchIntentForPackage(installed.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (launchIntent != null) {
                if (showToast) {
                    Toast.makeText(context, "Opening ${installed.appLabel}", Toast.LENGTH_SHORT).show()
                }
                context.startActivity(launchIntent)
                return LaunchResult.LaunchedApp(installed.packageName, installed.appLabel)
            }
        }

        // For app-first homelab clients (Tsumiru is an APP, not web; Vibrdrome; Plezy; Bitwarden; Syncthing; Hyprland/VNC)
        val appReleaseUrl = when (serviceKey) {
            "tsumiru", "suwayomi" -> "https://github.com/Suwayomi/Suwayomi-Tsumiru/releases"
            "vibrdrome" -> "https://github.com/ddmoney420/vibrdrome-android/releases"
            "plezy" -> "https://github.com/edde746/plezy/releases"
            "syncthing" -> "https://github.com/Catfriend1/syncthing-android/releases"
            "vaultwarden", "bitwarden" -> "https://play.google.com/store/apps/details?id=com.x8bit.bitwarden"
            "hyprland", "vnc" -> "https://github.com/gstanchev/avnc/releases"
            else -> null
        }

        if (appReleaseUrl != null && (portalUrl == null || serviceKey in listOf("tsumiru", "suwayomi", "vibrdrome", "plezy", "hyprland", "vnc"))) {
            return try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(appReleaseUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (showToast) {
                    val appName = when (serviceKey) {
                        "tsumiru", "suwayomi" -> "Tsumiru"
                        "vibrdrome" -> "Vibrdrome"
                        "plezy" -> "Plezy"
                        "syncthing" -> "Syncthing"
                        "vaultwarden", "bitwarden" -> "Bitwarden"
                        "hyprland", "vnc" -> "AVNC (VNC Client)"
                        else -> serviceKey
                    }
                    Toast.makeText(context, "$appName app not installed. Opening release download...", Toast.LENGTH_SHORT).show()
                }
                context.startActivity(browserIntent)
                LaunchResult.OpenedWeb(appReleaseUrl)
            } catch (e: Exception) {
                LaunchResult.Failed(e.message ?: "Failed to open release page")
            }
        }

        if (!portalUrl.isNullOrBlank()) {
            return try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(portalUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val title = fallbackTitle ?: serviceKey.replaceFirstChar { it.uppercase() }
                if (showToast) {
                    Toast.makeText(context, "Opening $title (Web)", Toast.LENGTH_SHORT).show()
                }
                context.startActivity(browserIntent)
                LaunchResult.OpenedWeb(portalUrl)
            } catch (e: Exception) {
                if (showToast) {
                    Toast.makeText(context, "Cannot open browser: ${e.message}", Toast.LENGTH_SHORT).show()
                }
                LaunchResult.Failed(e.message ?: "Failed to open web")
            }
        }

        if (showToast) {
            Toast.makeText(context, "No app or web portal available for $serviceKey", Toast.LENGTH_SHORT).show()
        }
        return LaunchResult.NotFound
    }
}
