// Strand geometry: the arc model every renderer and every fill gate goes
// through. Pure math over widths + capacity — the only catalogue knowledge
// it needs is imported from materials.ts.
import { BEAD_MM, WRIST_CHOICES, byAccessory, itemMM, type DesignItem } from "./materials";

// Strand geometry shared by every renderer that arranges items around a
// ring: the studio stage, shop-card thumbnails, the share-card canvas and
// the 360° preview. Converts cumulative widths into the angle each item's
// centre falls at — the arithmetic that four call sites used to reimplement
// (and drift on) independently. Scale, orbit radius and charm sizing stay
// cosmetic choices local to each renderer.
export function centersForWidths(widths: number[]): number[] {
  let cum = 0;
  return widths.map((mm) => { const center = cum + mm / 2; cum += mm; return center; });
}
// A bead on a ring occupies more arc than its diameter: adjacent beads touch
// along the CHORD between their centres, so a bead of width w subtends
// 2·asin(w/2R) of the circle. Spending plain millimetres of arc per bead
// (the old model) made large beads overlap their neighbours and let a
// "full" strand hold more than physically fits — the wider the beads, the
// worse the lie (the effect is invisible at 8mm, ~4% at 20mm on a 14cm
// wrist). All fill math and every renderer goes through these two.
export function arcWidthMM(widthMM: number, capacityMM: number): number {
  const R = capacityMM / (Math.PI * 2);
  return 2 * R * Math.asin(Math.min(widthMM / (2 * R), 1));
}
export function strandArcMM(widths: number[], capacityMM: number): number {
  return widths.reduce((sum, w) => sum + arcWidthMM(w, capacityMM), 0);
}
export function anglesForWidths(widths: number[], capacityMM: number): number[] {
  const arcs = widths.map((w) => arcWidthMM(w, capacityMM));
  return centersForWidths(arcs).map((center) => -Math.PI / 2 + (center / capacityMM) * Math.PI * 2);
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
export function canPadMore(widths: number[], capacityMM: number, targetFill: number): boolean {
  return strandArcMM([...widths, BEAD_MM.small], capacityMM) <= capacityMM
    && strandArcMM(widths, capacityMM) < capacityMM * targetFill;
}
// The ring circumference at which these beads exactly close the loop
// (Σ 2·asin(wᵢ/2R) = 2π), for thumbnails that draw a finished bracelet
// rather than a wrist-sized one. Monotone in R, so bisection converges
// fast; asin x ≥ x guarantees the true R is at least Σw/2π.
export function closedLoopCapacityMM(widths: number[]): number {
  const sum = widths.reduce((a, b) => a + b, 0);
  if (!sum) return 1;
  let lo = sum / (Math.PI * 2), hi = sum;
  for (let i = 0; i < 48; i++) {
    const R = (lo + hi) / 2;
    const total = widths.reduce((a, w) => a + 2 * Math.asin(Math.min(w / (2 * R), 1)), 0);
    if (total > Math.PI * 2) lo = R; else hi = R;
  }
  return hi * Math.PI * 2;
}

// Smallest offered wrist size (at least minCm) whose circumference holds
// these beads under the arc model — undefined when even the largest can't.
// The studio's auto-grow, product/quiz loading and share-link decoding all
// size through this one function.
export function fitWristCm(widths: number[], minCm: number): number | undefined {
  return WRIST_CHOICES.find((cm) => cm >= minCm && strandArcMM(widths, cm * 10) <= cm * 10);
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

