package com.expensetracker.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AutoFetchPlugin")
public class AutoFetchPlugin extends Plugin {

    private static final String PREFS_NAME = "ExpenseTrackerPrefs";
    private static final String KEY_TOKEN = "jwt_token";
    private static final String KEY_API_URL = "api_url";

    @PluginMethod
    public void saveCredentials(PluginCall call) {
        String token = call.getString("token");
        String apiUrl = call.getString("apiUrl");

        if (token == null || apiUrl == null) {
            call.reject("Token and API URL are required");
            return;
        }

        SharedPreferences.Editor editor = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        editor.putString(KEY_TOKEN, token);
        editor.putString(KEY_API_URL, apiUrl);
        editor.apply();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getCredentials(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString(KEY_TOKEN, null);
        String apiUrl = prefs.getString(KEY_API_URL, null);

        JSObject ret = new JSObject();
        ret.put("token", token);
        ret.put("apiUrl", apiUrl);
        call.resolve(ret);
    }

    @PluginMethod
    public void isSMSPermissionGranted(PluginCall call) {
        boolean receiveSMS = ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean readSMS = ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        
        JSObject ret = new JSObject();
        ret.put("granted", receiveSMS && readSMS);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSMSPermission(PluginCall call) {
        ActivityCompat.requestPermissions(
            getActivity(),
            new String[]{Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS},
            12345
        );
        JSObject ret = new JSObject();
        ret.put("requested", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isNotificationListenerEnabled(PluginCall call) {
        boolean isEnabled = false;
        try {
            isEnabled = NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
        } catch (Exception e) {
            e.printStackTrace();
        }
        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationListenerPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
