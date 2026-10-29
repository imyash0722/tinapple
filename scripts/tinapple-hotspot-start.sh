#!/bin/bash
set -e

# Interface bringup & hardware buffer tuning
ip link set wlp0s20u1 up
ip link set wlp0s20u1 mtu 1500
ip link set wlp0s20u1 txqueuelen 250
ip addr flush dev wlp0s20u1
ip addr add 192.168.4.1/24 dev wlp0s20u1
sysctl -w net.ipv4.ip_forward=1

# Unrestricted server access & NAT routing via internet interface (wlp3s0)
iptables -t nat -C POSTROUTING -s 192.168.4.0/24 -o wlp3s0 -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s 192.168.4.0/24 -o wlp3s0 -j MASQUERADE
iptables -C FORWARD -i wlp0s20u1 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wlp0s20u1 -j ACCEPT
iptables -C FORWARD -o wlp0s20u1 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wlp0s20u1 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -C INPUT -i wlp0s20u1 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -i wlp0s20u1 -j ACCEPT

# TCPMSS PMTU Clamping to prevent packet buffer overflow on MTU mismatch
iptables -t mangle -C FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu 2>/dev/null || iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

# Start dnsmasq for DHCP
killall -q dnsmasq || true
dnsmasq -C /etc/dnsmasq.d/tinapple-hotspot.conf

# Start hostapd (using system hostapd with nl80211 support)
rm -f /var/run/hostapd/wlp0s20u1
HOSTAPD_BIN="/usr/bin/hostapd"
[[ -x "${HOSTAPD_BIN}" ]] || HOSTAPD_BIN="/usr/local/bin/hostapd-rtl"

exec "${HOSTAPD_BIN}" /etc/hostapd/hostapd-rtl.conf
