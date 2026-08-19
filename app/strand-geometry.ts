// Strand geometry: the physical model every renderer and every fill gate
// goes through. Pure math over widths + capacity — the only catalogue
// knowledge it needs is imported from materials.ts.
//
// 兩層圓要分清楚：
//   內圈 (inner)  = 手腕實際套進去的那一圈 = 手圍 + 鬆度
//   珠心圈 (centre) = 珠子圓心跑的那一圈 = 內圈 + π×珠徑（珠子套在手腕外面）
// 舊模型把「手圍」直接當成珠心圈，等於做出來的手鍊內圈比客人的手腕
// 小了整整 π×珠徑（10mm 珠就是 3.1cm）——戴不下。現在手圍只決定內圈，
// 珠心圈由 capacityForWrist() 外推，capacityMM 這個參數的意義（珠心圈
// 周長）維持不變，所以所有渲染器都不用改。
import { BEAD_MM, WRIST_CHOICES, byAccessory, itemMM, type DesignItem } from "./materials";

const TAU = Math.PI * 2;

// 手圍之外自動預留的鬆度：手鍊要能套過手掌，內圈一定得比手腕大一些。
// catalog-live 會用後台設定覆寫（跟 pricing 同樣的就地改寫做法）。
export const sizing = { easeMM: 12, cordGapMM: 0.3 };

// 珠子之間留一點繩距：真實彈力繩手鍊珠子不會完全咬死，留一點縫看起來
// 才像實物（數學上完全相切反而像融在一起）。
const gap = () => sizing.cordGapMM;

// 決定「這條手鍊有多厚」的代表珠徑：用加權中位數而不是最大值或平均，
// 一顆 20mm 主石不會讓整條手鍊的內圈被撐掉一圈。
export function anchorDiameterMM(widths: number[]): number {
  if (!widths.length) return BEAD_MM.large;
  const sorted = [...widths].sort((a, b) => a - b);
  const half = sorted.reduce((a, b) => a + b, 0) / 2;
  let cum = 0;
  for (const w of sorted) { cum += w; if (cum >= half) return w; }
  return sorted[sorted.length - 1];
}

/** 珠心圈周長 = 目標內圈（手圍＋鬆度）+ π×代表珠徑。 */
export function capacityForWrist(wristCm: number, widths: number[] = []): number {
  return wristCm * 10 + sizing.easeMM + Math.PI * anchorDiameterMM(widths);
}
/** 反過來：這個珠心圈實際做出來的成品內圈周長（mm）。 */
export const innerCircumferenceMM = (capacityMM: number, widths: number[] = []) =>
  capacityMM - Math.PI * anchorDiameterMM(widths);

// --- 角度模型 -------------------------------------------------------------
// 兩顆相切的珠子，圓心距 = (d₁+d₂)/2（再加繩距）。這條弦在半徑 R 的圓上
// 對應的圓心角就是 2·asin(弦/2R)——這是精確解。舊模型把每顆珠子各自
// 攤成一段弧再相加，只有在相鄰珠同尺寸時才等價；混尺寸時會多算一點點，
// 大主石旁邊因此會浮出一條細縫。
const centralAngle = (chordMM: number, R: number) => 2 * Math.asin(Math.min(chordMM / (2 * R), 1));

/** 相鄰珠圓心距（含繩距）。closed=true 時多回傳「尾接首」那一段。 */
export function chordsFor(widths: number[], closed = false): number[] {
  const n = widths.length;
  const last = closed ? n : n - 1;
  const out: number[] = [];
  for (let i = 0; i < last; i++) out.push((widths[i] + widths[(i + 1) % n]) / 2 + gap());
  return out;
}

/** 這串珠子在珠心圈上佔掉的角度（含頭尾各半顆珠的角寬）。 */
export function strandSpanRad(widths: number[], capacityMM: number): number {
  if (!widths.length) return 0;
  const R = capacityMM / TAU;
  const halfWidth = (d: number) => Math.asin(Math.min(d / (2 * R), 1));
  return halfWidth(widths[0])
    + chordsFor(widths).reduce((s, c) => s + centralAngle(c, R), 0)
    + halfWidth(widths[widths.length - 1]);
}

/** 已串長度（沿珠心圈量的 mm）——填充率、結帳門檻與讀數都用這個。 */
export function strandArcMM(widths: number[], capacityMM: number): number {
  return strandSpanRad(widths, capacityMM) * (capacityMM / TAU);
}

/** 單顆珠子自己佔掉的弧長（拖曳落點試算用）。 */
export function arcWidthMM(widthMM: number, capacityMM: number): number {
  const R = capacityMM / TAU;
  return centralAngle(widthMM, R) * R;
}

/** 每顆珠子圓心的角度。從 -π/2（正上方）起算，順著珠心圈排下去。 */
export function anglesForWidths(widths: number[], capacityMM: number): number[] {
  if (!widths.length) return [];
  const R = capacityMM / TAU;
  const out = [-Math.PI / 2];
  const chords = chordsFor(widths);
  for (let i = 0; i < chords.length; i++) out.push(out[i] + centralAngle(chords[i], R));
  return out;
}

