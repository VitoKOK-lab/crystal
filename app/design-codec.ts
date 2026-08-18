// The compact design notation: product specs ("obsidian.x,gold-hex") and
// shareable links (?d=<wrist>|<tokens>). Letters for the legacy size trio
// are kept forever so every share link already in the wild still decodes.
import { BEAD_MM, WRIST_CHOICES, byAccessory, byStone, itemMM, nextUid, type BeadSize, type DesignItem } from "./materials";
import { fitWristCm } from "./strand-geometry";

export const buildSpec = (spec: [string, BeadSize?][]): DesignItem[] => spec.map(([id, size]) => byAccessory[id]
  ? ({ kind: "accessory", id, uid: nextUid() } as DesignItem)
  : ({ kind: "stone", id, size: size ?? "large", uid: nextUid() } as DesignItem));

// Size suffix in the compact notation: the original letters (`.x` 20mm,
// `.s` 8mm, anything else 10mm) or a plain number for admin-defined sizes
// (`.12` = 12mm). Letters are kept forever so every share link and product
// spec written before custom sizes existed still decodes.
//
// specTokenMM is the one place that mapping lives as plain arithmetic — the
// admin's composition editor prices and stock-checks specs through it, so
// any change to the notation lands on both sides at once.
const numericSize = (sz?: string): number | undefined =>
  sz && /^\d+(\.\d+)?$/.test(sz) ? Number(sz) : undefined;
export const specTokenMM = (sz?: string): number =>
  numericSize(sz) ?? (sz === "x" ? BEAD_MM.xlarge : sz === "s" ? BEAD_MM.small : BEAD_MM.large);
function stoneToken(id: string, sz: string | undefined): DesignItem {
  const mm = numericSize(sz);
  if (mm && mm > 0 && mm <= 40) return { kind: "stone", id, mm, uid: nextUid() };
  return { kind: "stone", id, size: sz === "x" ? "xlarge" : sz === "s" ? "small" : "large", uid: nextUid() };
}
const sizeSuffix = (it: DesignItem) => it.mm !== undefined
  ? String(it.mm)
  : it.size === "xlarge" ? "x" : it.size === "small" ? "s" : "l";

// A token is "<id>" or "<id>.<size>". Split on the FIRST dot only: sizes
// can be fractional ("rose.6.5" is a 6.5mm rose), so a naive split(".")
// would silently truncate them.
export function splitSpecToken(token: string): [string, string | undefined] {
  const dot = token.indexOf(".");
  return dot < 0 ? [token, undefined] : [token.slice(0, dot), token.slice(dot + 1)];
}

// Compact spec notation used by the series catalogue: "obsidian.x,obsidian.l,gold-hex".
export function parseSpec(spec: string): DesignItem[] {
  return spec.split(",").map((token) => {
    const [id, sz] = splitSpecToken(token.trim());
    if (byAccessory[id]) return { kind: "accessory", id, uid: nextUid() } as DesignItem;
    return stoneToken(id, sz);
  });
}

// Shareable design links: ?d=<wrist>|<id>.<size>,<id>,…
export const encodeDesign = (items: DesignItem[], wristCm: number) => `${wristCm}|` + items.map((it) => it.kind === "stone" ? `${it.id}.${sizeSuffix(it)}` : it.id).join(",");
export function decodeDesign(code: string): { wrist: number; items: DesignItem[] } | null {
  try {
    const [w, list] = code.split("|");
    const wrist = Number(w);
    if (!WRIST_CHOICES.includes(wrist) || !list) return null;
    const items: DesignItem[] = [];
    for (const token of list.split(",")) {
      const [id, sz] = splitSpecToken(token);
      if (byStone[id]) items.push(stoneToken(id, sz));
      else if (byAccessory[id]) items.push({ kind: "accessory", id, uid: nextUid() });
      else return null;
    }
    if (!items.length || items.length > 42) return null;
    // Links encoded under the old plain-mm capacity model can carry designs
    // that don't quite fit their stated wrist under the honest arc math —
    // grow to the smallest size that holds them instead of killing the link.
    const fits = fitWristCm(items.map(itemMM), wrist);
    if (fits === undefined) return null;
    return { wrist: fits, items };
  } catch { return null; }
}

