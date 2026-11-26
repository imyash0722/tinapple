package org.tinapple.hub.network

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.tinapple.hub.data.JellyfinWidgetResponse
import org.tinapple.hub.data.MangaWidgetResponse
import org.tinapple.hub.data.MusicNowPlayingState
import org.tinapple.hub.data.NetworkerStatus
import org.tinapple.hub.data.NowPlayingTrack
import org.tinapple.hub.data.ProtonStatus
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemInfo
import org.tinapple.hub.data.SystemTelemetry
import org.tinapple.hub.data.WallpaperItem
import java.net.URI
import java.util.concurrent.TimeUnit

class TinappleApiClient(private val baseUrlProvider: () -> String) {

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()

    private val networkerClient = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private val nonWebServices = setOf(
        "postgresql",
        "redis",
        "docker",
        "tor",
        "wireguard",
        "niri",
        "tinapple-session",
        "snapper",
        "tailscale",
        "tailscaled",
        "proton",
        "protonvpn",
        "bbctl"
    )

    fun getServicePortalUrl(service: ServiceItem): String? {
        val port = service.displayPort ?: service.port ?: return null
        if (port <= 0) return null

        val cleanName = service.name.lowercase().removeSuffix(".service").substringBefore("@")
        if (nonWebServices.contains(cleanName)) return null

        val currentOrigin = baseUrlProvider().trimEnd('/')
        return try {
            val uri = URI(currentOrigin)
            val host = uri.host ?: DiscoveryEngine.DEFAULT_TAILSCALE_HOST
            val portalHost = if (host.matches(Regex("""^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$""")) || host.endsWith(".ts.net")) {
                DiscoveryEngine.DEFAULT_TAILSCALE_HOST
            } else host
            "http://$portalHost:$port/"
        } catch (_: Exception) {
            "http://${DiscoveryEngine.DEFAULT_TAILSCALE_HOST}:$port/"
        }
    }

    suspend fun getServices(): Result<List<ServiceItem>> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/v1/services")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }
                val body = response.body?.string() ?: return@withContext Result.success(emptyList())
                val jsonElement = gson.fromJson(body, com.google.gson.JsonElement::class.java)

