"use client";

// Shared material catalogue for the whole site.
//
// The men's line and the women's line used to be two separate apps with two
// incompatible six-dimension energy systems (女: 豐盛/愛情/療癒/守護/清晰/活力,
// 男: 財富/意志/決斷/守護/專注/力量 — only wealth and protection overlapped).
// Merging them into one storefront meant collapsing those into a single set
// that reads honestly for every series: the two shared axes stay, love and
// healing come across from the women's set, and focus/power absorb the
// near-synonyms from both (清晰≈專注, 活力≈力量). Every stone below carries
// freshly-authored weights on that unified scale rather than a mechanical
// copy of either old table.
//
// page.tsx and shop.tsx both import from here — keeping the data in its own
// module is what stops those two from importing each other in a cycle.

export type EnergyType = "wealth" | "love" | "healing" | "protection" | "focus" | "power";
export type Rarity = "common" | "rare" | "legendary";
export type BeadSize = "xlarge" | "large" | "small";
export type Stone = { id: string; en: string; group: string; color: string; light: string; deep: string; price: number; note: string; energy: Record<EnergyType, number> };
export type Accessory = { id: string; en: string; type: "spacer" | "charm"; shape: string; metal: "gold" | "silver"; price: number; note: string };
export type DesignItem = { kind: "stone" | "accessory"; id: string; size?: BeadSize; uid?: number };

// Rarity is derived from price rather than hand-tagged per item — keeps the
// tier consistent as the catalogue grows instead of drifting out of sync.
const RARITY_TIER = { common: 280, rare: 450 } as const;
export function rarityOf(price: number): Rarity { return price <= RARITY_TIER.common ? "common" : price <= RARITY_TIER.rare ? "rare" : "legendary"; }
export const RARITY_LABEL: Record<Rarity, string> = { common: "Common", rare: "Rare", legendary: "Legendary" };

// Stable per-placement identity so live drag-reordering keeps DOM nodes (and
// their pointer capture) alive while the array order changes underneath.
let uidSeq = 0;
export const nextUid = () => ++uidSeq;

export const ENERGY_META = [
  { key: "wealth", en: "WEALTH", color: "#c9a355" },
  { key: "love", en: "LOVE", color: "#e88aa8" },
  { key: "healing", en: "HEALING", color: "#7ec8a5" },
  { key: "protection", en: "PROTECTION", color: "#7d8896" },
  { key: "focus", en: "FOCUS", color: "#72c7d6" },
  { key: "power", en: "POWER", color: "#e0885a" },
] as const satisfies readonly { key: EnergyType; en: string; color: string }[];

