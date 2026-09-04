"use client";

import { useRef, useState, useEffect, type MouseEvent, type ReactNode } from "react";

// Liquid-hologram hero (in the spirit of Active Theory's Kandinsky piece):
// the whole picture is rendered on a WebGL canvas and warped by a fluid
// displacement field. Pointer movement injects a smooth splat whose strength
// follows pointer velocity; the field decays and leaves a trailing wake, so
// stirring the mouse makes the image undulate like ink under water and then
// settle. DOM overlays (scanlines, sheen, projector beam) stay on top, and
// the 3D tilt still applies to the whole frame. Falls back to a plain image
// when WebGL is unavailable or reduced motion is requested.
export function HoloImage({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<{
    gl: WebGLRenderingContext;
    tex: WebGLTexture;
    fieldA: { fb: WebGLFramebuffer; tex: WebGLTexture };
    fieldB: { fb: WebGLFramebuffer; tex: WebGLFramebuffer extends never ? never : WebGLTexture };
    fieldProg: WebGLProgram;
    drawProg: WebGLProgram;
    fieldUniforms: Record<string, WebGLUniformLocation | null>;
    drawUniforms: Record<string, WebGLUniformLocation | null>;
    w: number;
    h: number;
  } | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  const hover = useRef(false);
  const running = useRef(false);
  const rafRef = useRef(0);
  const lastT = useRef(0);
  const decayUntil = useRef(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50, active: false });
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  // ── WebGL setup ────────────────────────────────────────────
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWebglOk(false);
      return;
    }
    const canvas = canvasRef.current;
    const img = wrapRef.current?.querySelector("img");
    if (!canvas || !img) return;
    // preserveDrawingBuffer keeps the last frame on screen after the render
    // loop pauses — without it the picture vanishes when the mouse leaves.
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true
    });
    if (!gl) {
      setWebglOk(false);
      return;
    }
    setWebglOk(true);

    const compile = (src: string, type: number) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const link = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(vs, gl.VERTEX_SHADER));
      gl.attachShader(p, compile(fs, gl.FRAGMENT_SHADER));
      gl.linkProgram(p);
      return p;
    };

    const quadVs = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }`;

    // Field update: decay previous displacement, add a gaussian splat at the
    // pointer scaled by pointer velocity. Displacement stored as (v+1)/2.
    const fieldFs = `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uField;
      uniform vec2 uPointer;
      uniform vec2 uVel;
      uniform float uDecay;
      void main() {
        vec2 prev = texture2D(uField, vUv).xy * 2.0 - 1.0;
        prev *= uDecay;
        vec2 d = vUv - uPointer;
        d.x *= 1.6;
        float g = exp(-dot(d, d) * 42.0);
        prev += uVel * g;
        gl_FragColor = vec4(clamp(prev, -1.0, 1.0) * 0.5 + 0.5, 0.0, 1.0);
      }`;

    // Draw: warp the whole image by the field, plus a faint ambient wobble.
    const drawFs = `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform sampler2D uField;
      uniform float uTime;
      void main() {
        vec2 disp = texture2D(uField, vUv).xy * 2.0 - 1.0;
        vec2 wob = vec2(
          sin(vUv.y * 9.0 + uTime * 0.9),
          cos(vUv.x * 7.0 + uTime * 0.7)
        ) * 0.0022;
        vec2 uv = vUv + disp * 0.055 + wob;
        gl_FragColor = texture2D(uTex, clamp(uv, 0.001, 0.999));
      }`;

    const fieldProg = link(quadVs, fieldFs);
    const drawProg = link(quadVs, drawFs);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const bindQuad = (prog: WebGLProgram) => {
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    const makeTarget = (size: number) => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0.5, 0.5, 0.5, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fb, tex };
    };

    const imageTex = gl.createTexture()!;
    let ready = false;
    const drawStatic = () => {
      const S = glRef.current;
      if (!S) return;
      gl.viewport(0, 0, S.w, S.h);
      gl.useProgram(S.drawProg);
      (S as unknown as { bindQuad: (p: WebGLProgram) => void }).bindQuad(S.drawProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, S.tex);
      gl.uniform1i(S.drawUniforms.uTex!, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, S.fieldA.tex);
      gl.uniform1i(S.drawUniforms.uField!, 1);
      gl.uniform1f(S.drawUniforms.uTime!, performance.now() / 1000);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const load = () => {
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img as HTMLImageElement);
      ready = true;
      drawStatic();
    };
    if ((img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0) load();
    else (img as HTMLImageElement).addEventListener("load", load, { once: true });

    const SIZE = 256;
    const fieldA = makeTarget(SIZE);
    const fieldB = makeTarget(SIZE);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = Math.floor(parent.clientWidth * dpr);
      canvas.height = Math.floor(parent.clientHeight * dpr);
      if (glRef.current) {
        glRef.current.w = canvas.width;
        glRef.current.h = canvas.height;
      }
      if (ready) drawStatic();
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    glRef.current = {
      gl,
      tex: imageTex,
      fieldA,
      fieldB,
      fieldProg,
      drawProg,
      fieldUniforms: {
        uField: gl.getUniformLocation(fieldProg, "uField"),
        uPointer: gl.getUniformLocation(fieldProg, "uPointer"),
        uVel: gl.getUniformLocation(fieldProg, "uVel"),
        uDecay: gl.getUniformLocation(fieldProg, "uDecay")
      },
      drawUniforms: {
        uTex: gl.getUniformLocation(drawProg, "uTex"),
        uField: gl.getUniformLocation(drawProg, "uField"),
        uTime: gl.getUniformLocation(drawProg, "uTime")
      },
      w: canvas.width,
      h: canvas.height
    };
    (glRef.current as unknown as { bindQuad: (p: WebGLProgram) => void }).bindQuad = bindQuad;
    (glRef.current as unknown as { ready: () => boolean }).ready = () => ready;
    (glRef.current as unknown as { drawProgExtra: number }).drawProgExtra = SIZE;

    return () => {
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  // ── Render loop ────────────────────────────────────────────
  function tick(t: number) {
    const S = glRef.current;
    if (!S) return;
    const { gl } = S;
    const bindQuad = (S as unknown as { bindQuad: (p: WebGLProgram) => void }).bindQuad;
    const dt = lastT.current ? Math.min((t - lastT.current) / 1000, 0.05) : 0.016;
    lastT.current = t;

    // pointer velocity decays; wake fades ~1s after the mouse leaves
    pointer.current.vx *= 0.9;
    pointer.current.vy *= 0.9;
    const decaying = performance.now() < decayUntil.current;
    if (!hover.current && !decaying) {
      running.current = false;
      return;
    }

    gl.viewport(0, 0, 256, 256);
    gl.useProgram(S.fieldProg);
    bindQuad(S.fieldProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, S.fieldA.tex);
    gl.uniform1i(S.fieldUniforms.uField!, 0);
    gl.uniform2f(S.fieldUniforms.uPointer!, pointer.current.x, pointer.current.y);
    const speed = Math.hypot(pointer.current.vx, pointer.current.vy);
    const churn = hover.current ? 0.16 : 0;
    gl.uniform2f(
      S.fieldUniforms.uVel!,
      pointer.current.vx * churn,
      pointer.current.vy * churn
    );
    gl.uniform1f(S.fieldUniforms.uDecay!, Math.pow(0.9, dt * 60));
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.fieldB.fb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // swap
    const tmp = S.fieldA;
    glRef.current!.fieldA = S.fieldB;
    glRef.current!.fieldB = tmp;

    gl.viewport(0, 0, S.w, S.h);
    gl.useProgram(S.drawProg);
    bindQuad(S.drawProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, S.tex);
    gl.uniform1i(S.drawUniforms.uTex!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, S.fieldA.tex);
    gl.uniform1i(S.drawUniforms.uField!, 1);
    gl.uniform1f(S.drawUniforms.uTime!, t / 1000);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafRef.current = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (!running.current) {
      running.current = true;
      lastT.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el || webglOk === false) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const y = 1 - Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    pointer.current.vx += x - pointer.current.x;
    pointer.current.vy += y - pointer.current.y;
    pointer.current.x = x;
    pointer.current.y = y;
    hover.current = true;
    setTilt({
      rx: (0.5 - y) * 9,
      ry: (x - 0.5) * 11,
      px: x * 100,
      py: (1 - y) * 100,
      active: true
    });
    ensureLoop();
  }

  function onLeave() {
    hover.current = false;
    decayUntil.current = performance.now() + 1200;
    setTilt((h) => ({ ...h, rx: 0, ry: 0, active: false }));
    ensureLoop();
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative [perspective:1200px]"
    >
      <div
        className="relative transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      >
        <div className="nft-image-wrap overflow-hidden">
          {/* Source image: texture source for WebGL and the no-WebGL fallback */}
          {webglOk !== true ? (
            children
          ) : (
            <div className="hidden">
              {children}
            </div>
          )}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full ${webglOk === true ? "" : "invisible"}`}
          />

          {/* hologram scanlines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 4px)"
            }}
          />

          {/* iridescent sheen following the cursor — kept faint */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: tilt.active ? 0.19 : 0,
              mixBlendMode: "screen",
              background: `radial-gradient(120% 90% at ${tilt.px}% ${tilt.py}%, rgba(140,225,255,0.11) 0%, rgba(0,0,255,0.06) 42%, transparent 72%)`
            }}
          />

          {/* projector beam rising from the bottom (On Chain strip side) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{
              mixBlendMode: "screen",
              background:
                "linear-gradient(to top, rgba(140,225,255,0.30) 0%, rgba(0,0,255,0.10) 45%, transparent 100%)"
            }}
          />

          {/* glowing baseline at the bottom edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-cyan-200/80 shadow-[0_0_14px_2px_rgba(140,225,255,0.75)]"
          />
        </div>
      </div>
    </div>
  );
}
