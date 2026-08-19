"use client";

import { memo, useMemo, useRef, useState } from "react";
import { ItemVisual, PCT_PER_MM, anglesForWidths, fanCharmAngles, itemMM, placementOf, type DesignItem, type StrandPlacement } from "./catalog";
import type { ENERGY_META } from "./catalog";
import type { SeriesTone } from "./series";

type EnergyMetaEntry = (typeof ENERGY_META)[number];

// The live drag-to-reorder ring. dragView lives here rather than in Home so
// that a pointermove — which fires at full mousemove/touchmove frequency,
// far more often than the order actually changes — only re-renders this
// subtree, not the whole studio page (energy panel SVG, up to ~20 material
// cards, the stats bar). Before this split, every drag frame re-rendered
// all of it, which is what made dragging feel laggy rather than live.
function BraceletStage({
  items, setItems, arcs, r, capacityMM, beads, dominant, strung, wristCm, tone, showNotice, removeByUid,
}: {
  items: DesignItem[];
  setItems: (updater: (current: DesignItem[]) => DesignItem[]) => void;
  arcs: StrandPlacement[];
  r: number;
  capacityMM: number;
  beads: number;
  dominant: EnergyMetaEntry;
  strung: string;
  wristCm: number;
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
    // 落點直接跟「剩下這些珠子的實際角度」比對——排列已經是弦長模型，
    // 再用一套線性累加去猜位置會跟畫面對不起來。
    const TAU = Math.PI * 2;
    const norm = (t: number) => (((t + Math.PI / 2) % TAU) + TAU) % TAU;
    const p = norm(angle);
    const angles = anglesForWidths(rest.map(itemMM), capacityMM).map(norm);
    let target = rest.length;
    for (let i = 0; i < angles.length; i++) { if (p < angles[i]) { target = i; break; } }
    const next = [...rest];
    next.splice(target, 0, moving);
    return next.every((x, i) => x === current[i]) ? current : next;
  });

  // Display-only charm fan (shared geometry helper): the true mm position —
  // what dragging and pricing use — is untouched, and a slight remaining
  // overlap is fine, that's how a real charm cluster hangs.
  const displayAngles = useMemo(
    () => fanCharmAngles(arcs.map((arc) => arc.angle), arcs.map((arc) => arc.isCharm)),
    [arcs],
  );

  return <div className="bracelet-stage" ref={stageRef}>
    <div className="table-shadow" />
    <div className="bracelet-string" style={{ left: `${50 - r}%`, top: `${50 - r}%`, width: `${r * 2}%`, height: `${r * 2}%` }} />
    {items.map((item, i) => {
      const uid = item.uid as number;
      const isDragging = dragView?.uid === uid;
      const a = isDragging ? (dragView as { angle: number }).angle : displayAngles[i];
      const isCharm = arcs[i].isCharm;
      // 每個零件的穿繩點（扣環孔／中心孔）是從照片自動偵測出來的，顯示
      // 框也照實際輪廓比例走，而不是硬塞成正方形。
      const place = placementOf(item);
      // 顯示長邊：圓珠與隔珠照真實直徑，吊飾照它自己的視覺尺寸（吊飾只
      // 佔 3mm 繩距，但畫出來當然比 3mm 大）。
      const longPct = isCharm ? 10.5 : arcs[i].mm * PCT_PER_MM;
      const wPct = place.aspect >= 1 ? longPct : longPct * place.aspect;
      const hPct = place.aspect >= 1 ? longPct / place.aspect : longPct;
      // 把 anchor 那一點對到繩子上：translate 的百分比是相對自己的框，
      // 所以 -anchor×100% 剛好讓那個點落在定位座標上。圓珠／隔珠的
      // anchor 是 (0.5,0.5)，行為與過去的置中完全相同。
      const shiftX = -place.anchor[0] * 100;
      const shiftY = -place.anchor[1] * 100;
      // 吊飾靠重力決定方向：永遠垂直向下（照片本來就是扣環朝上拍的），
      // 圓珠與隔珠則跟著繩子的切線轉。
      const rotation = place.orientation === "dangle" ? 0 : (a * 180 / Math.PI) + 90;
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
        style={{
          left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%`,
          width: `${wPct}%`, height: `${hPct}%`,
          transform: `translate(${shiftX}%,${shiftY}%) rotate(${rotation}deg)`,
          // 讓圖案（而不是含留白的整張圖）填滿顯示框
          ["--art-w" as string]: place.art.width, ["--art-h" as string]: place.art.height,
          ["--art-x" as string]: place.art.left, ["--art-y" as string]: place.art.top,
        } as React.CSSProperties}
      ><ItemVisual item={item} /><span className="remove-mark">−</span></button>;
    })}
    {beads > 0
      ? <div className="center-intention"><small>{tone.dominantEn}</small><b>{dominant.en}</b><span className="ci-score">{strung}<i> / {wristCm} cm</i></span><span className="ci-note">{beads} NATURAL STONES · {items.length} PIECES</span></div>
      : <div className="center-intention"><small>OMA CRYSTAL</small><b>BEGIN WITH ONE</b><span className="ci-note">從一顆開始 · 右側挑你的第一顆礦石</span></div>}
    <div className="stage-tip">輕點移除 · 按住拖曳調整位置</div>
  </div>;
}

// Memoised: the studio re-renders on every notice tick and search keystroke;
// this subtree only needs to follow its own props.
export default memo(BraceletStage);
