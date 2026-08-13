import type { BeadSize } from "./catalog";

// One-tap recipes: stones weighted toward each intention's energy profile,
// padded with the theme stone to fill the wearer's wrist.
export const PRESETS = {
  power: { name: "站穩自己", pad: "obsidian", spec: [["obsidian","xlarge"],["lava","large"],["obsidian","large"],["hematite","large"],["gold-hex"],["obsidian","large"],["lava","large"],["obsidian","large"],["gold-hex"],["hematite","large"],["obsidian","large"],["lava","large"],["arrow"]] as [string, BeadSize?][] },
  wealth: { name: "豐盛流動", pad: "goldstone", spec: [["goldstone","xlarge"],["tiger-eye","large"],["goldstone","large"],["citrine","large"],["gold-hex"],["goldstone","large"],["tiger-eye","large"],["goldstone","large"],["gold-hex"],["citrine","large"],["goldstone","large"],["tiger-eye","large"],["compass"]] as [string, BeadSize?][] },
  focus: { name: "靜下來", pad: "smoky", spec: [["tiger-eye","xlarge"],["smoky","large"],["clear","large"],["smoky","large"],["silver-hex"],["tiger-eye","large"],["smoky","large"],["clear","large"],["silver-hex"],["smoky","large"],["tiger-eye","large"],["smoky","large"],["compass"]] as [string, BeadSize?][] },
  gym: { name: "身體的力量", pad: "lava", spec: [["garnet","xlarge"],["lava","large"],["sunstone","large"],["hematite","large"],["gold-hex"],["garnet","large"],["lava","large"],["sunstone","large"],["gold-hex"],["hematite","large"],["garnet","large"],["lava","large"],["arrow"]] as [string, BeadSize?][] },
  office: { name: "工作日的界線", pad: "lapis", spec: [["lapis","xlarge"],["moon","large"],["clear","large"],["lapis","large"],["silver-hex"],["moon","large"],["lapis","large"],["clear","large"],["silver-hex"],["lapis","large"],["moon","large"],["lapis","large"],["key"]] as [string, BeadSize?][] },
  travel: { name: "路上有人陪", pad: "labradorite", spec: [["labradorite","xlarge"],["tourmaline","large"],["amethyst","large"],["labradorite","large"],["silver-hex"],["tourmaline","large"],["labradorite","large"],["amethyst","large"],["silver-hex"],["labradorite","large"],["tourmaline","large"],["labradorite","large"],["travel-compass"]] as [string, BeadSize?][] },
} as const;
