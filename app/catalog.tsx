"use client";

// 相容門面（façade）：原本 590 行的 catalog.tsx 拆成五個單一職責模組，
// 這裡原封不動 re-export 全部——既有的 `from "./catalog"` import 一個都
// 不用改，新程式則可以直接 import 對應的子模組。
//   materials.ts        資料表、照片、尺寸階梯、單品定價
//   strand-geometry.ts  弧長模型、扇形、填充判斷、layoutStrand
//   taxonomy.ts         能量計分、顏色分群、七脈輪
//   design-codec.ts     spec 記法與分享連結編解碼
//   catalog-visuals.tsx Crystal / Hardware / ItemVisual
export * from "./materials";
export * from "./strand-geometry";
export * from "./taxonomy";
export * from "./design-codec";
export * from "./catalog-visuals";
