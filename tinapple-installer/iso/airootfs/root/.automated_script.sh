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

# Ensure network services and DNS resolution are initialized
systemctl start systemd-networkd 2>/dev/null || true
systemctl start systemd-resolved 2>/dev/null || true
systemctl start NetworkManager 2>/dev/null || true
if [[ ! -s /etc/resolv.conf ]]; then
  if [[ -f /run/systemd/resolve/stub-resolv.conf ]]; then
    ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf 2>/dev/null || true
  else
    printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /etc/resolv.conf 2>/dev/null || true
  fi
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
