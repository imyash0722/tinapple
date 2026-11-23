package org.tinapple.hub.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.tinapple.hub.MainActivity
import org.tinapple.hub.R
import org.tinapple.hub.network.DiscoveryEngine
import org.tinapple.hub.utils.ClientAppLauncher

class TinappleAppWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_LAUNCH_CLIENT) {
            val serviceKey = intent.getStringExtra(EXTRA_SERVICE_KEY) ?: return
            val serverOrigin = DiscoveryEngine.getCachedServerOrigin(context)
            val portalUrl = when (serviceKey) {
                "suwayomi" -> "$serverOrigin/suwayomi/"
                "jellyfin" -> "$serverOrigin/jellyfin/"
                "navidrome" -> "$serverOrigin/navidrome/"
                "pinemusic" -> "$serverOrigin/pinemusic/"
                else -> serverOrigin
            }
            ClientAppLauncher.launchByServiceKey(
                context = context,
                serviceKey = serviceKey,
                portalUrl = portalUrl,
                showToast = true
            )
        }
    }

    companion object {
        const val ACTION_LAUNCH_CLIENT = "org.tinapple.hub.widget.ACTION_LAUNCH_CLIENT"
        const val EXTRA_SERVICE_KEY = "extra_service_key"

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_tinapple)

            // 1. Root / Header click opens Main Dashboard
            val mainIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            val mainPendingIntent = PendingIntent.getActivity(
                context,
                0,
                mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_server_title, mainPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_status_pill, mainPendingIntent)

            // 2. Client Quick Launch Buttons
            views.setOnClickPendingIntent(
                R.id.widget_btn_tsumiru,
                createLaunchPendingIntent(context, "suwayomi", 101)
            )
            views.setOnClickPendingIntent(
                R.id.widget_btn_jellyfin,
                createLaunchPendingIntent(context, "jellyfin", 102)
            )
            views.setOnClickPendingIntent(
                R.id.widget_btn_navidrome,
                createLaunchPendingIntent(context, "navidrome", 103)
            )
            views.setOnClickPendingIntent(
                R.id.widget_btn_pinemusic,
                createLaunchPendingIntent(context, "pinemusic", 104)
            )

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun createLaunchPendingIntent(context: Context, serviceKey: String, requestCode: Int): PendingIntent {
            val intent = Intent(context, TinappleAppWidgetProvider::class.java).apply {
                action = ACTION_LAUNCH_CLIENT
                putExtra(EXTRA_SERVICE_KEY, serviceKey)
            }
            return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
