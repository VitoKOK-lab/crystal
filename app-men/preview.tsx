"use client";

import { useEffect, useRef, useState } from "react";

export type PreviewPiece = { mm: number; src: string | null; metal: "gold" | "silver"; isCharm: boolean };

// 360° showcase preview.
// - Trackball rotation: yaw AND pitch are unlimited with inertia — the piece
//   tumbles freely in any direction and never hits a stop.
// - Soft cord: the loop is deformed by damped harmonic modes (radial and
//   out-of-plane), excited by spins, flicks and bead impacts, so the strand
//   flexes like elastic string instead of staying a rigid circle.
// - Bead chain: beads slide on the cord, collide with neighbours and clack
//   (Web Audio synthesised, pitch by bead size).
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
      if (actx.state === "suspended") actx.resume();
      // iOS Safari only unlocks hardware audio output for a context that has
      // actually started a source node during the originating gesture — just
      // constructing/resuming the context is not enough, so fire one silent blip.
      const unlock = actx.createBufferSource();
      unlock.buffer = actx.createBuffer(1, 1, actx.sampleRate);
      unlock.connect(actx.destination);
      unlock.start(0);
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

    // ---- soft cord: damped harmonic deformation modes ----
    type Mode = { m: number; ac: number; as: number; vc: number; vs: number; k: number; c: number; g: number };
    // "2x softer" tuning: half the spring stiffness, double the excitation
    // and double the allowed deformation, with lighter damping so the cord
    // wobbles visibly longer before settling back into a circle.
    const radialModes: Mode[] = [
      { m: 2, ac: 0, as: 0, vc: 0, vs: 0, k: 75, c: 4, g: 0.032 },
      { m: 3, ac: 0, as: 0, vc: 0, vs: 0, k: 190, c: 5.5, g: 0.018 },
    ];
    const planeModes: Mode[] = [
      { m: 2, ac: 0, as: 0, vc: 0, vs: 0, k: 60, c: 3.8, g: 0.028 },
      { m: 1, ac: 0, as: 0, vc: 0, vs: 0, k: 120, c: 4.8, g: 0.012 },
    ];
    const allModes = [...radialModes, ...planeModes];
    const clampAmp = (x: number) => Math.max(-0.22, Math.min(0.22, x));
    const ropeRadial = (phi: number) => { let d = 0; for (const md of radialModes) d += md.ac * Math.cos(md.m * phi) + md.as * Math.sin(md.m * phi); return Rmm * (1 + Math.max(-0.3, Math.min(0.3, d))); };
    const ropePlane = (phi: number) => { let d = 0; for (const md of planeModes) d += md.ac * Math.cos(md.m * phi) + md.as * Math.sin(md.m * phi); return Rmm * Math.max(-0.38, Math.min(0.38, d)); };

    // ---- view state: free trackball, unlimited on both axes ----
    let yaw = 0.6, yawVel = 0.45, prevYawVel = yawVel;
    let pitch = 0.42, pitchVel = 0, prevPitchVel = 0;
    let dragging = false, lastX = 0, lastY = 0, idleT = 0;

    const onDown = (e: PointerEvent) => { ensureAudio(); dragging = true; lastX = e.clientX; lastY = e.clientY; idleT = 0; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.011;
      yawVel = dx * 0.011 * 60;
      pitch += dy * 0.009;
      pitchVel = dy * 0.009 * 60;
      idleT = 0;
    };
    const onUp = () => {
      dragging = false;
      const speed = Math.abs(yawVel) + Math.abs(pitchVel);
      for (let i = 0; i < n; i++) v[i] += (hash(i + 3) - 0.5) * speed * Rmm * 0.5;
      for (let m = 0; m < allModes.length; m++) {
        allModes[m].vc += (hash(m + 11) - 0.5) * speed * 1.1;
        allModes[m].vs += (hash(m + 23) - 0.5) * speed * 1.1;
      }
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
        pitch += pitchVel * dt;
        yawVel *= Math.pow(0.34, dt);
        pitchVel *= Math.pow(0.3, dt);
        idleT += dt;
        if (idleT > 1.8) yawVel += (0.26 - yawVel) * Math.min(1, dt * 0.9);
      }
      const yawAcc = (yawVel - prevYawVel) / Math.max(dt, 1e-4);
      const pitchAcc = (pitchVel - prevPitchVel) / Math.max(dt, 1e-4);
      prevYawVel = yawVel;
      prevPitchVel = pitchVel;
      const stir = yawAcc + pitchAcc * 0.8;

      // soft cord integration, driven by rotation changes
      for (const md of allModes) {
        md.vc += (-md.k * md.ac - md.c * md.vc + stir * md.g) * dt;
        md.vs += (-md.k * md.as - md.c * md.vs - stir * md.g * 0.7) * dt;
        md.ac = clampAmp(md.ac + md.vc * dt);
        md.as = clampAmp(md.as + md.vs * dt);
      }

      // bead chain physics: inertia lag + differential friction → collisions
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
              // impacts make the soft cord shiver
              radialModes[0].vc += rv * 0.0012 * (hash(i) - 0.5);
              planeModes[0].vs += rv * 0.001 * (hash(i + 7) - 0.5);
            }
          }
        }
      }

      // ---- draw ----
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const minDim = Math.min(W, H);
      const s = (minDim * 0.56) / (2 * (Rmm + 12));
      const f = minDim * 1.7;
      const cx = W / 2, cy = H / 2 - minDim * 0.02;

      const sy = Math.sin(yaw), cyw = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const project = (phi: number, radiusScale = 1) => {
        const rad = ropeRadial(phi) * radiusScale;
        const x = Math.cos(phi) * rad, z = Math.sin(phi) * rad;
        const y0 = ropePlane(phi) * radiusScale;
        const x1 = x * cyw + z * sy, z1 = -x * sy + z * cyw;
        const y2 = y0 * cp - z1 * sp, z2 = y0 * sp + z1 * cp;
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

      // cord (drawn along the deformed soft shape)
      ctx.beginPath();
      for (let i = 0; i <= 130; i++) {
        const p = project((i / 130) * Math.PI * 2);
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
          const inner = project(phiOf(u[i]), 0.86);
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
        // Matches the studio view's bead-gap fix: real strung beads sit snug
        // with no cord visible between them, and a small 5mm spacer next to
        // a 10-20mm stone needs a bigger relative size boost than a flat
        // multiplier gives it, so its rendered (not physical) diameter is
        // floored before scaling.
        const d = Math.max(p.mm, 9) * 1.2 * s * proj.persp;
        const tphi = phiOf(u[i]);
        const t0 = project(tphi - 0.06), t1 = project(tphi + 0.06);
        const holeRot = Math.atan2(t1.y - t0.y, t1.x - t0.x);
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(holeRot);
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
    <div className="pv-hint">任意方向拖曳自由翻轉 · 無限旋轉 · 甩動讓軟繩晃動、珠子碰撞出聲</div>
  </div>;
}
