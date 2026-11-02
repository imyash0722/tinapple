package org.tinapple.hub;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);

            JSObject ret = new JSObject();
            ret.put("packageName", context.getPackageName());
            ret.put("versionName", pInfo.versionName);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? pInfo.getLongVersionCode()
                : pInfo.versionCode;
            ret.put("versionCode", versionCode);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to retrieve package info: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("canInstall", canInstall);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Could not open install settings: " + e.getMessage(), e);
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("apkUrl is required");
            return;
        }

        // 1. Check install permission on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("status", "permission_requested");
                ret.put("message", "Permission required. Please enable 'Allow from this source' and retry update.");
                call.resolve(ret);
                return;
            }
        }

        // 2. Download APK in background thread
        new Thread(() -> {
            File tempApk = null;
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_MOVED_TEMP || responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == 307) {
                    String redirectUrl = connection.getHeaderField("Location");
                    connection = (HttpURLConnection) new URL(redirectUrl).openConnection();
                    connection.connect();
                }

                int fileLength = connection.getContentLength();
                InputStream input = new BufferedInputStream(connection.getInputStream());

                File cacheDir = getContext().getCacheDir();
                tempApk = new File(cacheDir, "tinapple-update.apk");
                if (tempApk.exists()) {
                    tempApk.delete();
                }

                OutputStream output = new FileOutputStream(tempApk);
                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (fileLength > 0 && now - lastProgressTime > 250) {
                        lastProgressTime = now;
                        int progress = (int) ((total * 100) / fileLength);
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", progress);
                        progressObj.put("total", total);
                        progressObj.put("length", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                output.flush();
                output.close();
                input.close();

                // 3. Launch System Package Installer via FileProvider
                File finalFile = tempApk;
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        Uri apkUri = FileProvider.getUriForFile(
                            getContext(),
                            getContext().getPackageName() + ".fileprovider",
                            finalFile
                        );

                        Intent installIntent = new Intent(Intent.ACTION_VIEW);
                        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(installIntent);

                        JSObject result = new JSObject();
                        result.put("status", "installer_launched");
                        call.resolve(result);
                    } catch (Exception ex) {
                        call.reject("Failed to trigger installer intent: " + ex.getMessage(), ex);
                    }
                });

            } catch (Exception e) {
                if (tempApk != null && tempApk.exists()) {
                    tempApk.delete();
                }
                new Handler(Looper.getMainLooper()).post(() ->
                    call.reject("APK download failed: " + e.getMessage(), e)
                );
            }
        }).start();
    }
}
