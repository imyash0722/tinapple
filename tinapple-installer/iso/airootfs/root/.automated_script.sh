#!/usr/bin/env bash
# /root/.automated_script.sh
# Auto-launch tinapple-install on TTY1, fallback to shell

# Ensure sshd is running for automated testing and remote management
chmod 600 /etc/ssh/ssh_host_*_key 2>/dev/null || true
chmod 700 /root/.ssh 2>/dev/null || true
chmod 600 /root/.ssh/* 2>/dev/null || true
if ! pgrep -x sshd >/dev/null 2>&1; then
  ssh-keygen -A >/dev/null 2>&1 || true
  chmod 600 /etc/ssh/ssh_host_*_key 2>/dev/null || true
  systemctl restart sshd 2>/dev/null || /usr/bin/sshd 2>/dev/null || true
fi

# Check if we're on TTY1 and not already in installer or previously exited
if [[ "$(tty)" == "/dev/tty1" ]] && [[ -z "${TINAPPLE_INSTALLER_RUNNING:-}" ]] && [[ ! -f /tmp/.tinapple_installer_exited ]]; then
  export TINAPPLE_INSTALLER_RUNNING=1
  touch /tmp/.tinapple_installer_exited
  /usr/local/bin/tinapple-install || true
  # Fallback to interactive shell on TUI exit (q key)
  echo ""
  echo "Installer exited. Dropping to root shell."
  echo "Run 'tinapple-install' to re-launch the installer."
  exec /bin/bash
else
  # Fallback to interactive shell
  exec /bin/bash
fi
