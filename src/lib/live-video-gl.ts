import type { LiveVideoEffect } from "./live-video-effects";

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_texCoord;
}
`;

/** Real-time video filters — GPU shaders, animated grain, skin smooth (TikTok-style). */
const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_time;
uniform int u_effect;
varying vec2 v_uv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + u_time) * 43758.5453);
}

vec4 sampleBlur(vec2 uv, float radius) {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 off = vec2(x, y) * u_texelSize * radius;
      float w = 1.0 - length(vec2(x, y)) * 0.12;
      sum += texture2D(u_texture, uv + off) * w;
      total += w;
    }
  }
  return sum / total;
}

vec3 adjustSaturation(vec3 c, float sat) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), c, sat);
}

vec3 vignette(vec3 c, vec2 uv, float amount) {
  float d = distance(uv, vec2(0.5, 0.5));
  return c * (1.0 - d * amount);
}

vec3 filmGrain(vec3 c, vec2 uv) {
  float n = hash(uv * 1200.0) - 0.5;
  return c + n * 0.07;
}

void main() {
  vec4 src = texture2D(u_texture, v_uv);
  vec3 col = src.rgb;

  if (u_effect == 0) {
    gl_FragColor = src;
    return;
  }

  // 1 Beauty — skin smooth + warm lift
  if (u_effect == 1) {
    vec3 blur = sampleBlur(v_uv, 1.4).rgb;
    col = mix(src.rgb, blur, 0.42);
    col = col * vec3(1.07, 1.04, 1.02) + 0.012;
  }
  // 2 Smooth — stronger skin smooth
  else if (u_effect == 2) {
    vec3 blur = sampleBlur(v_uv, 2.2).rgb;
    col = mix(src.rgb, blur, 0.58);
    col = col * vec3(1.09, 1.05, 1.03) + 0.018;
  }
  // 3 Glow — soft bloom on highlights
  else if (u_effect == 3) {
    vec3 blur = sampleBlur(v_uv, 2.8).rgb;
    vec3 bloom = max(blur - 0.55, 0.0) * 1.8;
    col = mix(src.rgb, blur, 0.28) + bloom * 0.45;
    col *= 1.06;
  }
  // 4 Rose — pink beauty cam
  else if (u_effect == 4) {
    vec3 blur = sampleBlur(v_uv, 1.2).rgb;
    col = mix(src.rgb, blur, 0.35);
    col.r += 0.04;
    col.g += 0.01;
    col.b += 0.03;
    col = adjustSaturation(col, 1.12);
  }
  // 5 Sunset
  else if (u_effect == 5) {
    col.r = pow(col.r, 0.92) * 1.12;
    col.g = pow(col.g, 0.98) * 1.04;
    col.b *= 0.88;
    col = adjustSaturation(col, 1.35);
    col = vignette(col, v_uv, 0.55);
  }
  // 6 Golden
  else if (u_effect == 6) {
    col.r *= 1.1;
    col.g *= 1.05;
    col.b *= 0.92;
    col = adjustSaturation(col, 1.2);
  }
  // 7 Arctic
  else if (u_effect == 7) {
    col.r *= 0.92;
    col.g *= 0.98;
    col.b *= 1.12;
    col = adjustSaturation(col, 1.15);
  }
  // 8 Neon
  else if (u_effect == 8) {
    col = adjustSaturation(col, 2.1);
    col = (col - 0.5) * 1.35 + 0.5;
    col.r += 0.03;
    col.b += 0.05;
  }
  // 9 Pop
  else if (u_effect == 9) {
    col = adjustSaturation(col, 1.75);
    col = (col - 0.5) * 1.18 + 0.5;
    col *= 1.04;
  }
  // 10 Retro
  else if (u_effect == 10) {
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, 0.65);
    col.r += 0.06;
    col.g += 0.03;
    col = vignette(col, v_uv, 0.65);
  }
  // 11 Film — moving grain (video-native)
  else if (u_effect == 11) {
    col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), 0.25);
    col = (col - 0.5) * 1.1 + 0.48;
    col = filmGrain(col, v_uv);
    col = vignette(col, v_uv, 0.5);
  }
  // 12 B&W
  else if (u_effect == 12) {
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = vec3(g);
    col = (col - 0.5) * 1.15 + 0.5;
  }
  // 13 Drama
  else if (u_effect == 13) {
    col = adjustSaturation(col, 0.82);
    col = (col - 0.5) * 1.45 + 0.46;
    col = vignette(col, v_uv, 0.85);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
}
`;

