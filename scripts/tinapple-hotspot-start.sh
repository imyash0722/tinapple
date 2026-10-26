#!/bin/bash
set -e
ip link set wlp0s20u1 up
ip addr flush dev wlp0s20u1
ip addr add 192.168.4.1/24 dev wlp0s20u1
sysctl -w net.ipv4.ip_forward=1

# Unrestricted server access & NAT routing via internet interface (wlp3s0)
iptables -t nat -C POSTROUTING -s 192.168.4.0/24 -o wlp3s0 -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s 192.168.4.0/24 -o wlp3s0 -j MASQUERADE
iptables -C FORWARD -i wlp0s20u1 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wlp0s20u1 -j ACCEPT
iptables -C FORWARD -o wlp0s20u1 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wlp0s20u1 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -C INPUT -i wlp0s20u1 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -i wlp0s20u1 -j ACCEPT

# Start dnsmasq for DHCP
killall -q dnsmasq || true
dnsmasq -C /etc/dnsmasq.d/tinapple-hotspot.conf

# Start hostapd
rm -f /var/run/hostapd/wlp0s20u1
exec /usr/local/bin/hostapd-rtl /etc/hostapd/hostapd-rtl.conf