export const stones: Stone[] = ([
  ["obsidian","Faceted Black Obsidian","PROTECTION","#232323","#5c5c5c","#0a0a0a",280,"Deep faceted black. Cuts the noise and steadies the mind.",{wealth:3,love:2,healing:5,protection:10,focus:6,power:6}],
  ["tiger-eye","Faceted Tiger Eye","WEALTH","#a9762f","#e8c876","#4a2f0c",290,"Amber light in motion. For judgement, and the nerve to act on it.",{wealth:8,love:3,healing:5,protection:5,focus:7,power:7}],
  ["hematite","Faceted Hematite","PROTECTION","#71757a","#c7ccd1","#2b2d30",260,"Metallic and grounding. Fortifies will and guards the edges.",{wealth:3,love:3,healing:6,protection:8,focus:5,power:7}],
  ["smoky","Round Smoky Quartz","FOCUS","#5f4a3a","#a8876a","#241a12",250,"Settles you down, lets the static go, gathers focus.",{wealth:4,love:3,healing:7,protection:7,focus:9,power:5}],
  ["lava","Round Matte Lava Rock","POWER","#1c1c1c","#3f3f3f","#050505",220,"Raw volcanic stone. Holds heat, releases it when you need it.",{wealth:2,love:2,healing:5,protection:5,focus:4,power:10}],
  ["goldstone","Faceted Blue Goldstone","WEALTH","#1d2b45","#5878ad","#0a1220",310,"Gold flecks across a midnight field — ambition and good fortune.",{wealth:10,love:4,healing:4,protection:3,focus:5,power:7}],
  ["rose","Rose Quartz","LOVE","#df9baa","#fff3f4","#a65364",260,"Tenderness, closeness, and accepting yourself first.",{wealth:2,love:9,healing:7,protection:3,focus:4,power:5}],
  ["clear","Clear Quartz","FOCUS","#d4e2e4","#ffffff","#8ba3a7",230,"Clears the thinking. Amplifies whatever you point it at.",{wealth:6,love:5,healing:6,protection:7,focus:10,power:8}],
  ["amethyst","Amethyst","PROTECTION","#8868b3","#eee5ff","#4e2c80",280,"Quiets the noise inside and keeps the balance.",{wealth:4,love:6,healing:8,protection:9,focus:9,power:7}],
  ["citrine","Citrine","WEALTH","#e1b254","#fff7c5","#9d6a11",300,"An invitation. Abundance and self-belief arrive together.",{wealth:10,love:4,healing:5,protection:4,focus:6,power:8}],
  ["aqua","Aquamarine","HEALING","#7fc6d4","#efffff","#337b8c",360,"Clear as open water, and just as unhurried.",{wealth:3,love:8,healing:9,protection:5,focus:8,power:6}],
  ["tourmaline","Black Tourmaline","PROTECTION","#282a2c","#74777a","#060708",290,"Holds the boundary. A quiet, unmoving guard.",{wealth:2,love:3,healing:6,protection:10,focus:5,power:5}],
  ["sunstone","Sunstone","POWER","#ce7b4f","#ffd4ad","#813820",330,"Carries courage into every step you take.",{wealth:7,love:5,healing:8,protection:4,focus:6,power:9}],
  ["moon","Moonstone","HEALING","#bbc6e1","#ffffff","#6d78a3",320,"Soft intuition. Light for a beginning.",{wealth:3,love:7,healing:8,protection:6,focus:7,power:6}],
  ["moss","Moss Agate","HEALING","#779b78","#e5f3d8","#31563a",290,"Steady growth. Returns you to your own pace.",{wealth:6,love:4,healing:9,protection:7,focus:5,power:5}],
  ["lapis","Lapis Lazuli","FOCUS","#315b94","#a7d9f3","#122654",330,"Honest speech, and a line back to your own wisdom.",{wealth:5,love:6,healing:7,protection:8,focus:8,power:7}],
  ["garnet","Garnet","POWER","#9d3753","#ffc2cb","#4d1025",310,"Heat, appetite, and the will to keep going.",{wealth:7,love:7,healing:6,protection:5,focus:4,power:10}],
  ["tiger","Round Tiger Eye","WEALTH","#ae7927","#ffdf84","#55340c",260,"Round golden-brown banding. Decisive, without hesitation.",{wealth:8,love:3,healing:7,protection:6,focus:7,power:7}],
  ["fluorite","Fluorite","FOCUS","#79b69f","#e3ffe7","#3d7461",320,"Orders the mind. Cleanses gently.",{wealth:3,love:5,healing:8,protection:7,focus:9,power:6}],
  ["rhodonite","Rhodonite","LOVE","#b96f82","#ffd8e0","#6e3445",350,"Mends what matters, and dares you to love anyway.",{wealth:2,love:10,healing:7,protection:5,focus:5,power:6}],
  ["labradorite","Labradorite","PROTECTION","#557883","#bfeef2","#263e55",380,"A low flash of light that guards your energy.",{wealth:4,love:5,healing:6,protection:10,focus:7,power:7}],
] as const).map(([id,en,group,color,light,deep,price,note,energy]) => ({ id,en,group,color,light,deep,price,note,energy } as Stone));

