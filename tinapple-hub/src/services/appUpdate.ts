import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface AppInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
}

export interface DownloadProgress {
  progress: number;
  total: number;
  length: number;
}

export interface AppUpdatePluginInterface {
  getAppInfo(): Promise<AppInfo>;
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstall(options: { apkUrl: string }): Promise<{ status: string; message?: string }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (progress: DownloadProgress) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const NativeAppUpdate = registerPlugin<AppUpdatePluginInterface>('AppUpdate');

export const AppUpdateService = {
  isNativeAndroid: (): boolean => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  getAppInfo: async (): Promise<AppInfo | null> => {
    if (!AppUpdateService.isNativeAndroid()) return null;
    try {
      return await NativeAppUpdate.getAppInfo();
    } catch {
      return null;
    }
  },

  installApk: async (
    apkUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; status: string; error?: string }> => {
    if (!AppUpdateService.isNativeAndroid()) {
      return { success: false, status: 'not_supported', error: 'Not running on Android' };
    }

    let listener: PluginListenerHandle | null = null;
    try {
      if (onProgress) {
        listener = await NativeAppUpdate.addListener('downloadProgress', (data) => {
          onProgress(data.progress);
        });
      }

      const res = await NativeAppUpdate.downloadAndInstall({ apkUrl });
      return { success: true, status: res.status };
    } catch (e: any) {
      return { success: false, status: 'error', error: e?.message || 'Download failed' };
    } finally {
      if (listener) {
        listener.remove();
      }
    }
  },
};
