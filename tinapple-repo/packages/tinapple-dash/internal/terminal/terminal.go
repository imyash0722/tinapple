package terminal

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"syscall"

	"github.com/creack/pty"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true // Tailscale / local authentication verified before upgrade
	},
}

type WindowSize struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

// HandleTerminalWS upgrades the connection to WebSocket and multiplexes a live PTY bash session
func HandleTerminalWS(c *gin.Context, isAdmin bool) {
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin privileges required to access server terminal"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Terminal websocket upgrade failed: %v", err)
		return
	}
	defer ws.Close()

	// Default to bash login shell
	shell := "/bin/bash"
	if _, err := os.Stat(shell); err != nil {
		shell = "/bin/sh"
	}

	cmd := exec.Command(shell, "-l")
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
		"LANG=en_US.UTF-8",
		"LC_ALL=en_US.UTF-8",
	)

	ptmx, err := pty.Start(cmd)
	if err != nil {
		_ = ws.WriteMessage(websocket.TextMessage, []byte("Failed to spawn PTY: "+err.Error()+"\r\n"))
		return
	}
	defer func() {
		_ = ptmx.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Signal(syscall.SIGKILL)
			_ = cmd.Wait()
		}
	}()

	// 1. PTY -> WebSocket (Streaming terminal output to browser)
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				return
			}
			if err := ws.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	// 2. WebSocket -> PTY (Handling user input and terminal resizing)
	for {
		msgType, p, err := ws.ReadMessage()
		if err != nil {
			break
		}

		// Detect JSON control message (e.g. resize)
		if (msgType == websocket.TextMessage || msgType == websocket.BinaryMessage) && len(p) > 0 && p[0] == '{' {
			var wsMsg WindowSize
			if err := json.Unmarshal(p, &wsMsg); err == nil && wsMsg.Type == "resize" {
				if wsMsg.Cols > 0 && wsMsg.Rows > 0 {
					_ = pty.Setsize(ptmx, &pty.Winsize{
						Cols: wsMsg.Cols,
						Rows: wsMsg.Rows,
					})
					continue
				}
			}
		}

		// Standard keystroke / input forwarding to PTY
		if _, err := ptmx.Write(p); err != nil {
			break
		}
	}
}