export const accessories: Accessory[] = ([
  ["gold-hex","Gold Hex Frame Spacer","spacer","hex","gold",150,"Clean geometry that measures out each passage."],
  ["silver-hex","Silver Hex Frame Spacer","spacer","hex","silver",140,"Cool metal to balance the weight of stone."],
  ["compass","Gold Compass Charm","charm","compass","gold",460,"Keeps the decision pointed at the destination."],
  ["arrow","Metal Arrow Charm","charm","arrow","gold",420,"Straight ahead. Will, made into a shape."],
  ["silver-round","Sterling Silver Round","spacer","round","silver",90,"Mirror-polished. The simplest possible break."],
  ["silver-heart","Sterling Silver Heart","spacer","heart","silver",160,"Quietly dimensional — a place for the eye to rest."],
  ["gold-rondelle","Gold Crystal Rondelle","spacer","rondelle","gold",140,"Catches the light in small increments."],
  ["silver-flower","Silver Filigree","spacer","flower","silver",120,"Hand-cut filigree. Detail inside something sturdy."],
  ["gold-knot","Gold Knot Spacer","spacer","knot","gold",130,"A knot. For holding on to what you named."],
  ["silver-star","Silver Star Spacer","spacer","star","silver",120,"A small burst of light. A marker in the dark."],
  ["gold-crown","Gold Crown Spacer","spacer","crown","gold",160,"A crown's outline, clearing the stage for the focal stone."],
  ["silver-cube","Silver Cube Spacer","spacer","cube","silver",110,"Cut corners, no movement, all presence."],
  ["silver-groove","Silver Ridged Spacer","spacer","groove","silver",90,"Plain ridging. Understated and solid."],
  ["silver-rivet","Silver Rivet Spacer","spacer","rivet","silver",100,"Industrial rivet — rough on the surface, precise underneath."],
  ["silver-chain","Silver Chain-Link Spacer","spacer","chain","silver",130,"Interlocking links, strung through every resolve."],
  ["silver-shield","Silver Shield Spacer","spacer","shield","silver",150,"A shield's profile. Shoulders for the weather."],
  ["silver-dragon","Silver Dragon-Scale Spacer","spacer","dragon","silver",170,"Scale-cut. Power held in reserve."],
  ["silver-skull","Silver Skull Spacer","spacer","skull","silver",180,"A hard totem. A reminder to go on unafraid."],
  ["silver-tiger-spacer","Silver Tiger Head Spacer","spacer","tigerhead","silver",190,"The tiger stands watch. Decisive, and final."],
  ["silver-pixiu","Silver Pixiu Spacer","spacer","pixiu","silver",220,"The wealth beast. It takes in and never lets go."],
  ["gold-pixiu","Gold Pixiu Spacer","spacer","pixiu","gold",240,"Gold guardian, standing over the money road."],
  ["leaf","Golden Leaf Charm","charm","leaf","gold",390,"The gesture of breaking through soil. Growth that keeps going."],
  ["moon-charm","Moon Charm","charm","moon","silver",390,"A night traveller's marker, gathering strength in the quiet."],
  ["lotus","Lotus Charm","charm","lotus","gold",490,"Unstained by the mud it came from. Ease, earned."],
  ["heart","Heart Charm","charm","heart","gold",420,"The original reason. A reminder of why you set out."],
  ["cross","Cross Charm","charm","cross","silver",490,"Quiet and certain. Takes the weather as it comes."],
  ["key","Lucky Key Charm","charm","key","gold",450,"The right to open whatever is next."],
  ["butterfly","Butterfly Charm","charm","butterfly","gold",520,"Out of the cocoon. Permission to change."],
  ["evil-eye","Evil Eye Charm","charm","evil-eye","silver",480,"A watchful eye, turning away the interference."],
  ["sun-charm","Sunray Charm","charm","sun","gold",470,"Lights your own field, once a day."],
  ["star-charm","Wish Star Charm","charm","wish-star","silver",430,"Pins the intention somewhere you'll see it."],
  ["shell","Seashell Charm","charm","shell","gold",460,"It has seen weather, and travels easy anyway."],
  ["travel-compass","Travel Compass Charm","charm","compass","silver",540,"Wherever you go, a direction you already hold."],
  ["angel-wing","Angel Wing Charm","charm","wing","silver",510,"The quiet backing, holding steady behind you."],
  ["clover","Four Leaf Clover Charm","charm","clover","gold",500,"Takes the luck it's owed. The rest is yours."],
  ["lock","Love Lock Charm","charm","lock","gold",490,"Locks the promise you said out loud."],
  ["hamsa","Hamsa Charm","charm","hamsa","silver",520,"Palm outward, turning away what isn't yours."],
] as const).map(([id,en,type,shape,metal,price,note]) => ({ id,en,type,shape,metal,price,note } as Accessory));

export const byStone = Object.fromEntries(stones.map((x) => [x.id, x])) as Record<string, Stone>;
export const byAccessory = Object.fromEntries(accessories.map((x) => [x.id, x])) as Record<string, Accessory>;