/** 累計中心位置（給只要線性排列的呼叫端，例如商店縮圖的舊路徑）。 */
export function centersForWidths(widths: number[]): number[] {
  let cum = 0;
  return widths.map((mm) => { const center = cum + mm / 2; cum += mm; return center; });
}

// Charms occupy only ~3mm of cord but draw far wider, so a run of adjacent
// charms piles up and hides itself. Fan each run out around its own centre —
// display only, true mm positions untouched. Shared by the 2D stage and the
// 3D preview so the two renderers can never drift apart on this.
export function fanCharmAngles(angles: number[], isCharm: boolean[]): number[] {
  const out = [...angles];
  const FAN_STEP = 0.15; // radians between neighbouring charms in a run
  let runStart = -1;
  for (let i = 0; i <= angles.length; i++) {
    const inRun = i < angles.length && isCharm[i];
    if (inRun && runStart < 0) runStart = i;
    if (!inRun && runStart >= 0) {
      const len = i - runStart;
      if (len > 1) {
        const centre = (out[runStart] + out[i - 1]) / 2;
        for (let j = 0; j < len; j++) out[runStart + j] = centre + (j - (len - 1) / 2) * FAN_STEP;
      }
      runStart = -1;
    }
  }
  return out;
}

// 「還能再塞一顆 8mm 小珠、且還沒到目標填充率」——scenario preset 與
// 測驗陣容的自動補珠共用這一個判斷，補珠門檻才不會兩邊漂移。
export function canPadMore(widths: number[], wristCm: number, targetFill: number): boolean {
  const next = [...widths, BEAD_MM.small];
  const capNext = capacityForWrist(wristCm, next);
  const capNow = capacityForWrist(wristCm, widths);
  return strandArcMM(next, capNext) <= capNext
    && strandArcMM(widths, capNow) < capNow * targetFill;
}

/** 讓這些珠子剛好首尾相接的珠心圈半徑（Σ圓心角 = 2π），二分法解。 */
export function solveRingRadiusMM(chords: number[]): number | null {
  if (chords.length < 3) return null;
  const max = Math.max(...chords), sum = chords.reduce((a, b) => a + b, 0);
  const totalAngle = (R: number) => chords.reduce((s, c) => (c / (2 * R) > 1 ? NaN : s + centralAngle(c, R)), 0);
  let lo = max / 2 + 1e-9, hi = sum / TAU + max;
  const atLo = totalAngle(lo);
  if (Number.isNaN(atLo) || atLo < TAU) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const t = totalAngle(mid);
    if (Number.isNaN(t) || t > TAU) lo = mid; else hi = mid;
    if (hi - lo < 1e-6) break;
  }
  return (lo + hi) / 2;
}

// 這些珠子綁成一條「剛好閉合」的手鍊時，珠心圈的周長（商店縮圖畫的是
// 成品，不是手圍尺寸的圈）。解不出來時退回線性估計。
export function closedLoopCapacityMM(widths: number[]): number {
  if (!widths.length) return 1;
  const R = solveRingRadiusMM(chordsFor(widths, true));
  if (R !== null) return R * TAU;
  const sum = widths.reduce((a, b) => a + b, 0) + gap() * widths.length;
  return Math.max(sum, 1);
}

// Smallest offered wrist size (at least minCm) whose circumference holds
// these beads under the arc model — undefined when even the largest can't.
// The studio's auto-grow, product/quiz loading and share-link decoding all
// size through this one function.
export function fitWristCm(widths: number[], minCm: number): number | undefined {
  return WRIST_CHOICES.find((cm) => {
    if (cm < minCm) return false;
    const cap = capacityForWrist(cm, widths);
    return strandArcMM(widths, cap) <= cap;
  });
}

/** 可製作性：這條設計對這個手圍是剛好、還差幾 mm、還是超出了。 */
export type FitAssessment = { state: "empty" | "need_more" | "ok" | "too_many"; remainingMM: number; fill: number };
export function assessFit(widths: number[], wristCm: number, toleranceMM = 4): FitAssessment {
  const cap = capacityForWrist(wristCm, widths);
  if (!widths.length) return { state: "empty", remainingMM: cap, fill: 0 };
  const used = strandArcMM(widths, cap);
  const remainingMM = cap - used;
  return {
    remainingMM,
    fill: used / cap,
    state: remainingMM > toleranceMM ? "need_more" : remainingMM < -toleranceMM ? "too_many" : "ok",
  };
}

// DesignItem-aware convenience wrapper for the studio stage and shop-card
// thumbnails; share-card.ts and preview.tsx render already-decoupled
// {mm, isCharm} tuples instead of DesignItem, so they call
// anglesForWidths() directly.
export type StrandPlacement = { item: DesignItem; mm: number; isCharm: boolean; angle: number };
export function layoutStrand(items: DesignItem[], capacityMM: number): StrandPlacement[] {
  const widths = items.map(itemMM);
  const angles = anglesForWidths(widths, capacityMM);
  return items.map((item, i) => ({
    item, mm: widths[i], angle: angles[i],
    isCharm: item.kind === "accessory" && byAccessory[item.id].type === "charm",
  }));
}
