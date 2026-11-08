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
import org.tinapple.hub.data.ProtonStatus
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.data.SystemInfo
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
        val port = service.port ?: return null
        if (port <= 0) return null

        val cleanName = service.name.lowercase().removeSuffix(".service").substringBefore("@")
        if (nonWebServices.contains(cleanName)) return null

        val currentOrigin = baseUrlProvider().trimEnd('/')
        return try {
            val uri = URI(currentOrigin)
            val host = uri.host ?: "192.168.1.103"
            "http://$host:$port/"
        } catch (_: Exception) {
            "http://192.168.1.103:$port/"
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
}
