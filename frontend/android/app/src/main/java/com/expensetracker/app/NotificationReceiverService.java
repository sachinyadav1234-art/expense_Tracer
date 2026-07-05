package com.expensetracker.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class NotificationReceiverService extends NotificationListenerService {
    private static final String TAG = "NotificationReceiver";
    private static final String PREFS_NAME = "ExpenseTrackerPrefs";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        CharSequence titleCharSeq = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCharSeq = notification.extras.getCharSequence(Notification.EXTRA_TEXT);

        String title = titleCharSeq != null ? titleCharSeq.toString() : "";
        String text = textCharSeq != null ? textCharSeq.toString() : "";
        long timestamp = sbn.getPostTime();

        // Standard payment apps package names and content checks
        // com.google.android.apps.nbu.paisa.user = Google Pay (India)
        // com.phonepe.app = PhonePe
        // net.one97.paytm = Paytm
        // com.whatsapp = WhatsApp (checks text for "paid", "received")
        // or any banking app package names (usually contain "bank", "pay", "card")
        String textLower = text.toLowerCase();
        boolean isPaymentRelated = packageName.contains("paisa") || 
                                  packageName.contains("phonepe") || 
                                  packageName.contains("paytm") || 
                                  packageName.contains("bank") || 
                                  packageName.contains("card") || 
                                  textLower.contains("debited") ||
                                  textLower.contains("credited") ||
                                  textLower.contains("spent") ||
                                  textLower.contains("paid") ||
                                  textLower.contains("received");

        if (isPaymentRelated) {
            Log.d(TAG, "Payment notification intercepted from: " + packageName + ", Title: " + title + ", Text: " + text);
            sendToBackend(getApplicationContext(), packageName, title, text, timestamp);
        }
    }

    private void sendToBackend(Context context, String packageName, String title, String text, long timestamp) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString("jwt_token", null);
        String apiUrl = prefs.getString("api_url", null);

        if (token == null || apiUrl == null) {
            Log.d(TAG, "Credentials not found in SharedPreferences, skipping");
            return;
        }

        new Thread(() -> {
            try {
                URL url = new URL(apiUrl + "/transactions/auto-detect");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setDoOutput(true);

                JSONObject jsonParam = new JSONObject();
                jsonParam.put("notificationTitle", title);
                jsonParam.put("notificationBody", text);
                jsonParam.put("packageName", packageName);
                jsonParam.put("timestamp", timestamp);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonParam.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Notification send result: HTTP " + code);
            } catch (Exception e) {
                Log.e(TAG, "Error sending Notification to backend", e);
            }
        }).start();
    }
}
