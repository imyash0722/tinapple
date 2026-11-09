package org.tinapple.hub

import org.junit.Assert.assertEquals
import org.junit.Test
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.network.TinappleApiClient

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
}
