/**
 * Utility for automatic OS detection (Android / iOS / Desktop) and deep-linking into
 * native client applications (e.g. Tsumiru, Navic, Jellyfin, Bitwarden) instead of static APK downloads.
 */

export type ClientPlatform = 'android' | 'ios' | 'desktop';

export interface PlatformAppTarget {
  serviceId: string;
  name: string;
  label: string;
  title: string;
  appUrl: string;
  fallbackUrl?: string;
  downloadUrl?: string;
  platform: ClientPlatform;
}

export function detectClientPlatform(): ClientPlatform {
  if (typeof window === 'undefined' || !navigator) return 'desktop';
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

/**
 * Returns deep-link or web app target for supported services.
 */
export function getPlatformAppTarget(
  serviceName: string,
  webUrl?: string
): PlatformAppTarget | null {
  const norm = serviceName.toLowerCase().replace(/[-_.]/g, '');
  const platform = detectClientPlatform();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // 1. Tsumiru / Suwayomi Manga
  if (norm.includes('suwayomi') || norm.includes('tsumiru') || norm.includes('tachidesk') || norm.includes('manga')) {
    if (platform === 'android') {
      return {
        serviceId: 'tsumiru',
        name: 'Tsumiru',
        label: 'Open Tsumiru',
        title: 'Launch Tsumiru native manga app on your phone',
        appUrl: 'intent://open#Intent;scheme=tsumiru;package=org.tinapple.tsumiru;S.browser_fallback_url=' + encodeURIComponent(origin + '/tsumiru/') + ';end',
        fallbackUrl: origin + '/tsumiru/',
        downloadUrl: '/download/tsumiru',
        platform,
      };
    }
    if (platform === 'ios') {
      return {
        serviceId: 'tsumiru',
        name: 'Tsumiru',
        label: 'Open Tsumiru',
        title: 'Launch Tsumiru Web Reader on iOS',
        appUrl: origin + '/tsumiru/',
        fallbackUrl: origin + '/tsumiru/',
        platform,
      };
    }
    return {
      serviceId: 'tsumiru',
      name: 'Tsumiru Reader',
      label: 'Tsumiru Reader',
      title: 'Open Tsumiru offline-first web canvas manga reader',
      appUrl: origin + '/tsumiru/',
      downloadUrl: '/download/tsumiru',
      platform,
    };
  }

  // 2. Navidrome / Subsonic Music (Navic / Symfonium)
  if (norm.includes('navidrome') || norm.includes('music') || norm.includes('subsonic')) {
    if (platform === 'android') {
      return {
        serviceId: 'navidrome',
        name: 'Navic',
        label: 'Open Navic',
        title: 'Launch Navic or Subsonic music player on Android',
        appUrl: 'intent://open#Intent;scheme=navic;package=com.navic.music;S.browser_fallback_url=' + encodeURIComponent('https://play.google.com/store/apps/details?id=app.symfonik.music.player') + ';end',
        fallbackUrl: webUrl || (origin + '/navidrome/'),
        platform,
      };
    }
    if (platform === 'ios') {
      return {
        serviceId: 'navidrome',
        name: 'Substreamer',
        label: 'Open Substreamer',
        title: 'Launch Substreamer Subsonic music app on iOS',
        appUrl: 'substreamer://',
        fallbackUrl: 'https://apps.apple.com/app/substreamer/id1012991229',
        platform,
      };
    }
  }

  // 3. Jellyfin Media Player
  if (norm.includes('jellyfin')) {
    if (platform === 'android') {
      return {
        serviceId: 'jellyfin',
        name: 'Jellyfin Mobile',
        label: 'Open Jellyfin',
        title: 'Launch Jellyfin native app on Android',
        appUrl: 'intent://open#Intent;scheme=jellyfin;package=org.jellyfin.mobile;S.browser_fallback_url=' + encodeURIComponent(webUrl || origin + '/jellyfin/') + ';end',
        fallbackUrl: webUrl || (origin + '/jellyfin/'),
        platform,
      };
    }
    if (platform === 'ios') {
      return {
        serviceId: 'jellyfin',
        name: 'Jellyfin iOS',
        label: 'Open Jellyfin',
        title: 'Launch Jellyfin on iOS',
        appUrl: 'jellyfin://',
        fallbackUrl: 'https://apps.apple.com/app/jellyfin-mobile/id1480192618',
        platform,
      };
    }
  }

  // 4. Vaultwarden / Bitwarden Password Manager
  if (norm.includes('vaultwarden') || norm.includes('bitwarden')) {
    if (platform === 'android') {
      return {
        serviceId: 'vaultwarden',
        name: 'Bitwarden',
        label: 'Open Bitwarden',
        title: 'Launch Bitwarden password manager app on Android',
        appUrl: 'intent://open#Intent;scheme=bitwarden;package=com.x8bit.bitwarden;S.browser_fallback_url=' + encodeURIComponent(webUrl || origin + '/vault/') + ';end',
        fallbackUrl: webUrl || (origin + '/vault/'),
        platform,
      };
    }
    if (platform === 'ios') {
      return {
        serviceId: 'vaultwarden',
        name: 'Bitwarden',
        label: 'Open Bitwarden',
        title: 'Launch Bitwarden password manager on iOS',
        appUrl: 'bitwarden://',
        fallbackUrl: 'https://apps.apple.com/app/bitwarden-password-manager/id1137397744',
        platform,
      };
    }
  }

  // 5. Syncthing P2P File Sync
  if (norm.includes('syncthing')) {
    if (platform === 'android') {
      return {
        serviceId: 'syncthing',
        name: 'Syncthing',
        label: 'Open Syncthing',
        title: 'Launch Syncthing Android app',
        appUrl: 'intent://open#Intent;package=com.nutomic.syncthingandroid;end',
        fallbackUrl: webUrl || (origin + '/syncthing/'),
        platform,
      };
    }
    if (platform === 'ios') {
      return {
        serviceId: 'syncthing',
        name: 'Möbius Sync',
        label: 'Open Möbius',
        title: 'Launch Möbius Sync app on iOS',
        appUrl: 'mobiussync://',
        fallbackUrl: 'https://apps.apple.com/app/m%C3%B6bius-sync/id1539203216',
        platform,
      };
    }
  }

  return null;
}
