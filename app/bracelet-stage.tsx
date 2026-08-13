"use client";

import { useRef, useState } from "react";
import { ItemVisual, PCT_PER_MM, itemMM, type DesignItem, type StrandPlacement } from "./catalog";
import type { ENERGY_META } from "./catalog";
import type { SeriesTone } from "./series";

type EnergyMetaEntry = (typeof ENERGY_META)[number];

// The live drag-to-reorder ring. dragView lives here rather than in Home so
// that a pointermove — which fires at full mousemove/touchmove frequency,
// far more often than the order actually changes — only re-renders this
// subtree, not the whole studio page (energy panel SVG, up to ~20 material
// cards, the stats bar). Before this split, every drag frame re-rendered
// all of it, which is what made dragging feel laggy rather than live.
export default function BraceletStage({
  items, setItems, arcs, r, capacityMM, beads, dominant, dominantDisplay, tone, showNotice, removeByUid,
}: {
  items: DesignItem[];
  setItems: (updater: (current: DesignItem[]) => DesignItem[]) => void;
  arcs: StrandPlacement[];
  r: number;
  capacityMM: number;
  beads: number;
  dominant: EnergyMetaEntry;
  dominantDisplay: number;
  tone: SeriesTone;
  showNotice: (text: string) => void;
  removeByUid: (uid: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  // Drag logic lives in a ref so pointerup always sees the freshest state —
  // reading it from React state raced the render loop and made quick drags
  // register as taps (deleting the bead). dragView only drives rendering.
  const dragRef = useRef<{ uid: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragView, setDragView] = useState<{ uid: number; angle: number } | null>(null);

  const angleForPointer = (clientX: number, clientY: number) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return 0;
    const x = (clientX - box.left) / box.width - .5;
    const y = (clientY - box.top) / box.height - .5;
    return Math.atan2(y, x);
  };
  // Live reorder while dragging: map the pointer angle to a millimetre
  // position along the strand and insert the bead between the pieces whose
  // widths bracket it. Excluding the dragged bead keeps boundaries stable, so
  // neighbours don't oscillate.
  const moveToAngle = (uid: number, angle: number) => setItems((current) => {
    const from = current.findIndex((x) => x.uid === uid);
    if (from < 0 || current.length < 2) return current;
    const moving = current[from];
    const rest = current.filter((x) => x.uid !== uid);
    const TAU = Math.PI * 2;
    const frac = ((((angle + Math.PI / 2) % TAU) + TAU) % TAU) / TAU;
    const p = frac * capacityMM;
    let cum = 0, target = rest.length;
    for (let i = 0; i < rest.length; i++) { const w = itemMM(rest[i]); if (p < cum + w / 2) { target = i; break; } cum += w; }
    const next = [...rest];
    next.splice(target, 0, moving);
    return next.every((x, i) => x === current[i]) ? current : next;
  });

  return <div className="bracelet-stage" ref={stageRef}>
    <div className="table-shadow" />
    <div className="bracelet-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
    {items.map((item, i) => {
      const uid = item.uid as number;
      const isDragging = dragView?.uid === uid;
      const a = isDragging ? (dragView as { angle: number }).angle : arcs[i].angle;
      const isCharm = arcs[i].isCharm;
      const sizePct = isCharm ? 10.5 : arcs[i].mm * PCT_PER_MM;
      const orbit = isCharm ? r + 5 : r;
      const charmRotation = (a * 180 / Math.PI) - 90;
      const stoneRotation = (a * 180 / Math.PI) + 90;
      return <button
        key={uid}
        className={`design-item ${isCharm ? "is-charm" : ""} ${isDragging ? "dragging" : ""}`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { uid, startX: event.clientX, startY: event.clientY, moved: false }; }}
        onPointerMove={(event) => {
          const d = dragRef.current;
          if (!d || d.uid !== uid) return;
          if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) <= 9) return;
          d.moved = true;
          const angle = angleForPointer(event.clientX, event.clientY);
          setDragView({ uid, angle });
          moveToAngle(uid, angle);
        }}
        onPointerUp={() => {
          const d = dragRef.current;
          if (!d || d.uid !== uid) return;
          dragRef.current = null;
          setDragView(null);
          if (d.moved) showNotice("已調整素材位置"); else removeByUid(uid);
        }}
        onPointerCancel={() => { dragRef.current = null; setDragView(null); }}
        aria-label={isCharm ? "輕點移除吊飾，按住拖曳調整位置" : "輕點移除素材，按住拖曳調整位置"}
        title="輕點移除 · 按住拖曳調整位置"
        style={{ left: `${50 + Math.cos(a) * orbit}%`, top: `${50 + Math.sin(a) * orbit}%`, width: `${sizePct}%`, height: `${sizePct}%`, transform: `translate(-50%,-50%) rotate(${isCharm ? charmRotation : stoneRotation}deg)` }}
      ><ItemVisual item={item} /><span className="remove-mark">−</span></button>;
    })}
    {beads > 0
      ? <div className="center-intention"><small>{tone.dominantEn}</small><b>{dominant.en}</b><span className="ci-score">{dominantDisplay.toLocaleString()}</span><span className="ci-note">{beads} NATURAL STONES · {items.length} PIECES</span></div>
      : <div className="center-intention"><small>OMA CRYSTAL</small><b>BEGIN WITH ONE</b><span className="ci-note">從一顆開始 · 右側挑你的第一顆礦石</span></div>}
    <div className="stage-tip">輕點移除 · 按住拖曳調整位置</div>
  </div>;
}
