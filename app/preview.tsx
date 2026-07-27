"use client";

import { useEffect, useRef, useState } from "react";

export type PreviewPiece = { mm: number; src: string | null; metal: "gold" | "silver"; isCharm: boolean };

// 360° showcase preview. No gravity: the tilt stays where you drag it and
// nothing sways or settles. Instead the beads themselves are simulated as a
// 1D chain sliding on the cord — spin changes make them drift, knock into
// their neighbours, and clack (Web Audio synthesised, pitch by bead size).
export default function Preview({ pieces, capacityMM, onClose }: { pieces: PreviewPiece[]; capacityMM: number; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { const b = canvas.getBoundingClientRect(); canvas.width = Math.max(1, b.width * dpr); canvas.height = Math.max(1, b.height * dpr); };
    resize();
    window.addEventListener("resize", resize);

    const images = pieces.map((p) => { if (!p.src) return null; const im = new Image(); im.src = p.src; return im; });

    // ---- audio: synthesised crystal clacks ----
    let actx: AudioContext | null = null;
    let noiseBuf: AudioBuffer | null = null;
    let lastClack = 0;
    const ensureAudio = () => {
      if (actx) { if (actx.state === "suspended") actx.resume(); return; }
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 0.06), actx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    };
    const clack = (impact: number, mm: number) => {
      if (!actx || !noiseBuf || mutedRef.current) return;
      const now = performance.now();
      if (now - lastClack < 26) return;
      lastClack = now;
      const t = actx.currentTime;
      const src = actx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = actx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1900 + (22 - mm) * 190 + Math.random() * 350;
      bp.Q.value = 8.5;
      const g = actx.createGain();
      const vol = Math.min(0.4, 0.05 + impact * 0.0011);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.075);
      src.connect(bp); bp.connect(g); g.connect(actx.destination);
      src.start(t); src.stop(t + 0.09);
    };

    // ---- bead chain state (positions in mm along the cord) ----
    const n = pieces.length;
    const widths = pieces.map((p) => p.mm);
    let cum = 0;
    const home = pieces.map((p) => { const c = cum + p.mm / 2; cum += p.mm; return c; });
    const u = [...home];
    const v = new Array(n).fill(0);
    const hash = (i: number) => ((i * 7919 + 104729) % 997) / 997;
    const frict = pieces.map((_, i) => 2.6 + hash(i) * 2.6);

    const Rmm = capacityMM / (Math.PI * 2);

    // ---- view state (no gravity: pitch stays where dragged) ----
    let yaw = 0.6, yawVel = 0.45, prevYawVel = yawVel;
    let pitch = 0.42;
    let dragging = false, lastX = 0, lastY = 0, idleT = 0;

    const onDown = (e: PointerEvent) => { ensureAudio(); dragging = true; lastX = e.clientX; lastY = e.clientY; idleT = 0; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.011;
      yawVel = dx * 0.011 * 60;
      pitch = Math.max(0.08, Math.min(1.35, pitch + dy * 0.007));
      idleT = 0;
    };
    const onUp = () => {
      dragging = false;
      // a flick jolts the beads so they audibly knock around
      for (let i = 0; i < n; i++) v[i] += (hash(i + 3) - 0.5) * Math.abs(yawVel) * Rmm * 0.55;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (!dragging) {
        yaw += yawVel * dt;
        yawVel *= Math.pow(0.34, dt);
        idleT += dt;
        if (idleT > 1.8) yawVel += (0.26 - yawVel) * Math.min(1, dt * 0.9);
      }
      const yawAcc = (yawVel - prevYawVel) / Math.max(dt, 1e-4);
      prevYawVel = yawVel;

      // ---- chain physics: inertia lag + differential friction → collisions ----
      for (let i = 0; i < n; i++) {
        const acc = -yawAcc * Rmm * 0.16 * (0.7 + hash(i) * 0.6) - v[i] * frict[i] + (home[i] - u[i]) * 6;
        v[i] += acc * dt;
        u[i] += v[i] * dt;
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const rawGap = (j === 0 ? u[j] + capacityMM : u[j]) - u[i];
          const gap = rawGap - (widths[i] + widths[j]) / 2;
          if (gap < 0) {
            u[i] += gap / 2; u[j] -= gap / 2;
            const rv = v[i] - v[j];
            if (rv > 8) {
              const avg = (v[i] + v[j]) / 2, e = 0.3;
              v[i] = avg - (v[i] - avg) * e;
              v[j] = avg - (v[j] - avg) * e;
              clack(rv, Math.max(widths[i], widths[j]));
            }
          }
        }
      }

      // ---- draw (white studio backdrop lives in CSS; canvas is clear) ----
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const minDim = Math.min(W, H);
      const s = (minDim * 0.56) / (2 * (Rmm + 12));
      const f = minDim * 1.7;
      const cx = W / 2, cy = H / 2 - minDim * 0.02;

      const sy = Math.sin(yaw), cyw = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const project = (phi: number, radius = Rmm) => {
        const x = Math.cos(phi) * radius, z = Math.sin(phi) * radius;
        const x1 = x * cyw + z * sy, z1 = -x * sy + z * cyw;
        const y2 = -z1 * sp, z2 = z1 * cp;
        const persp = f / (f - z2 * s);
        return { x: cx + x1 * s * persp, y: cy + y2 * s * persp, z: z2, persp };
      };
      const phiOf = (mm: number) => (mm / capacityMM) * Math.PI * 2 - Math.PI / 2;

      // soft floor shadow
      const shW = Rmm * 2.1 * s * (0.62 + 0.38 * Math.abs(sp));
      ctx.save();
      ctx.filter = "blur(" + 9 * dpr + "px)";
      ctx.fillStyle = "rgba(70,96,91,0.16)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + minDim * 0.3, shW / 2, shW * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // cord
      ctx.beginPath();
      for (let i = 0; i <= 110; i++) {
        const p = project((i / 110) * Math.PI * 2);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(150,140,125,0.5)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      const order = pieces.map((p, i) => ({ p, i, proj: project(phiOf(u[i])) })).sort((a, b) => a.proj.z - b.proj.z);
      for (const { p, i, proj } of order) {
        const img = images[i];
        const shade = 0.72 + 0.28 * ((proj.z / Rmm) + 1) / 2;
        if (p.isCharm) {
          // no gravity: the charm points radially outward and turns with the ring
          const inner = project(phiOf(u[i]), Rmm * 0.86);
          const dx = proj.x - inner.x, dy = proj.y - inner.y;
          const len = Math.hypot(dx, dy) || 1;
          const rot = Math.atan2(dy, dx) - Math.PI / 2;
          const d = 15 * s * proj.persp;
          ctx.save();
          ctx.translate(proj.x + (dx / len) * d * 0.55, proj.y + (dy / len) * d * 0.55);
          ctx.rotate(rot + Math.PI);
          ctx.shadowColor = "rgba(60,84,79,0.28)";
          ctx.shadowBlur = 6 * dpr;
          ctx.shadowOffsetY = 3 * dpr;
          ctx.globalAlpha = Math.min(1, shade + 0.15);
          if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -d / 2, -d / 2, d, d);
          else { ctx.fillStyle = p.metal === "gold" ? "#d8b25a" : "#c9ced0"; ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          continue;
        }
        const d = p.mm * s * proj.persp;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.shadowColor = "rgba(60,84,79,0.25)";
        ctx.shadowBlur = 5 * dpr;
        ctx.shadowOffsetY = 3 * dpr;
        ctx.globalAlpha = Math.min(1, shade + 0.1);
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -d / 2, -d / 2, d, d);
        else {
          const g = ctx.createRadialGradient(-d * 0.18, -d * 0.18, d * 0.08, 0, 0, d / 2);
          if (p.metal === "gold") { g.addColorStop(0, "#f6e3ae"); g.addColorStop(1, "#a8781f"); }
          else { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#8d9598"); }
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      actx?.close();
    };
  }, [pieces, capacityMM]);

  return <div className="preview-overlay" role="dialog" aria-label="360 度立體預覽">
    <div className="pv-head"><b>✨ 360° PREVIEW</b><span>立體預覽</span><button className="pv-sound" onClick={() => setMuted((m) => !m)} aria-label={muted ? "開啟碰撞音效" : "關閉碰撞音效"}>{muted ? "🔇" : "🔊"}</button><button className="pv-close" onClick={onClose} aria-label="關閉預覽">✕</button></div>
    <canvas ref={canvasRef} className="pv-canvas" />
    <div className="pv-hint">拖曳旋轉 · 甩動讓珠子碰撞出聲 · 上下改變視角</div>
  </div>;
}