// Original top-down product renders shot for the OMA material library.
// They can be replaced one-for-one with final photographed files later.
export const stonePhotos: Record<string, string> = {
  obsidian: "/materials/men/obsidian.png",
  "tiger-eye": "/materials/men/tiger-eye.png",
  hematite: "/materials/men/hematite.png",
  smoky: "/materials/men/smoky.png",
  lava: "/materials/men/lava.png",
  goldstone: "/materials/men/goldstone.png",
  clear: "/materials/clear.png",
  amethyst: "/materials/amethyst.png",
  rose: "/materials/rose.png",
  citrine: "/materials/citrine.png",
  aqua: "/materials/aqua.png",
  tourmaline: "/materials/tourmaline.png",
  sunstone: "/materials/sunstone.png",
  moon: "/materials/moon.png",
  moss: "/materials/moss.png",
  lapis: "/materials/lapis.png",
  garnet: "/materials/garnet.png",
  tiger: "/materials/tiger.png",
  fluorite: "/materials/fluorite.png",
  rhodonite: "/materials/rhodonite.png",
  labradorite: "/materials/labradorite.png",
};
export const accessoryPhotos: Record<string, string> = {
  "gold-hex": "/materials/men/gold-hex.png",
  "silver-hex": "/materials/men/silver-hex.png",
  compass: "/materials/men/compass.png",
  arrow: "/materials/men/arrow.png",
  "silver-round": "/materials/silver-round.png",
  "gold-crown": "/materials/gold-crown.png",
  "gold-rondelle": "/materials/gold-rondelle.png",
  "silver-flower": "/materials/silver-flower.png",
  "gold-knot": "/materials/gold-knot.png",
  "silver-star": "/materials/silver-star.png",
  leaf: "/materials/leaf.png",
  "moon-charm": "/materials/silver-moon.png",
  lotus: "/materials/lotus.png",
  heart: "/materials/gold-heart.png",
  cross: "/materials/cross.png",
  key: "/materials/key.png",
  "silver-heart": "/materials/silver-heart.png",
  "silver-cube": "/materials/men/silver-cube.png",
  "silver-groove": "/materials/men/silver-groove.png",
  "silver-rivet": "/materials/men/silver-rivet.png",
  "silver-chain": "/materials/men/silver-chain.png",
  "silver-shield": "/materials/men/silver-shield.png",
  "silver-dragon": "/materials/men/silver-dragon.png",
  "silver-skull": "/materials/men/silver-skull.png",
  "silver-tiger-spacer": "/materials/men/silver-tiger-spacer.png",
  "silver-pixiu": "/materials/men/silver-pixiu.png",
  "gold-pixiu": "/materials/men/gold-pixiu.png",
  butterfly: "/materials/men/butterfly.png",
  "evil-eye": "/materials/men/evil-eye.png",
  "sun-charm": "/materials/men/sun-charm.png",
  "star-charm": "/materials/men/star-charm.png",
  shell: "/materials/men/shell.png",
  "travel-compass": "/materials/men/travel-compass.png",
  "angel-wing": "/materials/men/angel-wing.png",
  clover: "/materials/men/clover.png",
  lock: "/materials/men/lock.png",
  hamsa: "/materials/men/hamsa.png",
};

// Physical width each piece occupies on the strand, in millimetres. The user
// picks a wrist size first; its circumference (cm × 10) is the fixed capacity
// that beads fill up.
export const BEAD_MM: Record<BeadSize, number> = { xlarge: 20, large: 10, small: 8 };
export const WRIST_CHOICES = Array.from({ length: 19 }, (_, i) => 13 + i * 0.5);
// Rendering scale: stage percent per physical millimetre. Ring radius and
// bead diameters share it, so beads sit tangent along the cord — a 20mm bead
// truly draws twice as wide as a 10mm one and neighbours never overlap.
export const PCT_PER_MM = 0.95;

export function itemMM(item: DesignItem) { if (item.kind === "stone") return BEAD_MM[item.size ?? "large"]; return byAccessory[item.id].type === "spacer" ? 5 : 3; }
export function itemPrice(item: DesignItem) { if (item.kind === "accessory") return byAccessory[item.id].price; const base = byStone[item.id].price; return base + (item.size === "xlarge" ? 320 : item.size === "small" ? 0 : 80); }
export function label(item: DesignItem) { return item.kind === "stone" ? byStone[item.id].en : byAccessory[item.id].en; }
export function sizeLabel(size: BeadSize = "large") { return size === "xlarge" ? "20mm focal" : size === "large" ? "10mm" : "8mm"; }

