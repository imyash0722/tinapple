package org.tinapple.hub.ui.terminal

import androidx.compose.ui.text.AnnotatedString
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.util.concurrent.TimeUnit

enum class ConnectionStatus {
    CONNECTING,
    CONNECTED,
    DISCONNECTED,
    FAILED
}

data class TerminalUiState(
    val status: ConnectionStatus = ConnectionStatus.DISCONNECTED,
    val statusMessage: String = "Not connected",
    val lines: List<AnnotatedString> = emptyList(),
    val isCtrlActive: Boolean = false,
    val isAltActive: Boolean = false,
    val serverHost: String = ""
)

class TerminalViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(TerminalUiState())
    val uiState: StateFlow<TerminalUiState> = _uiState.asStateFlow()

    private var activeWebSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .connectTimeout(8, TimeUnit.SECONDS)
        .build()

    private val lineBuffer = StringBuilder()
    private val maxLines = 800

    fun connect(serverOrigin: String) {
        disconnect()

        val host = serverOrigin
            .removePrefix("http://")
            .removePrefix("https://")
            .substringBefore("/")

        val wsUrl = if (serverOrigin.startsWith("https://")) {
            "wss://$host/api/v1/terminal/ws"
        } else {
            "ws://$host/api/v1/terminal/ws"
        }

        _uiState.update {
            it.copy(
                status = ConnectionStatus.CONNECTING,
                statusMessage = "Connecting to $host...",
                serverHost = host
            )
        }

        val request = Request.Builder()
            .url(wsUrl)
            .header("User-Agent", "TinappleAndroid-Terminal/2.0")
            .build()

        activeWebSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _uiState.update {
                    it.copy(
                        status = ConnectionStatus.CONNECTED,
                        statusMessage = "Connected"
                    )
                }
                // Send standard terminal size
                webSocket.send("{\"type\":\"resize\",\"cols\":80,\"rows\":32}")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                appendTerminalOutput(text)
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                appendTerminalOutput(bytes.utf8())
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                _uiState.update {
                    it.copy(
                        status = ConnectionStatus.DISCONNECTED,
                        statusMessage = "Session closed ($code)"
                    )
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _uiState.update {
                    it.copy(
                        status = ConnectionStatus.FAILED,
                        statusMessage = t.message ?: "Connection failed"
                    )
                }
            }
        })
    }

    private fun appendTerminalOutput(chunk: String) {
        viewModelScope.launch(Dispatchers.Default) {
            // Normalize CRLF
            val cleanChunk = chunk.replace("\r\n", "\n").replace("\r", "\n")
            lineBuffer.append(cleanChunk)

            val rawLines = lineBuffer.toString().split("\n")
            // Keep the last partial line in the buffer
            if (rawLines.isNotEmpty()) {
                val completeLines = rawLines.dropLast(1)
                val partialLine = rawLines.last()

                if (completeLines.isNotEmpty()) {
                    val parsedComplete = completeLines.map { AnsiParser.parse(it) }
                    _uiState.update { state ->
                        val combined = (state.lines + parsedComplete).takeLast(maxLines)
                        state.copy(lines = combined)
                    }
                    lineBuffer.clear()
                    lineBuffer.append(partialLine)
                }
            }
        }
    }

    fun sendRaw(data: String) {
        activeWebSocket?.send(data)
    }

    fun sendKey(key: String) {
        val ctrl = _uiState.value.isCtrlActive
        val alt = _uiState.value.isAltActive

        val payload = when {
            ctrl && key.length == 1 -> {
                val ch = key[0].uppercaseChar()
                if (ch in 'A'..'Z') {
                    (ch.code - 64).toChar().toString()
                } else key
            }
            alt -> "\u001b$key"
            else -> key
        }

        activeWebSocket?.send(payload)

        // Reset modifier state after keystroke
        if (ctrl || alt) {
            _uiState.update { it.copy(isCtrlActive = false, isAltActive = false) }
        }
    }

    fun toggleCtrl() {
        _uiState.update { it.copy(isCtrlActive = !it.isCtrlActive) }
    }

    fun toggleAlt() {
        _uiState.update { it.copy(isAltActive = !it.isAltActive) }
    }

    fun sendCtrlC() {
        activeWebSocket?.send("\u0003")
        _uiState.update { it.copy(isCtrlActive = false) }
    }

    fun sendCtrlD() {
        activeWebSocket?.send("\u0004")
        _uiState.update { it.copy(isCtrlActive = false) }
    }

    fun sendCtrlZ() {
        activeWebSocket?.send("\u001a")
        _uiState.update { it.copy(isCtrlActive = false) }
    }

    fun sendCtrlL() {
        activeWebSocket?.send("\u000c")
        _uiState.update { it.copy(isCtrlActive = false) }
    }

    fun sendCommand(cmd: String) {
        if (cmd.isNotEmpty()) {
            activeWebSocket?.send("$cmd\r")
        }
    }

    fun clearScreen() {
        lineBuffer.clear()
        _uiState.update { it.copy(lines = emptyList()) }
    }

    fun disconnect() {
        activeWebSocket?.close(1000, "User disconnected")
        activeWebSocket = null
        _uiState.update { it.copy(status = ConnectionStatus.DISCONNECTED) }
    }

    override fun onCleared() {
        super.onCleared()
        disconnect()
    }
}
