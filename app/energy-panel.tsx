"use client";

import { useEffect, useRef, useState } from "react";
import { ENERGY_META, inStock, stonePhotos, stonesForEnergy, weakestEnergies, type EnergyType } from "./catalog";
import type { SeriesTone } from "./series";

// Animates a number toward its target so energy totals count up smoothly.
export function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

export default function EnergyPanel({ scores, total, dominant, open, onToggle, tone, onAddStone }: { scores: Record<EnergyType, number>; total: number; dominant: (typeof ENERGY_META)[number]; open: boolean; onToggle: () => void; tone: SeriesTone; onAddStone: (stoneId: string) => void }) {
  const displayTotal = useCountUp(total);
  const max = Math.max(...ENERGY_META.map((m) => scores[m.key]), 1);
  const cx = 110, cy = 92, R = 62;
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / ENERGY_META.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const ringPoints = (r: number) => ENERGY_META.map((_, i) => point(i, r).join(",")).join(" ");
  const valuePoints = ENERGY_META.map((m, i) => point(i, 8 + (scores[m.key] / max) * (R - 8)));
  if (!open) return <button className="energy-fab" onClick={onToggle} aria-label={`展開${tone.matrixZh}`}><span>{tone.fab}</span></button>;
  return <div className="energy-panel">
    <div className="ep-head"><b>{tone.matrixEn}</b><span>{tone.matrixZh}</span><button onClick={onToggle} aria-label={`收合${tone.matrixZh}`}>▾</button></div>
    <svg viewBox="0 0 220 186" className="ep-chart" role="img" aria-label={`六維${tone.fab}雷達圖`}>
      <defs>
        <linearGradient id="epFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd76a" stopOpacity=".5" />
          <stop offset="100%" stopColor="#5ad6cd" stopOpacity=".28" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ringPoints(R * f)} fill="none" stroke="#ffffff21" strokeWidth="1" />)}
      {ENERGY_META.map((m, i) => { const [x, y] = point(i, R); return <line key={m.key} x1={cx} y1={cy} x2={x} y2={y} stroke="#ffffff12" />; })}
      <polygon key={total} className="ep-value" points={valuePoints.map((p) => p.join(",")).join(" ")} fill="url(#epFill)" stroke="#ffd76a" strokeWidth="1.6" strokeLinejoin="round" />
      {valuePoints.map((p, i) => <circle key={ENERGY_META[i].key} cx={p[0]} cy={p[1]} r="2.6" fill={ENERGY_META[i].color} stroke="#0d1e1d" strokeWidth="1" />)}
      {ENERGY_META.map((m, i) => {
        const [x, y] = point(i, R + 16);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        return <g key={m.key} textAnchor={anchor}>
          <text x={x} y={y - 1} fontSize="9" fill={m.color} fontWeight="700" letterSpacing=".08em">{m.zh}</text>
          <text x={x} y={y + 9.5} fontSize="8" fill="#cfe4e0">{scores[m.key].toLocaleString()}</text>
        </g>;
      })}
    </svg>
    <div className="ep-dominant">{tone.dominantZh} <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b></div>
    <div className="ep-total"><span>{tone.totalEn}</span><b>{displayTotal.toLocaleString()}</b></div>
    {/* 能量缺口：這條設計目前最弱的兩個維度，各配上最能補它的礦石 —
        「我缺什麼能量、該選什麼石頭」直接在能量表裡回答，點一顆就加進手鍊。 */}
    {total > 0 && <div className="ep-gaps">
      <p>能量缺口 · 點一顆補上</p>
      {weakestEnergies(scores).map((m) => {
        const recs = stonesForEnergy(m.key, 6).filter((s) => inStock({ kind: "stone", id: s.id })).slice(0, 3);
        if (!recs.length) return null;
        return <div className="ep-gap" key={m.key}>
          <span className="ep-gap-name"><b style={{ color: m.color }}>{m.zh}</b><i>{scores[m.key].toLocaleString()}</i></span>
          <span className="ep-gap-stones">{recs.map((s) => (
            <button key={s.id} onClick={() => onAddStone(s.id)} title={`加入 ${s.zh}（${m.zh} ${s.energy[m.key]}/10）`} aria-label={`加入 ${s.zh} 補${m.zh}能量`}>
              <img src={stonePhotos[s.id]} alt="" /><i>{s.zh}</i>
            </button>
          ))}</span>
        </div>;
      })}
    </div>}
  </div>;
}