// Bigger beads carry more of the stone's energy into the design.
export function energyScores(items: DesignItem[]) {
  const sizeWeight = (s?: BeadSize) => (s === "xlarge" ? 1.6 : s === "small" ? 0.8 : 1);
  const scores = { wealth: 0, love: 0, healing: 0, protection: 0, focus: 0, power: 0 } as Record<EnergyType, number>;
  items.forEach((item) => {
    if (item.kind !== "stone") return;
    const stone = byStone[item.id];
    const w = sizeWeight(item.size);
    ENERGY_META.forEach((m) => { scores[m.key] += stone.energy[m.key] * w * 36; });
  });
  ENERGY_META.forEach((m) => { scores[m.key] = Math.round(scores[m.key]); });
  return scores;
}
export function dominantOf(scores: Record<EnergyType, number>) {
  return ENERGY_META.reduce((best, m) => (scores[m.key] > scores[best.key] ? m : best), ENERGY_META[0]);
}

export const buildSpec = (spec: [string, BeadSize?][]): DesignItem[] => spec.map(([id, size]) => byAccessory[id]
  ? ({ kind: "accessory", id, uid: nextUid() } as DesignItem)
  : ({ kind: "stone", id, size: size ?? "large", uid: nextUid() } as DesignItem));

// Compact spec notation used by the series catalogue: "obsidian.x,obsidian.l,gold-hex".
// `.x` = 20mm focal, `.s` = 8mm accent, anything else (or bare) = 10mm.
export function parseSpec(spec: string): DesignItem[] {
  return spec.split(",").map((token) => {
    const [id, sz] = token.trim().split(".");
    if (byAccessory[id]) return { kind: "accessory", id, uid: nextUid() } as DesignItem;
    return { kind: "stone", id, size: sz === "x" ? "xlarge" : sz === "s" ? "small" : "large", uid: nextUid() } as DesignItem;
  });
}

// Shareable design links: ?d=<wrist>|<id>.<size>,<id>,…
export const encodeDesign = (items: DesignItem[], wristCm: number) => `${wristCm}|` + items.map((it) => it.kind === "stone" ? `${it.id}.${it.size === "xlarge" ? "x" : it.size === "small" ? "s" : "l"}` : it.id).join(",");
export function decodeDesign(code: string): { wrist: number; items: DesignItem[] } | null {
  try {
    const [w, list] = code.split("|");
    const wrist = Number(w);
    if (!WRIST_CHOICES.includes(wrist) || !list) return null;
    const items: DesignItem[] = [];
    for (const token of list.split(",")) {
      const [id, sz] = token.split(".");
      if (byStone[id]) items.push({ kind: "stone", id, size: sz === "x" ? "xlarge" : sz === "s" ? "small" : "large", uid: nextUid() });
      else if (byAccessory[id]) items.push({ kind: "accessory", id, uid: nextUid() });
      else return null;
    }
    if (!items.length || items.length > 42) return null;
    if (items.reduce((sum, it) => sum + itemMM(it), 0) > wrist * 10) return null;
    return { wrist, items };
  } catch { return null; }
}

// draggable={false}: the browser's native image drag hijacks the pointer
// stream (firing pointercancel) and kills bead drag-reordering.
export function Crystal({ stone, size = "large" }: { stone: Stone; size?: BeadSize }) {
  const photo = stonePhotos[stone.id];
  if (photo) return <span className={`crystal photo ${size}`}><img src={photo} alt={`${stone.en}, front view`} draggable={false} /></span>;
  return <span className={`crystal ${size}`} style={{ "--c": stone.color, "--l": stone.light, "--d": stone.deep } as React.CSSProperties}><i /><b /><em /></span>;
}
export function Hardware({ a, small = false }: { a: Accessory; small?: boolean }) {
  const photo = accessoryPhotos[a.id];
  if (photo) return <span className={`hardware photo ${a.type} ${small ? "small" : ""}`}><img src={photo} alt={`${a.en}, front view`} draggable={false} /></span>;
  return <span className={`hardware ${a.metal} ${a.type} shape-${a.shape} ${small ? "small" : ""}`}><i /><b /></span>;
}
export function ItemVisual({ item, small = false }: { item: DesignItem; small?: boolean }) {
  const stoneSize: BeadSize = small ? "small" : item.size ?? "large";
  return item.kind === "stone" ? <Crystal stone={byStone[item.id]} size={stoneSize} /> : <Hardware a={byAccessory[item.id]} small={small || byAccessory[item.id].type === "spacer"} />;
}
