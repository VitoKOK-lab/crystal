"use client";

import { ENERGY_META, byStone, encodeDesign, type DesignItem, type Stone } from "./catalog";
import type { PreviewPiece } from "./preview-3d";
import { generateShareCard } from "./share-card";

// 分享卡的完整流程：AI 命名（拿不到就照舊出卡）→ canvas 畫卡 →
// Web Share（或下載＋複製連結）。與工作室的 UI 狀態無關，抽出來讓
// Home 少揹 40 行雜務。
export function useShareDesign({ items, wristCm, previewPieces, capacityMM, scores, dominant, totalEnergy, total, beads, showNotice, setNotice }: {
  items: DesignItem[];
  wristCm: number;
  previewPieces: PreviewPiece[];
  capacityMM: number;
  scores: Record<string, number>;
  dominant: (typeof ENERGY_META)[number];
  totalEnergy: number;
  total: number;
  beads: number;
  showNotice: (text: string) => void;
  setNotice: (text: string) => void;
}) {
  return async function shareDesign() {
    if (!items.length) { showNotice("先加幾顆，再把它分享出去"); return; }
    showNotice("正在產生分享卡…");
    const url = `${window.location.origin}${window.location.pathname}?d=${encodeURIComponent(encodeDesign(items, wristCm))}`;
    // AI 幫這條手鍊取名字＋一句籤詩，印在分享卡最上方。拿不到（沒設
    // key、逾時）就照舊出卡——命名是加分項，分享不能被它卡住。
    const poem = await Promise.race([
      fetch("/api/design-poem", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dominant: dominant.zh,
          stones: items.filter((it) => it.kind === "stone").map((it) => (byStone[it.id] as Stone).zh),
        }),
      }).then(async (res) => (res.ok ? ((await res.json()) as { poem: { title: string; verse: string } }).poem : null)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
    ]).catch(() => null);
    if (poem) showNotice(`這條叫《${poem.title}》—— ${poem.verse}`);
    try {
      const blob = await generateShareCard({
        pieces: previewPieces, capacityMM,
        energies: ENERGY_META.map((m) => ({ zh: m.zh, en: m.en, color: m.color, score: scores[m.key] })),
        dominant: { zh: dominant.zh, en: dominant.en, color: dominant.color, score: scores[dominant.key] },
        totalEnergy, priceNTD: total, wristCm, beads, url, poem,
      });
      const file = new File([blob], "oma-crystal-design.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "OMA CRYSTAL", text: `我的專屬能量手鍊 ${url}`, url });
        showNotice("已開啟分享面板");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "oma-crystal-design.png";
        a.click();
        URL.revokeObjectURL(a.href);
        await navigator.clipboard?.writeText(url);
        showNotice("分享卡已下載，連結已複製 — 貼給朋友就能看到同款");
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") { setNotice(""); return; }
      await navigator.clipboard?.writeText(url).catch(() => {});
      showNotice("分享卡產生失敗，已改為複製設計連結");
    }
  };
}
