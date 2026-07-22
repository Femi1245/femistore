package com.zumelia.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

/**
 * Captures the device display via MediaProjection and pushes JPEG frames to
 * MainActivity → WebView for LiveKit screen share (WebView has no getDisplayMedia).
 */
public class ScreenCaptureService extends Service {
  public static final String ACTION_START = "com.zumelia.app.action.SCREEN_SHARE_START";
  public static final String ACTION_STOP = "com.zumelia.app.action.SCREEN_SHARE_STOP";
  public static final String EXTRA_RESULT_CODE = "resultCode";
  public static final String EXTRA_DATA = "data";

  private static final String TAG = "ZumeliaScreenShare";
  private static final String CHANNEL_ID = "zumelia_screen_share";
  private static final int NOTIF_ID = 7101;
  private static final int MAX_WIDTH = 720;
  private static final long MIN_FRAME_INTERVAL_MS = 100; // ~10 fps

  public interface Listener {
    void onStarted();

    void onFrame(String base64Jpeg, int width, int height);

    void onStopped();

    void onError(String message);
  }

  private static Listener listener;

  public static void setListener(Listener l) {
    listener = l;
  }

  private MediaProjection mediaProjection;
  private VirtualDisplay virtualDisplay;
  private ImageReader imageReader;
  private HandlerThread captureThread;
  private Handler captureHandler;
  private int captureWidth;
  private int captureHeight;
  private long lastFrameAt;
  private boolean running;

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      stopSelf();
      return START_NOT_STICKY;
    }

    String action = intent.getAction();
    if (ACTION_STOP.equals(action)) {
      stopCapture("stopped");
      return START_NOT_STICKY;
    }

    if (!ACTION_START.equals(action)) {
      return START_NOT_STICKY;
    }

    int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
    Intent data;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      data = intent.getParcelableExtra(EXTRA_DATA, Intent.class);
    } else {
      data = intent.getParcelableExtra(EXTRA_DATA);
    }
    if (data == null) {
      notifyError("Missing screen-capture permission data");
      stopSelf();
      return START_NOT_STICKY;
    }

    try {
      createNotificationChannel();
      Notification notification = buildNotification();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIF_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        );
      } else {
        startForeground(NOTIF_ID, notification);
      }
    } catch (Exception e) {
      Log.e(TAG, "startForeground failed", e);
      notifyError("Could not start screen share service");
      stopSelf();
      return START_NOT_STICKY;
    }

    try {
      MediaProjectionManager mpm =
        (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
      mediaProjection = mpm.getMediaProjection(resultCode, data);
      if (mediaProjection == null) {
        notifyError("Screen capture permission expired — try again");
        stopCapture(null);
        return START_NOT_STICKY;
      }

      mediaProjection.registerCallback(
        new MediaProjection.Callback() {
          @Override
          public void onStop() {
            stopCapture("permission revoked");
          }
        },
        null
      );

      startCapture();
      running = true;
      if (listener != null) listener.onStarted();
    } catch (Exception e) {
      Log.e(TAG, "start capture failed", e);
      notifyError(
        e.getMessage() != null ? e.getMessage() : "Could not start screen capture"
      );
      stopCapture(null);
    }

    return START_STICKY;
  }

  private void startCapture() {
    DisplayMetrics metrics = new DisplayMetrics();
    WindowManager wm = (WindowManager) getSystemService(WINDOW_SERVICE);
    wm.getDefaultDisplay().getRealMetrics(metrics);

    int srcW = Math.max(metrics.widthPixels, 2);
    int srcH = Math.max(metrics.heightPixels, 2);
    float scale = Math.min(1f, (float) MAX_WIDTH / (float) srcW);
    captureWidth = Math.max(2, Math.round(srcW * scale) & ~1);
    captureHeight = Math.max(2, Math.round(srcH * scale) & ~1);
    int density = metrics.densityDpi;

    captureThread = new HandlerThread("ZumeliaScreenCapture");
    captureThread.start();
    captureHandler = new Handler(captureThread.getLooper());

    imageReader =
      ImageReader.newInstance(
        captureWidth,
        captureHeight,
        PixelFormat.RGBA_8888,
        2
      );
    imageReader.setOnImageAvailableListener(this::onImageAvailable, captureHandler);

    virtualDisplay =
      mediaProjection.createVirtualDisplay(
        "zumelia-live-share",
        captureWidth,
        captureHeight,
        density,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        imageReader.getSurface(),
        null,
        captureHandler
      );
  }

  private void onImageAvailable(ImageReader reader) {
    if (!running) return;
    long now = System.currentTimeMillis();
    if (now - lastFrameAt < MIN_FRAME_INTERVAL_MS) {
      Image skip = reader.acquireLatestImage();
      if (skip != null) skip.close();
      return;
    }

    Image image = null;
    try {
      image = reader.acquireLatestImage();
      if (image == null) return;
      lastFrameAt = now;

      Bitmap bitmap = imageToBitmap(image);
      if (bitmap == null) return;

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      bitmap.compress(Bitmap.CompressFormat.JPEG, 55, out);
      bitmap.recycle();
      String b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
      if (listener != null) {
        listener.onFrame(b64, captureWidth, captureHeight);
      }
    } catch (Exception e) {
      Log.w(TAG, "frame encode failed", e);
    } finally {
      if (image != null) image.close();
    }
  }

  private static Bitmap imageToBitmap(Image image) {
    Image.Plane[] planes = image.getPlanes();
    if (planes.length == 0) return null;
    ByteBuffer buffer = planes[0].getBuffer();
    int pixelStride = planes[0].getPixelStride();
    int rowStride = planes[0].getRowStride();
    int width = image.getWidth();
    int height = image.getHeight();
    int rowPadding = rowStride - pixelStride * width;

    Bitmap bitmap =
      Bitmap.createBitmap(
        width + rowPadding / pixelStride,
        height,
        Bitmap.Config.ARGB_8888
      );
    bitmap.copyPixelsFromBuffer(buffer);
    if (bitmap.getWidth() != width || bitmap.getHeight() != height) {
      Bitmap cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height);
      bitmap.recycle();
      return cropped;
    }
    return bitmap;
  }

  private void stopCapture(String reason) {
    running = false;
    try {
      if (virtualDisplay != null) {
        virtualDisplay.release();
        virtualDisplay = null;
      }
    } catch (Exception ignored) {}
    try {
      if (imageReader != null) {
        imageReader.close();
        imageReader = null;
      }
    } catch (Exception ignored) {}
    try {
      if (mediaProjection != null) {
        mediaProjection.stop();
        mediaProjection = null;
      }
    } catch (Exception ignored) {}
    try {
      if (captureThread != null) {
        captureThread.quitSafely();
        captureThread = null;
        captureHandler = null;
      }
    } catch (Exception ignored) {}

    stopForeground(true);
    stopSelf();
    if (listener != null) {
      if (reason != null && reason.startsWith("permission")) {
        listener.onError("Screen sharing stopped");
      }
      listener.onStopped();
    }
  }

  private void notifyError(String message) {
    if (listener != null) listener.onError(message);
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationChannel channel =
      new NotificationChannel(
        CHANNEL_ID,
        "Screen sharing",
        NotificationManager.IMPORTANCE_LOW
      );
    channel.setDescription("Shown while Zumelia Live is sharing your screen");
    NotificationManager nm = getSystemService(NotificationManager.class);
    if (nm != null) nm.createNotificationChannel(channel);
  }

  private Notification buildNotification() {
    Intent open = new Intent(this, MainActivity.class);
    open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi =
      PendingIntent.getActivity(
        this,
        0,
        open,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

    Intent stop = new Intent(this, ScreenCaptureService.class);
    stop.setAction(ACTION_STOP);
    PendingIntent stopPi =
      PendingIntent.getService(
        this,
        1,
        stop,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Zumelia is sharing your screen")
      .setContentText("Viewers on your live can see your display")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pi)
      .addAction(0, "Stop sharing", stopPi)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build();
  }

  @Override
  public void onDestroy() {
    stopCapture(null);
    super.onDestroy();
  }
}
