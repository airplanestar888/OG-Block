"use client";

import { useEffect, useRef, useState } from "react";

/// Live "abyss" wallpaper — re-creation of the MetalForge recipe: sixteen grid
/// colors act as radial liquid light sources (Gaussian falloff) that gently
/// wobble and drift, with animated film grain and a vignette on top. The
/// canvas tracks devicePixelRatio, so grain and gradient stay equally sharp
/// on phones and desktops. Falls back to a static still when WebGL is
/// unavailable or motion is reduced.

const GRID_COLORS: string[] = [
  "#04051A", "#081757", "#1E5BFD", "#050824",
  "#143EB6", "#D3EDF7", "#071654", "#1D59F8",
  "#060E3A", "#1237A7", "#96E4FB", "#071551",
  "#2D95FF", "#060D35", "#103198", "#5ADCFE"
];

const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uC5;
uniform vec3 uC6;
uniform vec3 uC7;
uniform vec3 uC8;
uniform vec3 uC9;
uniform vec3 uC10;
uniform vec3 uC11;
uniform vec3 uC12;
uniform vec3 uC13;
uniform vec3 uC14;
uniform vec3 uC15;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// One liquid light source: radial Gaussian falloff around a slowly wobbling
// position. Weighted-average of all sources gives round liquid blobs that
// merge into each other — no cross/diamond streaking.
void blob(
  vec2 uv,
  vec2 pos,
  vec3 col,
  float sigma,
  float weight,
  float t,
  inout vec3 acc,
  inout float wsum
) {
  vec2 p = pos + 0.07 * vec2(
    sin(t * 0.31 + (pos.x + pos.y) * 9.0),
    cos(t * 0.23 + (pos.x - pos.y) * 7.0)
  );
  float d = distance(uv, p);
  float w = weight * exp(-d * d / (sigma * sigma));
  acc += col * w;
  wsum += w;
}

// Additive glow so bright sources genuinely bloom over the navy base instead
// of being averaged down to mud. Shares the blob wobble so they move as one.
void glow(
  vec2 uv,
  vec2 pos,
  vec3 tint,
  float sigma,
  float strength,
  float t,
  inout vec3 col
) {
  vec2 p = pos + 0.07 * vec2(
    sin(t * 0.31 + (pos.x + pos.y) * 9.0),
    cos(t * 0.23 + (pos.x - pos.y) * 7.0)
  );
  float d = distance(uv, p);
  col += tint * exp(-d * d / (sigma * sigma)) * strength;
}

void main() {
  float t = uTime;
  vec2 uv = vUv;

  // Liquid wobble of the sampling field + slow global drift.
  uv += 0.035 * vec2(sin(uv.y * 3.5 + t * 0.30), cos(uv.x * 3.0 + t * 0.26));
  uv += vec2(sin(t * 0.20) * 0.06, cos(t * 0.16) * 0.05);

  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  // Additive-light model: the deep navies only tint the base (tiny weight),
  // while the three bright sources bloom as large liquid ellipses over it.
  blob(uv, vec2(0.0, 0.0), uC0, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.333, 0.0), uC1, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.667, 0.0), uC2, 0.40, 1.2, t, acc, wsum);
  blob(uv, vec2(1.0, 0.0), uC3, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.0, 0.333), uC4, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.333, 0.333), uC5, 0.55, 1.5, t, acc, wsum);
  blob(uv, vec2(0.667, 0.333), uC6, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(1.0, 0.333), uC7, 0.40, 1.2, t, acc, wsum);
  blob(uv, vec2(0.0, 0.667), uC8, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.333, 0.667), uC9, 0.40, 1.2, t, acc, wsum);
  blob(uv, vec2(0.667, 0.667), uC10, 0.50, 1.4, t, acc, wsum);
  blob(uv, vec2(1.0, 0.667), uC11, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.0, 1.0), uC12, 0.40, 1.2, t, acc, wsum);
  blob(uv, vec2(0.333, 1.0), uC13, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(0.667, 1.0), uC14, 0.35, 0.3, t, acc, wsum);
  blob(uv, vec2(1.0, 1.0), uC15, 0.50, 1.3, t, acc, wsum);

  vec3 col = acc / max(wsum, 0.0001);

  // Bright liquid blooms over the base — the elliptical lights.
  glow(uv, vec2(0.333, 0.333), vec3(0.80, 0.90, 0.96), 0.42, 0.60, t, col);
  glow(uv, vec2(0.667, 0.667), vec3(0.55, 0.86, 0.95), 0.40, 0.50, t, col);
  glow(uv, vec2(1.0, 1.0), vec3(0.35, 0.82, 0.96), 0.38, 0.45, t, col);

  // Film fade lifts blacks toward the abyss base color.
  col = mix(col, vec3(0.016, 0.020, 0.102), 0.10);

  // Vignette.
  vec2 vc = vUv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.55;

  // Animated film grain, per device pixel.
  float g = hash(gl_FragCoord.xy + vec2(mod(t, 10.0) * 137.0));
  col += (g - 0.5) * 0.085;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb01(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  ];
}

export function AbyssWallpaper() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    function compile(type: number, source: string): WebGLShader {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        throw new Error(gl!.getShaderInfoLog(shader) || "shader compile failed");
      }
      return shader;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "link failed");
      }
      gl.useProgram(program);
    } catch {
      setFailed(true);
      return;
    }

    // Fullscreen triangle.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Grid colors as uniforms.
    GRID_COLORS.forEach((hex, index) => {
      const location = gl.getUniformLocation(program, `uC${index}`);
      const [r, g, b] = hexToRgb01(hex);
      gl.uniform3f(location, r, g, b);
    });

    const uTime = gl.getUniformLocation(program, "uTime");

    function resize(): void {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(window.innerWidth * dpr);
      const height = Math.round(window.innerHeight * dpr);
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
        gl!.viewport(0, 0, width, height);
      }
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;

    function draw() {
      gl!.uniform1f(uTime, (performance.now() - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function frame() {
      if (document.hidden) {
        raf = requestAnimationFrame(frame);
        return;
      }
      resize();
      draw();
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    if (reducedMotion) {
      resize();
      draw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (failed) {
    // Static fallback for no-WebGL browsers.
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[url('/wallpapers/profile-abyss.jpg')] bg-cover bg-center" />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
