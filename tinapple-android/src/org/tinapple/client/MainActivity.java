package org.tinapple.client;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String PREFS_NAME = "TinapplePrefs";
    private static final String KEY_SERVER_URL = "server_url";

    // Presets
    public static final String SERVER_TAILSCALE_HTTPS = "https://tinapple-server.tail3dee69.ts.net";
    public static final String SERVER_LOCAL_WIFI = "https://192.168.1.17";
    public static final String SERVER_TAILSCALE_IP = "https://100.67.207.60";
    public static final String SERVER_DIRECT_ETH = "http://192.168.99.1:8088";

    private WebView mWebView;
    private ProgressBar mProgressBar;
    private LinearLayout mErrorLayout;
    private TextView mCurrentServerUrl;
    private Button mBtnRetry;
    private Button mBtnServerSelect;

    private SharedPreferences mPrefs;
    private String mActiveUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        mActiveUrl = mPrefs.getString(KEY_SERVER_URL, SERVER_TAILSCALE_HTTPS);

        mWebView = findViewById(R.id.webView);
        mProgressBar = findViewById(R.id.progressBar);
        mErrorLayout = findViewById(R.id.errorLayout);
        mCurrentServerUrl = findViewById(R.id.currentServerUrl);
        mBtnRetry = findViewById(R.id.btnRetry);
        mBtnServerSelect = findViewById(R.id.btnServerSelect);

        mCurrentServerUrl.setText(mActiveUrl);

        configureWebView();

        mBtnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mErrorLayout.setVisibility(View.GONE);
                mWebView.setVisibility(View.VISIBLE);
                mWebView.loadUrl(mActiveUrl);
            }
        });

        mBtnServerSelect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showServerSelectorDialog();
            }
        });

        mWebView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                // Quick shortcut to open server picker if user long presses
                return false;
            }
        });

        // Load active server
        mWebView.loadUrl(mActiveUrl);
    }

    private void configureWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Custom User Agent identifier
        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " TinappleMobileClient/1.0");

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    mProgressBar.setVisibility(View.VISIBLE);
                    mProgressBar.setProgress(newProgress);
                } else {
                    mProgressBar.setVisibility(View.GONE);
                }
            }
        });

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                mProgressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mProgressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showErrorScreen("Network Error (" + error.getErrorCode() + ")");
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Trust local home-lab & tailscale certificates
                handler.proceed();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep tinapple internal dashboard navigation inside webview
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                return false;
            }
        });

        mWebView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimeType);
                    request.setDescription("Downloading file from Tinapple Station...");
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setTitle(filename);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(request);
                        Toast.makeText(MainActivity.this, "Downloading: " + filename, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Download error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    private void showErrorScreen(String message) {
        mWebView.setVisibility(View.GONE);
        mErrorLayout.setVisibility(View.VISIBLE);
        mCurrentServerUrl.setText(mActiveUrl);
    }

    private void showServerSelectorDialog() {
        final String[] options = new String[]{
                "🔒 Tailscale HTTPS (tinapple-server.tail3dee69.ts.net)",
                "📶 Local Wi-Fi (192.168.1.17)",
                "🍍 Tailscale Direct (100.67.207.60)",
                "🔌 Direct Ethernet (192.168.99.1:8088)",
                "✏️ Custom URL..."
        };

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Select Tinapple Server");
        builder.setItems(options, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                switch (which) {
                    case 0:
                        setNewServerUrl(SERVER_TAILSCALE_HTTPS);
                        break;
                    case 1:
                        setNewServerUrl(SERVER_LOCAL_WIFI);
                        break;
                    case 2:
                        setNewServerUrl(SERVER_TAILSCALE_IP);
                        break;
                    case 3:
                        setNewServerUrl(SERVER_DIRECT_ETH);
                        break;
                    case 4:
                        promptCustomUrl();
                        break;
                }
            }
        });
        builder.show();
    }

    private void promptCustomUrl() {
        final EditText input = new EditText(this);
        input.setText(mActiveUrl);
        input.setSingleLine();

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Enter Server URL");
        builder.setView(input);
        builder.setPositiveButton("Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String custom = input.getText().toString().trim();
                if (!custom.isEmpty()) {
                    if (!custom.startsWith("http://") && !custom.startsWith("https://")) {
                        custom = "http://" + custom;
                    }
                    setNewServerUrl(custom);
                }
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void setNewServerUrl(String url) {
        mActiveUrl = url;
        mPrefs.edit().putString(KEY_SERVER_URL, url).apply();
        mErrorLayout.setVisibility(View.GONE);
        mWebView.setVisibility(View.VISIBLE);
        mCurrentServerUrl.setText(url);
        mWebView.loadUrl(url);
        Toast.makeText(this, "Connecting to: " + url, Toast.LENGTH_SHORT).show();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
