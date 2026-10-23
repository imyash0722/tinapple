#!/usr/bin/env python3
"""Non-root fixture tests: no real provisioning, mounts, or systemd actions."""
import json, os, pathlib, shutil, subprocess, tempfile, unittest
REPO=pathlib.Path(__file__).resolve().parents[1]
class ApplianceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.base=pathlib.Path(self.tmp.name);self.root=self.base/'root';self.bin=self.base/'bin';self.bin.mkdir();self.root.mkdir()
        self.log=self.base/'commands'
        self.env=dict(os.environ,PATH=str(self.bin)+':'+os.environ['PATH'],COMMAND_LOG=str(self.log),TINAPPLE_ROOT=str(self.root),TINAPPLE_RUN_DIR=str(self.base/'run'),TINAPPLE_TESTING='1')
        self.lib=self.base/'lib';shutil.copytree(REPO/'tinapple-maintenance/lib',self.lib)
        # Remove ONLY the uid guard in fixtures, leaving production source unchanged.
        common=self.lib/'common.sh';common.write_text(common.read_text().replace('[[ $EUID == 0 ]]','true'))
        self.env['TINAPPLE_MAINTENANCE_LIB']=str(self.lib)
    def mock(self,name,body='exit 0'):
        p=self.bin/name;p.write_text('#!/usr/bin/env bash\nset -euo pipefail\nprintf "%s %s\\n" "'+name+'" "$*" >> "$COMMAND_LOG"\n'+body+'\n');p.chmod(0o755)
    def runscript(self,path,*args,ok=True):
        result=subprocess.run(['bash',str(path),*args],env=self.env,text=True,capture_output=True,timeout=15)
        if ok:self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        else:self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        return result
    def setup_fixture(self):
        config=self.root/'etc/tinapple';config.mkdir(parents=True)
        (config/'manifest.yaml').write_text('hostname: test-node\nservices:\n  tailscale:\n    enabled: true\n    auth_key: secret-fixture-key\n')
        for cmd in ['hostnamectl','systemd-machine-id-setup','ssh-keygen','ufw','systemctl','tailscale','tinapple-config-generator','tinapple-snapshot-boot']:self.mock(cmd)
        script=self.base/'setup';script.write_text((REPO/'tinapple-firstboot/bin/tinapple-setup').read_text().replace('[[ $EUID == 0 ]]','true'))
        return script
    def test_firstboot_once_no_secret_in_logs(self):
        script=self.setup_fixture();result=self.runscript(script)
        self.assertTrue((self.root/'etc/tinapple/.provisioned').exists())
        commands=self.log.read_text();self.assertNotIn('secret-fixture-key',commands+result.stdout+result.stderr)
        self.assertIn('--auth-key=file:',commands);self.assertIn('ufw allow 443/tcp',commands)
        self.runscript(script);self.assertEqual(commands,self.log.read_text())
    def test_firstboot_failure_is_retryable_without_rotating_identity(self):
        script=self.setup_fixture();self.mock('tinapple-config-generator','exit 1')
        self.runscript(script,ok=False);self.assertFalse((self.root/'etc/tinapple/.provisioned').exists())
        self.mock('tinapple-config-generator');self.runscript(script)
        self.assertEqual(self.log.read_text().count('ssh-keygen -A'),1)
    def test_firstboot_without_auth_key_never_prompts(self):
        script=self.setup_fixture()
        (self.root/'etc/tinapple/manifest.yaml').write_text('hostname: test-node\nservices: {}\n')
        self.runscript(script)
        self.assertNotIn('tailscale up',self.log.read_text())
        self.assertTrue((self.root/'etc/tinapple/.provisioned').exists())
    def test_post_health_failure_retains_recovery_point(self):
        self.mock('findmnt','if [[ $* == *FSTYPE* ]]; then echo btrfs; else echo /@; fi')
        self.mock('snapper','if [[ $* == *"--type post"* ]]; then echo 43; elif [[ $* == *create* ]]; then echo 42; fi')
        for cmd in ['tinapple-snapshot-boot','systemctl','tinapple-config-generator']: self.mock(cmd)
        script=REPO/'tinapple-maintenance/bin/tinapple-update-hook'
        self.runscript(script,'pre')
        self.mock('tinapple-health-check','exit 1')
        self.runscript(script,'post',ok=False)
        state=json.loads((self.root/'var/lib/tinapple/maintenance/last-transaction.json').read_text())
        self.assertEqual(state['pre'],'42'); self.assertEqual(state['post'],'43'); self.assertFalse(state['healthy'])
        self.assertFalse((self.root/'var/lib/tinapple/maintenance/transaction').exists())
    def test_health_reports_errors_without_stopping_early(self):
        self.mock('smartctl', '''if [[ $1 == --scan-open ]]; then echo '{"devices":[{"name":"/dev/nvme12n1","type":"nvme"}]}'; else echo '{"smart_status":{"passed":false}}'; exit 8; fi''')
        self.mock('findmnt',"echo btrfs")
        self.mock('btrfs',"echo '[/dev/nvme12n1].read_io_errs 2'")
        self.mock('systemctl','[[ $* != *docker* ]]')
        output=self.base/'health.json';self.env['TINAPPLE_HEALTH_OUTPUT']=str(output)
        self.runscript(REPO/'tinapple-maintenance/bin/tinapple-health-check',ok=False)
        data=json.loads(output.read_text());self.assertFalse(data['healthy']);self.assertEqual(data['summary']['fail'],3)
        self.assertEqual(len([c for c in data['checks'] if c['check'].startswith('service:')]),4)
    def test_pre_snapshot_failure_prevents_transaction_state(self):
        self.mock('findmnt','if [[ $* == *FSTYPE* ]]; then echo btrfs; else echo /@; fi')
        self.mock('snapper','if [[ $* == *create* ]]; then echo 42; fi')
        self.mock('tinapple-snapshot-boot','exit 1')
        script=REPO/'tinapple-maintenance/bin/tinapple-update-hook'
        self.runscript(script,'pre',ok=False)
        self.assertFalse((self.root/'var/lib/tinapple/maintenance/transaction').exists())
        self.mock('tinapple-snapshot-boot');self.runscript(script,'pre')
        self.assertEqual((self.root/'var/lib/tinapple/maintenance/transaction').read_text().strip(),'42')
        self.runscript(script,'pre',ok=False) # stale state is not silently overwritten
    def test_dry_runs_have_no_mutating_commands(self):
        self.runscript(REPO/'tinapple-firstboot/bin/tinapple-setup','--dry-run')
        self.runscript(REPO/'tinapple-maintenance/bin/tinapple-update-hook','pre','--dry-run')
        self.runscript(REPO/'tinapple-maintenance/bin/tinapple-rollback','list','--dry-run')
        self.runscript(REPO/'tinapple-maintenance/bin/tinapple-rollback','restore','42','--dry-run')
        self.assertFalse(self.log.exists())
        self.runscript(REPO/'tinapple-maintenance/bin/tinapple-rollback','restore','../bad','--dry-run',ok=False)
    def test_boot_entries_preserve_user_config_and_pin_kernel(self):
        boot=self.root/'boot';artifact=boot/'tinapple-recovery/42';artifact.mkdir(parents=True)
        (artifact/'vmlinuz-linux').write_bytes(b'kernel')
        (artifact/'initramfs-linux.img').write_bytes(b'initramfs')
        (artifact/'cmdline').write_text('root=UUID=root-id rootflags=subvol=@ ro quiet')
        (artifact/'ready').touch()
        import hashlib
        (artifact/'SHA256SUMS').write_text(''.join(hashlib.sha256((artifact/n).read_bytes()).hexdigest()+'  '+n+'\n' for n in ['vmlinuz-linux','initramfs-linux.img']))
        (boot/'limine.conf').write_text('/User entry\n    protocol: linux\n')
        (boot/'grub').mkdir();(boot/'grub/grub.cfg').write_text('source $prefix/custom.cfg')
        self.mock('findmnt', 'echo BOOT-UUID')
        for _ in range(2):
            result=subprocess.run(['python3',str(self.lib/'boot-menu.py'),str(self.root)],env=self.env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
        text=(boot/'limine.conf').read_text()
        self.assertIn('/User entry',text);self.assertEqual(text.count('# BEGIN TINAPPLE RECOVERY'),1)
        self.assertIn('rootflags=subvol=@tinapple-recovery-42 rw',text)
        self.assertIn('boot():/tinapple-recovery/42/vmlinuz-linux',text)
        self.assertIn('search --no-floppy --fs-uuid --set=root BOOT-UUID',(boot/'grub/custom.cfg').read_text())
        (artifact/'vmlinuz-linux').write_bytes(b'corrupted')
        result=subprocess.run(['python3',str(self.lib/'boot-menu.py'),str(self.root)],env=self.env,capture_output=True)
        self.assertNotEqual(result.returncode,0)
    def test_restore_refuses_live_root(self):
        self.env['TINAPPLE_ROOT']='/'
        result=self.runscript(REPO/'tinapple-maintenance/bin/tinapple-rollback','restore','42',ok=False)
        self.assertIn('Restore requires --root',result.stderr)
        self.assertFalse(self.log.exists())
if __name__=='__main__':unittest.main()
