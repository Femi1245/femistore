/**
 * Native Android screen share for the Capacitor APK.
 * WebView cannot use getDisplayMedia; MediaProjection frames are piped into a canvas stream.
 */

type ScreenShareNative = {
  canScreenShare?: () => boolean;
  startScreenShare?: () => void;
  stopScreenShare?: () => void;
};

type ScreenShareWindow = Window & {
  ZumeliaNative?: ScreenShareNative;
  __zumeliaScreenShareOnStart?: (() => void) | null;
  __zumeliaScreenShareOnStop?: (() => void) | null;
  __zumeliaScreenShareOnError?: ((message: string) => void) | null;
  __zumeliaScreenShareOnFrame?:
    | ((base64Jpeg: string, width: number, height: number) => void)
    | null;
};

let activeStream: MediaStream | null = null;
let activeCanvas: HTMLCanvasElement | null = null;

function getWin(): ScreenShareWindow | null {
  if (typeof window === "undefined") return null;
  return window as ScreenShareWindow;
}

export function isNativeScreenShareAvailable(): boolean {
  const native = getWin()?.ZumeliaNative;
  if (!native) return false;
  if (typeof native.startScreenShare !== "function") return false;
  if (typeof native.stopScreenShare !== "function") return false;
  try {
    if (typeof native.canScreenShare === "function" && !native.canScreenShare()) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

function clearHandlers() {
  const w = getWin();
  if (!w) return;
  w.__zumeliaScreenShareOnStart = null;
  w.__zumeliaScreenShareOnStop = null;
  w.__zumeliaScreenShareOnError = null;
  w.__zumeliaScreenShareOnFrame = null;
}

export function stopNativeScreenShare(): void {
  try {
    getWin()?.ZumeliaNative?.stopScreenShare?.();
  } catch {
    // ignore
  }
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
    activeStream = null;
  }
  activeCanvas = null;
  clearHandlers();
}

/**
 * Opens the Android screen-capture picker, then returns a MediaStream fed by
 * JPEG frames from the native MediaProjection service.
 */
export function createNativeScreenShareStream(): Promise<MediaStream> {
  const w = getWin();
  const native = w?.ZumeliaNative;
  if (!w || !native?.startScreenShare) {
    return Promise.reject(new Error("Native screen share is unavailable"));
  }

  stopNativeScreenShare();

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return Promise.reject(new Error("Could not create screen share canvas"));
  }

  const stream = canvas.captureStream(12);
  activeCanvas = canvas;
  activeStream = stream;

  const frameImage = new Image();
  let readySettled = false;

  return new Promise<MediaStream>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (readySettled) return;
      readySettled = true;
      stopNativeScreenShare();
      reject(new Error("Screen share timed out — allow capture when prompted"));
    }, 90_000);

    const succeed = () => {
      if (readySettled) return;
      readySettled = true;
      window.clearTimeout(timeout);
      resolve(stream);
    };

    const fail = (message: string) => {
      if (readySettled) return;
      readySettled = true;
      window.clearTimeout(timeout);
      stopNativeScreenShare();
      reject(new Error(message || "Screen share failed"));
    };

    w.__zumeliaScreenShareOnStart = () => succeed();
    w.__zumeliaScreenShareOnError = (message: string) => fail(message);
    w.__zumeliaScreenShareOnStop = () => {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      if (activeStream === stream) activeStream = null;
      clearHandlers();
    };
    w.__zumeliaScreenShareOnFrame = (base64Jpeg, width, height) => {
      if (!activeCanvas || activeCanvas !== canvas) return;
      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
      }
      frameImage.onload = () => {
        try {
          ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        } catch {
          // ignore draw races
        }
      };
      frameImage.src = `data:image/jpeg;base64,${base64Jpeg}`;
      // First frame also counts as ready if onStart was missed.
      if (!readySettled) succeed();
    };

    try {
      native.startScreenShare();
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not start screen share");
    }
  });
}
