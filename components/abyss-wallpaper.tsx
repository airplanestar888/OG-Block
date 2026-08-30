"use client";

import { useEffect, useRef, useState } from "react";

/// Live "abyss" wallpaper: a 4x4 color grid (MetalForge recipe) sampled as a
/// bilinear texture on a fullscreen WebGL quad, drifting slowly, with
/// animated film grain and a vignette. The canvas tracks devicePixelRatio, so
/// the grain and gradient stay equally sharp on phones and desktops. Falls
/// back to the static still when WebGL is unavailable.

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
uniform sampler2D uGrid;
uniform float uTime;

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float t = uTime;
  vec2 uv = vUv;

  // Slow abyss drift + gentle breathing rotation around the center.
  vec2 drift = vec2(sin(t * 0.32) * 0.16, cos(t * 0.24) * 0.14);
  float ang = sin(t * 0.18) * 0.22 + (uv.y - 0.5) * 0.18 * sin(t * 0.11);
  uv = 0.5 + rot(ang) * (uv - 0.5);
  uv.y = 0.5 + (uv.y - 0.5) * (1.0 + 0.12 * sin(t * 0.2));

  // Inset keeps the sample inside the grid so drift never shows edge streaks.
  vec2 suv = clamp(uv * 0.85 + 0.075 + drift, vec2(0.002), vec2(0.998));
  vec3 col = texture2D(uGrid, suv).rgb;

  // Film fade lifts blacks toward the abyss base color.
  col = mix(col, vec3(0.016, 0.020, 0.102), 0.12);

  // Vignette.
  vec2 vc = vUv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.55;

  // Animated film grain, per device pixel.
  float g = hash(gl_FragCoord.xy + vec2(mod(t, 10.0) * 137.0));
  col += (g - 0.5) * 0.085;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
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

    // 4x4 color grid texture — GPU bilinear does the smooth gradient.
    const data = new Uint8Array(4 * 4 * 4);
    GRID_COLORS.forEach((hex, index) => {
      const [r, g, b] = hexToRgb(hex);
      data[index * 4] = r;
      data[index * 4 + 1] = g;
      data[index * 4 + 2] = b;
      data[index * 4 + 3] = 255;
    });
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uTime = gl.getUniformLocation(program, "uTime");

    function resize(): boolean {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(window.innerWidth * dpr);
      const height = Math.round(window.innerHeight * dpr);
      if (canvas!.width !== width || canvas!.height !== height) {
        canvas!.width = width;
        canvas!.height = height;
        gl!.viewport(0, 0, width, height);
        return true;
      }
      return false;
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
