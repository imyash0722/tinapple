package main

import (
"fmt"
"os"
"os/exec"
"strings"
)

func main() {
if len(os.Args) < 2 {
printUsage()
os.Exit(1)
}

cmd := os.Args[1]
switch cmd {
case "get":
getSession()
case "set":
if len(os.Args) < 3 {
fmt.Println("Usage: tinapple-session set <headless|interactive|kiosk>")
os.Exit(1)
}
setSession(os.Args[2])
case "toggle":
toggleSession()
default:
printUsage()
os.Exit(1)
}
}

func printUsage() {
fmt.Println(`Usage: tinapple-session {get|set|toggle}
  get                    - Show current session mode
  set <mode>             - Set session mode (headless|interactive|kiosk)
  toggle                 - Toggle between headless and interactive`)
}

func getSession() {
// Check graphical.target
cmd := exec.Command("systemctl", "is-active", "graphical.target")
output, _ := cmd.Output()
status := strings.TrimSpace(string(output))

if status == "active" {
// Check if chadwm is running
cmd := exec.Command("systemctl", "--user", "is-active", "chadwm@.service")
output, _ := cmd.Output()
if strings.TrimSpace(string(output)) == "active" {
fmt.Println("interactive")
} else {
fmt.Println("kiosk")
}
} else {
fmt.Println("headless")
}
}

func setSession(mode string) {
valid := map[string]bool{"headless": true, "interactive": true, "kiosk": true}
if !valid[mode] {
fmt.Println("Invalid mode: must be headless, interactive, or kiosk")
os.Exit(1)
}

switch mode {
case "headless":
exec.Command("systemctl", "disable", "--now", "graphical.target").Run()
case "interactive":
exec.Command("systemctl", "enable", "--now", "graphical.target").Run()
exec.Command("systemctl", "--user", "enable", "--now", "chadwm@.service").Run()
case "kiosk":
exec.Command("systemctl", "enable", "--now", "graphical.target").Run()
// Enable auto-login for kiosk
exec.Command("systemctl", "enable", "--now", "tinapple-dash-kiosk.service").Run()
}
fmt.Printf("Session mode set to %s\n", mode)
}

func toggleSession() {
cmd := exec.Command("systemctl", "is-active", "graphical.target")
output, _ := cmd.Output()
if strings.TrimSpace(string(output)) == "active" {
setSession("headless")
} else {
setSession("interactive")
}
}
