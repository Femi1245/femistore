package com.zumelia.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

/**
 * Capacitor Browser plugins can fail to inject on remote HTTPS pages.
 * This JavascriptInterface still opens Chrome Custom Tabs for OAuth,
 * forwards zumelia:// deep links, and drives native live screen share
 * (MediaProjection → JPEG frames → WebView → LiveKit).
 */
public class MainActivity extends BridgeActivity {
  private ActivityResultLauncher<Intent> screenShareLauncher;
  private ActivityResultLauncher<String> notificationPermissionLauncher;
  private boolean pendingScreenShareAfterNotif;

  public class ZumeliaNativeBridge {
    @JavascriptInterface
    public boolean isNative() {
      return true;
    }

    @JavascriptInterface
    public boolean canScreenShare() {
      return true;
    }

    @JavascriptInterface
    public void openAuth(String url) {
      runOnUiThread(() -> openCustomTab(url));
    }

    @JavascriptInterface
    public void startScreenShare() {
      runOnUiThread(() -> MainActivity.this.requestScreenShare());
    }

    @JavascriptInterface
    public void stopScreenShare() {
      runOnUiThread(() -> MainActivity.this.stopScreenShareService());
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerScreenShareLaunchers();
    super.onCreate(savedInstanceState);
    enableEdgeToEdge();
    attachNativeBridge();
    bindScreenShareListener();
    handleAuthIntent(getIntent());
  }

  private void registerScreenShareLaunchers() {
    notificationPermissionLauncher =
      registerForActivityResult(
        new ActivityResultContracts.RequestPermission(),
        granted -> {
          if (pendingScreenShareAfterNotif) {
            pendingScreenShareAfterNotif = false;
            launchScreenCaptureIntent();
          }
        }
      );

    screenShareLauncher =
      registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
          if (result.getResultCode() != RESULT_OK || result.getData() == null) {
            emitScreenShareJs("onError", JSONObject.quote("Screen share permission denied"));
            return;
          }
          Intent svc = new Intent(this, ScreenCaptureService.class);
          svc.setAction(ScreenCaptureService.ACTION_START);
          svc.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.getResultCode());
          svc.putExtra(ScreenCaptureService.EXTRA_DATA, result.getData());
          ContextCompat.startForegroundService(this, svc);
        }
      );
  }

  private void bindScreenShareListener() {
    ScreenCaptureService.setListener(
      new ScreenCaptureService.Listener() {
        @Override
        public void onStarted() {
          emitScreenShareJs("onStart", null);
        }

        @Override
        public void onFrame(String base64Jpeg, int width, int height) {
          String js =
            "(function(){try{if(window.__zumeliaScreenShareOnFrame){window.__zumeliaScreenShareOnFrame(" +
            JSONObject.quote(base64Jpeg) +
            "," +
            width +
            "," +
            height +
            ");}}catch(e){}})();";
          runOnUiThread(() -> {
            Bridge bridge = getBridge();
            if (bridge != null && bridge.getWebView() != null) {
              bridge.getWebView().evaluateJavascript(js, null);
            }
          });
        }

        @Override
        public void onStopped() {
          emitScreenShareJs("onStop", null);
        }

        @Override
        public void onError(String message) {
          emitScreenShareJs(
            "onError",
            JSONObject.quote(message != null ? message : "Screen share failed")
          );
        }
      }
    );
  }

  private void requestScreenShare() {
    if (Build.VERSION.SDK_INT >= 33) {
      if (
        ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        pendingScreenShareAfterNotif = true;
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        return;
      }
    }
    launchScreenCaptureIntent();
  }

  private void launchScreenCaptureIntent() {
    try {
      MediaProjectionManager mpm =
        (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
      screenShareLauncher.launch(mpm.createScreenCaptureIntent());
    } catch (Exception e) {
      emitScreenShareJs(
        "onError",
        JSONObject.quote(
          e.getMessage() != null ? e.getMessage() : "Could not open screen share picker"
        )
      );
    }
  }

  private void stopScreenShareService() {
    Intent svc = new Intent(this, ScreenCaptureService.class);
    svc.setAction(ScreenCaptureService.ACTION_STOP);
    try {
      startService(svc);
    } catch (Exception ignored) {
      // service may already be stopped
    }
  }

  private void emitScreenShareJs(String event, String quotedArg) {
    String arg = quotedArg == null ? "" : quotedArg;
    String fn;
    switch (event) {
      case "onStart":
        fn = "__zumeliaScreenShareOnStart";
        break;
      case "onStop":
        fn = "__zumeliaScreenShareOnStop";
        break;
      default:
        fn = "__zumeliaScreenShareOnError";
        break;
    }
    String js =
      "(function(){try{if(window." +
      fn +
      "){window." +
      fn +
      "(" +
      arg +
      ");}}catch(e){}})();";
    runOnUiThread(() -> {
      Bridge bridge = getBridge();
      if (bridge != null && bridge.getWebView() != null) {
        bridge.getWebView().evaluateJavascript(js, null);
      }
    });
  }

  /** Draw WebView under status/nav bars — CSS env(safe-area-*) handles padding. */
  private void enableEdgeToEdge() {
    Window window = getWindow();
    WindowCompat.setDecorFitsSystemWindows(window, false);
    window.setStatusBarColor(Color.TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);
    View decor = window.getDecorView();
    WindowInsetsControllerCompat insets =
      new WindowInsetsControllerCompat(window, decor);
    insets.setAppearanceLightStatusBars(false);
    insets.setAppearanceLightNavigationBars(false);
  }

  @Override
  public void onStart() {
    super.onStart();
    attachNativeBridge();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleAuthIntent(intent);
  }

  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  private void attachNativeBridge() {
    Bridge bridge = getBridge();
    if (bridge == null) return;
    WebView webView = bridge.getWebView();
    if (webView == null) return;
    webView.getSettings().setJavaScriptEnabled(true);
    webView.addJavascriptInterface(new ZumeliaNativeBridge(), "ZumeliaNative");
  }

  private void openCustomTab(String url) {
    try {
      CustomTabsIntent intent =
        new CustomTabsIntent.Builder().setShowTitle(true).build();
      intent.launchUrl(this, Uri.parse(url));
    } catch (Exception e) {
      Bridge bridge = getBridge();
      if (bridge != null && bridge.getWebView() != null) {
        bridge.getWebView().loadUrl(url);
      }
    }
  }

  private void handleAuthIntent(Intent intent) {
    if (intent == null) return;
    Uri data = intent.getData();
    if (data == null) return;
    if (!"zumelia".equalsIgnoreCase(data.getScheme())) return;

    final String deepLink = data.toString();
    runOnUiThread(() -> {
      Bridge bridge = getBridge();
      if (bridge == null || bridge.getWebView() == null) return;
      try {
        String quoted = JSONObject.quote(deepLink);
        String js =
          "(function(){try{if(window.__zumeliaHandleAuthDeepLink){window.__zumeliaHandleAuthDeepLink(" +
          quoted +
          ");}else{window.__zumeliaPendingAuthDeepLink=" +
          quoted +
          ";}}catch(e){}})();";
        bridge.getWebView().evaluateJavascript(js, null);
      } catch (Exception ignored) {
        // no-op
      }
    });
  }
}
