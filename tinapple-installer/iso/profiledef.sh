#!/usr/bin/env bash
# tinapple-os Archiso Profile Definition

iso_name="tinapple-os"
iso_label="TINAPPLE_$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y%m)"
iso_publisher="tinapple Project <https://github.com/tinapple/tinapple-arch>"
iso_application="tinapple OS Live & Installation Appliance"
iso_version="$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y.%m.%d)"
install_dir="tinapple"
buildmodes=('iso')
bootmodes=('bios.syslinux' 'uefi.systemd-boot')
arch="x86_64"
pacman_conf="pacman.conf"
airootfs_image_type="squashfs"
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '19')
bootstrap_tarball_compression=('zstd' '-c' '-T0' '--auto-threads=logical' '--long' '-19')
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.automated_script.sh"]="0:0:755"
  ["/root/.ssh"]="0:0:700"
  ["/root/.ssh/authorized_keys"]="0:0:600"
  ["/etc/ssh/ssh_host_rsa_key"]="0:0:600"
  ["/etc/ssh/ssh_host_ed25519_key"]="0:0:600"
  ["/etc/ssh/ssh_host_ecdsa_key"]="0:0:600"
  ["/usr/local/bin/tinapple-install"]="0:0:755"
  ["/usr/local/bin/tinapple-bootstrap"]="0:0:755"
  ["/etc/skel/.vnc/xstartup"]="0:0:755"
  ["/usr/lib/tinapple-installer/backend/run-stage.sh"]="0:0:755"
)