export const EFFECT_SHADER_INDEX: Record<LiveVideoEffect, number> = {
  none: 0,
  beauty: 1,
  smooth: 2,
  glow: 3,
  rose: 4,
  sunset: 5,
  warm: 6,
  cool: 7,
  neon: 8,
  vivid: 9,
  vintage: 10,
  film: 11,
  mono: 12,
  dramatic: 13,
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function sourceDimensions(source: TexImageSource): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth, h: source.naturalHeight };
  }
  if (source instanceof HTMLCanvasElement) {
    return { w: source.width, h: source.height };
  }
  if (source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  return { w: 0, h: 0 };
}

export type LiveVideoGLPipeline = {
  render: (video: HTMLVideoElement, effect: LiveVideoEffect, timeMs: number) => boolean;
  renderStill: (source: TexImageSource, effect: LiveVideoEffect, timeMs?: number) => boolean;
  destroy: () => void;
};

export function createLiveVideoGLPipeline(canvas: HTMLCanvasElement): LiveVideoGLPipeline | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = createProgram(gl);
  } catch {
    return null;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const texCoordBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
    gl.STATIC_DRAW,
  );

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const aPos = gl.getAttribLocation(program, "a_position");
  const aTex = gl.getAttribLocation(program, "a_texCoord");
  const uTexture = gl.getUniformLocation(program, "u_texture");
  const uTexelSize = gl.getUniformLocation(program, "u_texelSize");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uEffect = gl.getUniformLocation(program, "u_effect");

  gl.useProgram(program);

  const drawFrame = (
    source: TexImageSource,
    effect: LiveVideoEffect,
    timeMs: number,
    readyCheck?: () => boolean,
  ) => {
    const { w, h } = sourceDimensions(source);
    if (w <= 0 || h <= 0 || (readyCheck && !readyCheck())) return false;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(uTexture, 0);
    gl.uniform2f(uTexelSize, 1 / w, 1 / h);
    gl.uniform1f(uTime, timeMs * 0.001);
    gl.uniform1i(uEffect, EFFECT_SHADER_INDEX[effect]);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  };

  return {
    render(video: HTMLVideoElement, effect: LiveVideoEffect, timeMs: number) {
      return drawFrame(video, effect, timeMs, () => video.readyState >= 2);
    },

    renderStill(source: TexImageSource, effect: LiveVideoEffect, timeMs = 0) {
      return drawFrame(source, effect, timeMs);
    },

    destroy() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(texCoordBuf);
      gl.deleteProgram(program);
    },
  };
}

type VideoFrameCallbackMetadata = { mediaTime: number; presentedFrames: number };

type VideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    cb: (now: number, metadata: VideoFrameCallbackMetadata) => void,
  ) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/** Frame-synced render loop — matches camera frames (smoother than plain rAF). */
export function startVideoFrameLoop(
  video: HTMLVideoElement,
  onFrame: (timeMs: number) => void,
): () => void {
  let cancelled = false;
  let raf = 0;
  let vfc = 0;
  const v = video as VideoElementWithFrameCallback;

  const tickRaf = (t: number) => {
    if (cancelled) return;
    onFrame(t);
    raf = requestAnimationFrame(tickRaf);
  };

  const tickVfc = (t: number) => {
    if (cancelled) return;
    onFrame(t);
    if (v.requestVideoFrameCallback) {
      vfc = v.requestVideoFrameCallback(tickVfc);
    }
  };

  void video.play().then(() => {
    if (cancelled) return;
    if (v.requestVideoFrameCallback) {
      vfc = v.requestVideoFrameCallback(tickVfc);
    } else {
      raf = requestAnimationFrame(tickRaf);
    }
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    if (v.cancelVideoFrameCallback && vfc) v.cancelVideoFrameCallback(vfc);
  };
}
