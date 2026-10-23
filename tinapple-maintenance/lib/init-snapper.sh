#!/usr/bin/env bash
set -euo pipefail
  # The installer pre-creates @snapshots and mounts it at /.snapshots. Snapper's
  # create-config would fail on that existing directory; register it explicitly.
  if [[ $(findmnt -n -o FSTYPE /) == btrfs ]] && ! snapper --no-dbus -c root get-config >/dev/null 2>&1; then
    if mountpoint -q /.snapshots; then
      install -Dm600 /etc/snapper/config-templates/default /etc/snapper/configs/root
      sed -i 's|^SUBVOLUME=.*|SUBVOLUME="/"|; s|^FSTYPE=.*|FSTYPE="btrfs"|' /etc/snapper/configs/root
      python3 - <<'PY'
from pathlib import Path
import re
p=Path('/etc/conf.d/snapper')
s=p.read_text() if p.exists() else ''
m=re.search(r'^SNAPPER_CONFIGS="([^"]*)"',s,re.M)
names=m.group(1).split() if m else []
if 'root' not in names:names.append('root')
line='SNAPPER_CONFIGS="'+' '.join(names)+'"'
s=re.sub(r'^SNAPPER_CONFIGS=.*$',line,s,flags=re.M) if m else s+'\n'+line+'\n'
p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
PY
    else
      snapper --no-dbus -c root create-config / || { echo 'ERROR: configure Snapper root before the next transaction' >&2; exit 1; }
    fi
  fi
