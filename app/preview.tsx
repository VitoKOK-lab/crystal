"use client";

import { useEffect, useRef } from "react";

export type PreviewPiece = { mm: number; src: string | null; metal: "gold" | "silver"; isCharm: boolean };

// Pseudo-3D physics preview: the strand is projected from ring space with
// perspective; yaw spins with inertia, pitch springs back like a hung object,
// an idle sway rolls the whole piece, and charms swing on their bails.
export default function Preview({ pieces, capacityMM, onClose }: { pieces: PreviewPiece[]; capacityMM: number; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // strand geometry: cumulative mm → angle around the ring
    const Rmm = capacityMM / (Math.PI * 2);
    let cum = 0;
    const angles = pieces.map((p) => { const center = cum + p.mm / 2; cum += p.mm; return (center / capacityMM) * Math.PI * 2 - Math.PI / 2; });

    // physics state
    let yaw = 0.6, yawVel = 0.5;
    const restPitch = 0.42;
    let pitch = restPitch + 0.5, pitchVel = 0;
    let roll = 0, rollVel = 0;
    let swing = 0, swingVel = 0;
    let dragging = false, lastX = 0, lastY = 0, idleT = 0, prevYawVel = yawVel;

    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; idleT = 0; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.011;
      yawVel = dx * 0.011 * 60;
      pitch = Math.max(0.05, Math.min(1.4, pitch + dy * 0.007));
      pitchVel = 0;
      idleT = 0;
    };
    const onUp = () => { dragging = false; };
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
        yawVel *= Math.pow(0.32, dt);
        idleT += dt;
        if (idleT > 1.8) yawVel += (0.28 - yawVel) * Math.min(1, dt * 0.9);
        pitchVel += (-16 * (pitch - restPitch) - 3.4 * pitchVel) * dt;
        pitch += pitchVel * dt;
      }
      rollVel += (-9 * roll - 2.6 * rollVel + (dragging ? 0 : Math.sin(now / 950) * 0.3)) * dt;
      roll += rollVel * dt;
      const yawAcc = (yawVel - prevYawVel) / Math.max(dt, 1e-4);
      prevYawVel = yawVel;
      swingVel += (-24 * Math.sin(swing) - 2.6 * swingVel - yawAcc * 0.05) * dt;
      swing += swingVel * dt;

      // ---- draw ----
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const minDim = Math.min(W, H);
      const s = (minDim * 0.56) / (2 * (Rmm + 12));
      const f = minDim * 1.7;
      const cx = W / 2, cy = H / 2 - minDim * 0.02 + Math.sin(now / 760) * minDim * 0.004;

      const sy = Math.sin(yaw), cyw = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const project = (phi: number) => {
        const x = Math.cos(phi) * Rmm, z = Math.sin(phi) * Rmm;
        const x1 = x * cyw + z * sy, z1 = -x * sy + z * cyw;
        const y2 = -z1 * sp, z2 = z1 * cp;
        const persp = f / (f - z2 * s);
        return { x: x1 * s * persp, y: y2 * s * persp, z: z2, persp };
      };

      // floor shadow (outside the sway rotation)
      const shadowY = cy + minDim * 0.3;
      const shW = Rmm * 2.15 * s * (0.65 + 0.35 * Math.abs(Math.sin(pitch)));
      ctx.save();
      ctx.filter = "blur(" + 10 * dpr + "px)";
      ctx.fillStyle = "rgba(6,20,19,0.4)";
      ctx.beginPath();
      ctx.ellipse(cx, shadowY, shW / 2, shW * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(roll * 0.5);

      // cord
      ctx.beginPath();
      for (let i = 0; i <= 110; i++) {
        const p = project((i / 110) * Math.PI * 2);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(214,204,190,0.55)";
      ctx.lineWidth = 1.6 * dpr;
      ctx.stroke();

      // pieces, painter-sorted far → near
      const order = pieces.map((p, i) => ({ p, i, proj: project(angles[i]) })).sort((a, b) => a.proj.z - b.proj.z);
      for (const { p, i, proj } of order) {
        const img = images[i];
        const shade = 0.62 + 0.38 * ((proj.z / Rmm) + 1) / 2;
        if (p.isCharm) {
          const d = 15 * s * proj.persp;
          const hang = swing - roll * 0.5;
          ctx.save();
          ctx.translate(proj.x, proj.y);
          ctx.rotate(hang);
          ctx.translate(0, d * 0.62);
          ctx.shadowColor = "rgba(8,22,20,0.35)";
          ctx.shadowBlur = 7 * dpr;
          ctx.shadowOffsetY = 3 * dpr;
          ctx.globalAlpha = Math.min(1, shade + 0.18);
          if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -d / 2, -d / 2, d, d);
          else { ctx.fillStyle = p.metal === "gold" ? "#d8b25a" : "#c9ced0"; ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          continue;
        }
        const d = p.mm * s * proj.persp;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.shadowColor = "rgba(8,22,20,0.3)";
        ctx.shadowBlur = 6 * dpr;
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
      ctx.restore();

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
    };
  }, [pieces, capacityMM]);

  return <div className="preview-overlay" role="dialog" aria-label="360 度立體預覽">
    <div className="pv-head"><b>✨ 360° PREVIEW</b><span>立體預覽</span><button className="pv-close" onClick={onClose} aria-label="關閉預覽">✕</button></div>
    <canvas ref={canvasRef} className="pv-canvas" />
    <div className="pv-hint">左右拖曳旋轉 · 甩動有慣性 · 上下改變視角，放開會盪回來</div>
  </div>;
}
