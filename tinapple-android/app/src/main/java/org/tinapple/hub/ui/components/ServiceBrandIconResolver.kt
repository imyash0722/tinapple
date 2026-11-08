package org.tinapple.hub.ui.components

object ServiceBrandIconResolver {

    fun getIconAssetPath(serviceName: String, displayName: String?): String? {
        val combined = "${displayName ?: ""} $serviceName".lowercase()

        return when {
            combined.contains("jellyfin") -> "icons/jellyfin.svg"
            combined.contains("qbittorrent") -> "icons/qbittorrent.svg"
            combined.contains("sonarr") -> "icons/sonarr.svg"
            combined.contains("radarr") -> "icons/radarr.svg"
            combined.contains("ombi") -> "icons/ombi.svg"
            combined.contains("bazarr") -> "icons/bazarr.svg"
            combined.contains("prowlarr") -> "icons/prowlarr.svg"
            combined.contains("seerr") || combined.contains("jellyseerr") -> "icons/seerr.svg"
            combined.contains("navidrome") -> "icons/navidrome.png"
            combined.contains("suwayomi") -> "icons/suwayomi.png"
            combined.contains("filebrowser") -> "icons/filebrowser.png"
            combined.contains("syncthing") -> "icons/syncthing.svg"
            combined.contains("syncyomi") -> "icons/syncyomi.svg"
            combined.contains("tailscale") -> "icons/tailscale.svg"
            combined.contains("adguard") -> "icons/adguard.svg"
            combined.contains("docker") -> "icons/docker.svg"
            combined.contains("snapper") -> "icons/snapper.svg"
            combined.contains("tor") -> "icons/tor.svg"
            combined.contains("wireguard") -> "icons/wireguard.svg"
            combined.contains("niri") -> "icons/niri.svg"
            combined.contains("ollama") -> "icons/ollama.svg"
            combined.contains("minecraft") -> "icons/minecraft.svg"
            combined.contains("jdownloader") -> "icons/jdownloader.svg"
            combined.contains("arch") -> "icons/archlinux.svg"
            combined.contains("proton") -> "icons/protonvpn.svg"
            combined.contains("homarr") -> "icons/homarr.svg"
            combined.contains("dash") || combined.contains("tinapple") -> "icons/homarr.svg"
            combined.contains("healer") || combined.contains("watcherr") -> "icons/qbittorrent.svg"
            combined.contains("vaultwarden") -> "icons/vaultwarden.svg"
            combined.contains("postgres") -> "icons/postgresql.svg"
            combined.contains("redis") -> "icons/redis.svg"
            combined.contains("prometheus") -> "icons/prometheus.svg"
            else -> null
        }
    }
}
