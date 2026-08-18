"use client";

// The catalogue's photo-backed visual atoms, shared by the studio stage,
// order lines and quiz results.
import { accessoryPhotos, byAccessory, byStone, stonePhotos, type Accessory, type BeadSize, type DesignItem, type Stone } from "./materials";

// draggable={false}: the browser's native image drag hijacks the pointer
// stream (firing pointercancel) and kills bead drag-reordering. Every stone
// and accessory is required (see the coverage check above) to have a photo,
// so there is no procedural-render fallback to keep in sync here.
export function Crystal({ stone, size = "large" }: { stone: Stone; size?: BeadSize }) {
  return <span className={`crystal photo ${size}`}><img src={stonePhotos[stone.id]} alt={`${stone.zh} 正面實物圖`} draggable={false} /></span>;
}
export function Hardware({ a, small = false }: { a: Accessory; small?: boolean }) {
  return <span className={`hardware photo ${a.type} ${small ? "small" : ""}`}><img src={accessoryPhotos[a.id]} alt={`${a.zh} 正面實物圖`} draggable={false} /></span>;
}
export function ItemVisual({ item, small = false }: { item: DesignItem; small?: boolean }) {
  const stoneSize: BeadSize = small ? "small" : item.size ?? "large";
  return item.kind === "stone" ? <Crystal stone={byStone[item.id]} size={stoneSize} /> : <Hardware a={byAccessory[item.id]} small={small || byAccessory[item.id].type === "spacer"} />;
}
