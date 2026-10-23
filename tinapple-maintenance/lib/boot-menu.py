#!/usr/bin/env python3
"""Publish entries for pinned recovery clones without replacing user boot entries."""
import glob, os, pathlib, re, shlex, subprocess, sys, tempfile
root = pathlib.Path(sys.argv[1])
boot = root / 'boot'
start, end = '# BEGIN TINAPPLE RECOVERY', '# END TINAPPLE RECOVERY'
def atomic(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.tinapple-', dir=path.parent)
    try:
        with os.fdopen(fd,'w') as f: f.write(text); f.flush(); os.fsync(f.fileno())
        os.chmod(name, 0o644); os.replace(name,path)
    finally:
        if os.path.exists(name): os.unlink(name)
def managed(path, entries):
    old = path.read_text() if path.exists() else ''
    old = re.sub(re.escape(start)+r'.*?'+re.escape(end)+r'\n?', '', old, flags=re.S)
    atomic(path, old.rstrip()+'\n\n'+start+'\n'+entries+end+'\n')
limine, grub = [], []
boot_uuid = subprocess.check_output(['findmnt','-n','-o','UUID','-T',str(boot)],text=True).strip()
if not re.fullmatch(r'[A-Za-z0-9-]+', boot_uuid): raise SystemExit('Cannot determine boot filesystem UUID')
for artifact in sorted((boot/'tinapple-recovery').glob('[0-9]*'), key=lambda p:int(p.name) if p.name.isdigit() else 0, reverse=True):
    if not artifact.name.isdigit() or not (artifact/'ready').exists(): continue
    ident=artifact.name
    subprocess.run(['sha256sum','--check','--status','SHA256SUMS'],cwd=artifact,check=True)
    args = [a for a in shlex.split((artifact/'cmdline').read_text()) if not a.startswith(('BOOT_IMAGE=','rootflags=','initrd=')) and a not in ('ro','rw')]
    if not any(a.startswith('root=') for a in args): raise SystemExit('Saved command line lacks root=')
    args += [f'rootflags=subvol=@tinapple-recovery-{ident}','rw']
    for kernel in sorted(artifact.glob('vmlinuz-*')):
        flavor=kernel.name.removeprefix('vmlinuz-')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+',flavor): raise SystemExit('Unsafe kernel name')
        base=f'/tinapple-recovery/{ident}/'
        modules=[p.name for p in sorted(artifact.glob('*-ucode.img'))]+[f'initramfs-{flavor}.img']
        limine += [f'/Tinapple recovery {ident} ({flavor})\n    protocol: linux\n    path: boot():{base}{kernel.name}\n    cmdline: '+shlex.join(args)+'\n'+''.join(f'    module_path: boot():{base}{m}\n' for m in modules)+'\n']
        grub += [f"menuentry 'Tinapple recovery {ident} ({flavor})' {{\n    search --no-floppy --fs-uuid --set=root {boot_uuid}\n    linux {base}{kernel.name} "+shlex.join(args)+'\n    initrd '+' '.join(base+m for m in modules)+'\n}\n']
found=False
for config in (boot/'limine.conf', boot/'EFI/BOOT/limine.conf', boot/'EFI/limine/limine.conf'):
    if config.exists(): managed(config,''.join(limine)); found=True
if (boot/'grub/grub.cfg').exists():
    if 'custom.cfg' not in (boot/'grub/grub.cfg').read_text():
        raise SystemExit('GRUB config lacks custom.cfg support; run grub-mkconfig before updating')
    managed(boot/'grub/custom.cfg',''.join(grub)); found=True
if not found: raise SystemExit('No supported Limine/GRUB configuration; cannot publish recovery entries')
