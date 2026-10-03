# Task K: Add Critical Missing Packages to packages.x86_64

## Goal
Add all missing critical packages from Arch releng that are required for ISO build and boot.

## File to Modify
`/mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64`

## Add These Packages (in appropriate sections)

### CRITICAL - Partitioning/Install (Add to appropriate section)
```
parted                    # CRITICAL - partition probing/manipulation
mkinitcpio-archiso        # CRITICAL - archiso hooks for live boot
arch-install-scripts      # CRITICAL - pacstrap, arch-chroot, genfstab
```

### CRITICAL - Hardware/Recovery (Add to Hardware section)
```
dmidecode                 # Hardware detection
memtest86+                # Memory testing
memtest86+-efi            # UEFI memory test
dmraid                    # RAID detection
hdparm                    # Disk parameters
smartmontools             # SMART monitoring
lsscsi                    # SCSI device listing
sg3_utils                 # SCSI utilities
hwdata                    # Hardware database
pciutils                  # PCI utilities
usbutils                  # USB utilities
lsscsi                    # SCSI device listing
sg3_utils                 # SCSI generic utils
```

### Filesystem Support
```
nilfs-utils
jfsutils
reiserfsprogs
exfatprogs
```

### Network/Recovery
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
wpa_supplicant
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Firmware/Drivers
```
b43-fwcutter
linux-firmware-marvell
linux-firmware-whence
```

### Network
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Filesystem Tools
```
partclone
partimage
fsarchiver
squashfs-tools
```

### Network Services
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Filesystem Tools
```
partclone
partimage
fsarchiver
squashfs-tools
```

### Network Services
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Firmware/Drivers
```
b43-fwcutter
linux-firmware-marvell
linux-firmware-whence
```

### Network
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Filesystem Tools
```
partclone
partimage
fsarchiver
squashfs-tools
```

### Network Services
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Hardware/Virtualization
```
qemu-guest-agent
spice-vdagent
virtualbox-guest-utils-nox
open-vm-tools
```

### Monitoring/Debugging
```
smartmontools
htop (have ✓)
btop (have ✓)
ncdu (have ✓)
iotop
lsof
sysstat
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Filesystem Tools
```
partclone
partimage
fsarchiver
squashfs-tools
```

### Network Services
```
dhcpcd
dnsmasq
ppp
rp-pppoe
ppp
openresolv
nftables
iptables-nft
iptables
openresolv
```

### Boot/Recovery
```
refind
memtest86+
memtest86+-efi
grml-zsh-config
```

### Monitoring/Debugging
```
smartmontools
iotop
lsof
sysstat
```

### Add to packages.x86_64 in appropriate sections

Verification:
```bash
# Check package count
wc -l /mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64

# Verify critical packages present
grep -E "(parted|mkinitcpio-archiso|arch-install-scripts|refind|memtest86|dmidecode|parted)" /mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64
```
