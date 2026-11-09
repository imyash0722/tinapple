import test from 'node:test';
import assert from 'node:assert/strict';

// Test service registry Ombi resolution logic
test('Ombi port and URL resolution in serviceRegistry', async () => {
  const { serviceRegistry } = await import('../src/services/serviceRegistry.ts');
  const ombi = serviceRegistry.get('ombi');
  assert.ok(ombi, 'Ombi service definition should exist');
  assert.equal(ombi.port, 5055, 'Default Ombi port must be 5055');

  // Test URL resolution with custom host
  const lanUrl = serviceRegistry.resolveUrl('ombi', '192.168.1.103');
  assert.equal(lanUrl, 'http://192.168.1.103:5055/', 'LAN URL must use port 5055');

  const tsUrl = serviceRegistry.resolveUrl('ombi', '100.67.207.60');
  assert.equal(tsUrl, 'http://100.67.207.60:5055/', 'Tailscale IP URL must use port 5055');

  assert.equal(serviceRegistry.resolveUrl('ombi', 'http://tinapple-server:8088'), 'http://tinapple-server:5055/');
  assert.equal(serviceRegistry.resolveUrl('ombi', 'https://tinapple-server.tail3dee69.ts.net'), 'http://100.67.207.60:5055/', 'Use an IP for HTTP portals to avoid the browser HTTPS upgrade on ts.net');
  assert.equal(serviceRegistry.resolveUrl('jellyfin', 'https://tinapple-server.tail3dee69.ts.net'), 'http://100.67.207.60:8096/', 'Preserve existing non-Ombi portal behavior');

  globalThis.localStorage = { getItem: () => null };
  globalThis.window = { location: new URL('https://tinapple-server.tail3dee69.ts.net/') };
  try {
    assert.equal(serviceRegistry.resolveUrl('ombi'), 'http://100.67.207.60:5055/');
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
