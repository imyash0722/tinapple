package org.tinapple.hub

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemTelemetry
import org.tinapple.hub.network.TinappleApiClient
import org.tinapple.hub.ui.components.ServiceBrandIconResolver
import org.tinapple.hub.utils.ClientAppLauncher

class ServiceItemTest {
    @Test
    fun testOmbiDisplayPortAndPortalUrl() {
        val ombiItem = ServiceItem(
            name = "ombi.service",
            displayName = "Ombi Media Requests",
            port = 5000,
            running = true
        )

        assertEquals(5055, ombiItem.displayPort)

        val clientTs = TinappleApiClient { "http://100.67.207.60:8088" }
        val portalUrl = clientTs.getServicePortalUrl(ombiItem)
        assertEquals("http://100.67.207.60:5055/", portalUrl)

        val clientLan = TinappleApiClient { "http://192.168.1.103:8088" }
        val lanPortalUrl = clientLan.getServicePortalUrl(ombiItem)
        assertEquals("http://192.168.1.103:5055/", lanPortalUrl)

        val clientHttps = TinappleApiClient { "https://tinapple-server.tail3dee69.ts.net" }
        assertEquals("http://100.67.207.60:5055/", clientHttps.getServicePortalUrl(ombiItem))

        val clientHostname = TinappleApiClient { "http://tinapple-server:8088" }
        assertEquals("http://tinapple-server:5055/", clientHostname.getServicePortalUrl(ombiItem))
    }

    @Test
    fun testStandardServiceKeepsOriginalPort() {
        val jellyfinItem = ServiceItem(
            name = "jellyfin.service",
            displayName = "Jellyfin Media Server",
            port = 8096,
            running = true
        )

        assertEquals(8096, jellyfinItem.displayPort)

        val client = TinappleApiClient { "http://100.67.207.60:8088" }
        val portalUrl = client.getServicePortalUrl(jellyfinItem)
        assertEquals("http://100.67.207.60:8096/", portalUrl)
    }

    @Test
    fun testClientAppLauncherKeys() {
        assertEquals("suwayomi", ClientAppLauncher.getServiceKey("suwayomi.service", "Suwayomi Manga"))
        assertEquals("tsumiru", ClientAppLauncher.getServiceKey("tsumiru.service", "Tsumiru Manga"))
        assertEquals("jellyfin", ClientAppLauncher.getServiceKey("jellyfin.service", "Jellyfin Server"))
        assertEquals("navidrome", ClientAppLauncher.getServiceKey("navidrome.service", "Navidrome Audiophile"))
        assertEquals("pinemusic", ClientAppLauncher.getServiceKey("pinemusic.service", "PineMusic"))
        assertEquals("vaultwarden", ClientAppLauncher.getServiceKey("vaultwarden.service", "Bitwarden Vault"))
        assertEquals("qbittorrent", ClientAppLauncher.getServiceKey("qbittorrent-nox.service", "qBittorrent"))
        assertEquals("tailscale", ClientAppLauncher.getServiceKey("tailscaled.service", "Tailscale Mesh"))
    }

    @Test
    fun testServiceBrandIcons() {
        assertEquals("icons/pinemusic.svg", ServiceBrandIconResolver.getIconAssetPath("pinemusic.service", "PineMusic"))
        assertEquals("icons/suwayomi.png", ServiceBrandIconResolver.getIconAssetPath("suwayomi.service", "Suwayomi"))
        assertEquals("icons/jellyfin.svg", ServiceBrandIconResolver.getIconAssetPath("jellyfin.service", "Jellyfin"))
        assertEquals("icons/navidrome.png", ServiceBrandIconResolver.getIconAssetPath("navidrome.service", "Navidrome"))
    }

    @Test
    fun testTelemetryDeserialization() {
        val sampleJson = """
            {
              "cpu": {
                "cores": 4,
                "usage_percent": 12.5,
                "model_name": "Intel Core i5"
              },
              "memory": {
                "total_bytes": 8589934592,
                "used_bytes": 4294967296,
                "used_percent": 50.0
              },
              "disk": {
                "total_bytes": 240000000000,
                "free_bytes": 34000000000,
                "used_percent": 85.8
              },
              "thermal": {
                "max_temp_c": 45.0,
                "power_profile": "balanced"
              },
              "battery": {
                "percent": 100,
                "charging": false,
                "present": true
              }
            }
        """.trimIndent()

        val gson = Gson()
        val telemetry = gson.fromJson(sampleJson, SystemTelemetry::class.java)

        assertNotNull(telemetry)
        assertEquals(4, telemetry.cpu.cores)
        assertEquals("12.5%", telemetry.cpu.usageFormatted)
        assertEquals(4.0, telemetry.memory.usedGb, 0.01)
        assertEquals(8.0, telemetry.memory.totalGb, 0.01)
        assertEquals("45°C", telemetry.thermal.tempFormatted)
        assertTrue(telemetry.battery.present)
        assertEquals(100, telemetry.battery.percent)
    }
}

