package com.zumelia.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

/**
 * Capacitor Browser plugins can fail to inject on remote HTTPS pages.
 * This JavascriptInterface still opens Chrome Custom Tabs for OAuth and
 * forwards zumelia:// deep links into the WebView when App plugin is missing.
 */
public class MainActivity extends BridgeActivity {
  public class ZumeliaNativeBridge {
    @JavascriptInterface
    public boolean isNative() {
      return true;
    }

    @JavascriptInterface
    public void openAuth(String url) {
      runOnUiThread(() -> openCustomTab(url));
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    enableEdgeToEdge();
    attachNativeBridge();
    handleAuthIntent(getIntent());
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
    // Default app theme is dark; JS StatusBar plugin updates icon style on theme change.
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