                val list: List<ServiceItem> = when {
                    jsonElement.isJsonArray -> {
                        val type = object : TypeToken<List<ServiceItem>>() {}.type
                        gson.fromJson(jsonElement, type)
                    }
                    jsonElement.isJsonObject -> {
                        val obj = jsonElement.asJsonObject
                        val array = obj.getAsJsonArray("services") ?: JsonArray()
                        val type = object : TypeToken<List<ServiceItem>>() {}.type
                        gson.fromJson(array, type)
                    }
                    else -> emptyList()
                }

                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun controlService(serviceName: String, action: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val cleanAction = action.lowercase().trim()
            val request = Request.Builder()
                .url("$origin/api/v1/services/$serviceName/$cleanAction")
                .header("User-Agent", "TinappleAndroid/2.0")
                .post("{}".toRequestBody(jsonMediaType))
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Control failed with HTTP ${response.code}"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProtonStatus(): Result<ProtonStatus> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/v1/system/proton-exit")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }
                val body = response.body?.string() ?: "{}"
                val status = gson.fromJson(body, ProtonStatus::class.java)
                Result.success(status)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleProtonStatus(active: Boolean): Result<ProtonStatus> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val payload = JsonObject().apply { addProperty("active", active) }
            val request = Request.Builder()
                .url("$origin/api/v1/system/proton-exit")
                .header("User-Agent", "TinappleAndroid/2.0")
                .post(payload.toString().toRequestBody(jsonMediaType))
                .build()

            client.newCall(request).execute().use { response ->
                val body = response.body?.string() ?: "{}"
                if (response.isSuccessful) {
                    val status = gson.fromJson(body, ProtonStatus::class.java)
                    Result.success(status)
                } else {
                    Result.failure(Exception("HTTP ${response.code}: $body"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSystemInfo(): Result<SystemInfo> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/v1/system/info")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }
                val body = response.body?.string() ?: "{}"
                val info = gson.fromJson(body, SystemInfo::class.java)
                Result.success(info)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTelemetry(): Result<SystemTelemetry> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/v1/system/telemetry")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }
                val body = response.body?.string() ?: "{}"
                val telemetry = gson.fromJson(body, SystemTelemetry::class.java)
                Result.success(telemetry)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWallpapers(): Result<List<WallpaperItem>> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/v1/wallpapers")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }
                val body = response.body?.string() ?: "[]"
                val jsonElement = gson.fromJson(body, com.google.gson.JsonElement::class.java)

                val list: List<WallpaperItem> = if (jsonElement.isJsonArray) {
                    val type = object : TypeToken<List<WallpaperItem>>() {}.type
                    gson.fromJson(jsonElement, type)
                } else {
                    emptyList()
                }

                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMusicNowPlaying(): Result<MusicNowPlayingState> = withContext(Dispatchers.IO) {
        val origin = baseUrlProvider().trimEnd('/')
        // 1. Try tinapple-dash /api/v1/music/now-playing
        try {
            val request = Request.Builder()
                .url("$origin/api/v1/music/now-playing")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "{}"
                    val state = gson.fromJson(body, MusicNowPlayingState::class.java)
                    if (state != null) {
                        val track = state.track
                        val fixedTrack = if (track?.coverUrl?.startsWith("/") == true) {
                            track.copy(coverUrl = "$origin${track.coverUrl}")
                        } else {
                            track
                        }
                        return@withContext Result.success(state.copy(track = fixedTrack))
                    }
                }
            }
        } catch (_: Exception) {
            // Fallback to direct Navidrome Subsonic query
        }

        // 2. Direct Navidrome Subsonic query fallback on port 4533
        try {
            val uri = java.net.URI(origin)
            val host = uri.host ?: DiscoveryEngine.DEFAULT_TAILSCALE_HOST
            val navUrl = "http://$host:4533/rest/getNowPlaying.view?u=pineapple&p=pine%402507&v=1.16.1&c=tinapple&f=json"
            val navReq = Request.Builder().url(navUrl).get().build()
            client.newCall(navReq).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "{}"
                    val json = gson.fromJson(body, JsonObject::class.java)
                    val subResp = json.getAsJsonObject("subsonic-response")
                    val nowPlayingObj = subResp?.getAsJsonObject("nowPlaying")
                    val entries = nowPlayingObj?.getAsJsonArray("entry")
                    if (entries != null && entries.size() > 0) {
                        val first = entries.get(0).asJsonObject
                        val id = first.get("id")?.asString ?: ""
                        val title = first.get("title")?.asString ?: "Unknown Track"
                        val artist = first.get("artist")?.asString ?: "Unknown Artist"
                        val album = first.get("album")?.asString
                        val coverArt = first.get("coverArt")?.asString
                        val duration = first.get("duration")?.asInt ?: 0
                        val minutesAgo = first.get("minutesAgo")?.asInt ?: 0
                        val username = first.get("username")?.asString
                        val coverUrl = if (!coverArt.isNullOrBlank()) {
                            "http://$host:4533/rest/getCoverArt.view?id=$coverArt&u=pineapple&p=pine%402507&v=1.16.1&c=tinapple"
                        } else null

                        val track = NowPlayingTrack(
                            id = id,
                            title = title,
                            artist = artist,
                            album = album,
                            coverUrl = coverUrl,
                            duration = duration,
                            minutesAgo = minutesAgo,
                            username = username
                        )
                        return@withContext Result.success(MusicNowPlayingState(active = true, track = track))
                    }
                }
            }

            // 2b. Direct Navidrome PlayQueue query fallback on port 4533
            val pqUrl = "http://$host:4533/rest/getPlayQueue.view?u=pineapple&p=pine%402507&v=1.16.1&c=tinapple&f=json"
            val pqReq = Request.Builder().url(pqUrl).get().build()
            client.newCall(pqReq).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "{}"
                    val json = gson.fromJson(body, JsonObject::class.java)
                    val subResp = json.getAsJsonObject("subsonic-response")
                    val pqObj = subResp?.getAsJsonObject("playQueue")
                    val entries = pqObj?.getAsJsonArray("entry")
                    if (entries != null && entries.size() > 0) {
                        val curId = pqObj.get("current")?.asString ?: ""
                        var matched = entries.get(0).asJsonObject
                        for (i in 0 until entries.size()) {
                            val item = entries.get(i).asJsonObject
                            if (item.get("id")?.asString == curId) {
                                matched = item
                                break
                            }
                        }
                        val id = matched.get("id")?.asString ?: ""
                        val title = matched.get("title")?.asString ?: "Unknown Track"
                        val artist = matched.get("artist")?.asString ?: "Unknown Artist"
                        val album = matched.get("album")?.asString
                        val coverArt = matched.get("coverArt")?.asString
                        val duration = matched.get("duration")?.asInt ?: 0
                        val coverUrl = if (!coverArt.isNullOrBlank()) {
                            "http://$host:4533/rest/getCoverArt.view?id=$coverArt&u=pineapple&p=pine%402507&v=1.16.1&c=tinapple"
                        } else null

                        val track = NowPlayingTrack(
                            id = id,
                            title = title,
                            artist = artist,
                            album = album,
                            coverUrl = coverUrl,
                            duration = duration,
                            minutesAgo = 0,
                            username = pqObj.get("username")?.asString
                        )
                        return@withContext Result.success(MusicNowPlayingState(active = true, track = track))
                    }
                }
            }
        } catch (e: Exception) {
            return@withContext Result.failure(e)
        }

        Result.success(MusicNowPlayingState(active = false, track = null))
    }

    suspend fun getMangaWidgetData(): Result<MangaWidgetResponse> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/widgets/manga")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }
                val body = response.body?.string() ?: "{}"
                val data = gson.fromJson(body, MangaWidgetResponse::class.java)
                Result.success(data)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getJellyfinWidgetData(): Result<JellyfinWidgetResponse> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val request = Request.Builder()
                .url("$origin/api/widgets/jellyfin")
                .header("User-Agent", "TinappleAndroid/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }
                val body = response.body?.string() ?: "{}"
                val data = gson.fromJson(body, JellyfinWidgetResponse::class.java)
                Result.success(data)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun executeNetworkerRequest(
        path: String,
        method: String = "GET",
        payload: Any? = null
    ): Result<NetworkerStatus> = withContext(Dispatchers.IO) {
        try {
            val origin = baseUrlProvider().trimEnd('/')
            val builder = Request.Builder()
                .url("$origin/api/v1/networker$path")
                .header("User-Agent", "TinappleAndroid/2.0")

            val reqBody = if (payload != null) {
                gson.toJson(payload).toRequestBody(jsonMediaType)
            } else if (method == "POST") {
                "{}".toRequestBody(jsonMediaType)
            } else {
                null
            }

            when (method.uppercase()) {
                "POST" -> builder.post(reqBody ?: "{}".toRequestBody(jsonMediaType))
                "DELETE" -> builder.delete()
                else -> builder.get()
            }

            networkerClient.newCall(builder.build()).execute().use { response ->
                val bodyStr = response.body?.string() ?: "{}"
                if (!response.isSuccessful) {
                    val errMsg = try {
                        val obj = gson.fromJson(bodyStr, JsonObject::class.java)
                        obj?.get("error")?.asString ?: obj?.get("message")?.asString
                    } catch (_: Exception) {
                        null
                    } ?: "HTTP ${response.code}: ${response.message}"
                    return@withContext Result.failure(Exception(errMsg))
                }
                val parsed = gson.fromJson(bodyStr, NetworkerStatus::class.java)
                Result.success(parsed)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNetworkerStatus(refresh: Boolean = false): Result<NetworkerStatus> =
        executeNetworkerRequest(if (refresh) "/status?refresh=1" else "/status", "GET")

    suspend fun toggleNetworkerProton(active: Boolean): Result<NetworkerStatus> =
        executeNetworkerRequest("/proton/toggle", "POST", mapOf("active" to active))

    suspend fun reloadNetworkerProton(): Result<NetworkerStatus> =
        executeNetworkerRequest("/proton/reload", "POST", emptyMap<String, Any>())

    suspend fun selectNetworkerProtonProfile(id: String): Result<NetworkerStatus> =
        executeNetworkerRequest("/proton/select", "POST", mapOf("id" to id))

    suspend fun uploadNetworkerProtonConfig(
        fileName: String,
        config: String,
        connectNow: Boolean = true
    ): Result<NetworkerStatus> =
        executeNetworkerRequest(
            "/proton/upload",
            "POST",
            mapOf("fileName" to fileName, "config" to config, "connectNow" to connectNow)
        )

    suspend fun deleteNetworkerProtonProfile(id: String): Result<NetworkerStatus> =
        executeNetworkerRequest("/proton/config/${java.net.URLEncoder.encode(id, "UTF-8")}", "DELETE")

    suspend fun toggleNetworkerTor(active: Boolean): Result<NetworkerStatus> =
        executeNetworkerRequest("/tor/toggle", "POST", mapOf("active" to active))

    suspend fun reloadNetworkerTor(): Result<NetworkerStatus> =
        executeNetworkerRequest("/tor/reload", "POST", emptyMap<String, Any>())

    suspend fun setNetworkerRoute(id: String, mode: String): Result<NetworkerStatus> =
        executeNetworkerRequest("/route", "POST", mapOf("id" to id, "mode" to mode))
}
