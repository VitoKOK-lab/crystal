# 🔮 OMA CRYSTAL — 水晶手鍊 DIY 工作室＋商店

[![Node.js Required](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg)](https://nodejs.org/)

> 把此刻的心願，串成每日戴得住的光。

**線上版本：https://oma-crystal.vitokok.workers.dev**（推送到 `main` 即自動部署）

## ✨ 功能總覽

- **設計工作室** — 109 種天然水晶＋隔珠/吊飾（含字母 A–Z），拖曳重排、
  弧長幾何的手圍計算（串滿自動放大）、顏色與能量雙重篩選
- **360° 立體預覽** — Three.js 實體渲染：玻璃感透光材質、切面礦石、
  柔光箱環境光（按需載入，不拖慢首屏）
- **六維能量系統** — 財富/愛情/療癒/守護/專注/力量雷達圖＋缺口補石推薦
- **選石測驗** — 深度配對（生日×MBTI×七脈輪）、許願式選石、閨蜜/情侶
  合盤；接 Moonshot Kimi 產生個人化解讀（沒設 API key 也有完整內建文案）
- **分享卡** — AI 命名＋籤詩、可分享的設計連結（`?d=` 編碼）
- **系列商店** — 8 個系列 × 成品實景照，一鍵載入工作室客製
- **結帳＋金流** — 真實訂單寫入 D1、伺服器重算價格與庫存扣減；
  綠界 ECPay（信用卡）＋ LINE Pay v3 雙金流
- **後台管理** — Google OAuth 白名單登入：材料 CRUD、尺寸階梯、照片
  上傳（R2）、訂單管理、運費設定

## 🚀 開發

```bash
npm install
npm run dev        # build + wrangler dev（http://localhost:8787）
npm test           # node:test（worker 邏輯 + 純函式目錄邏輯）
npm run lint       # eslint
npm run build:cf   # 正式建置（含 CJK 字型覆蓋檢查）
```

本地資料庫：`npx wrangler d1 migrations apply oma-crystal --local`。

## 🛠 技術棧

- **前端** — React 19 + Vite 8 + TypeScript（無框架路由，view 狀態進 URL）
- **3D** — three / @react-three/fiber / drei（code-split）
- **後端** — Cloudflare Workers + D1（SQLite）+ R2（照片）
- **AI** — Moonshot Kimi（JSON mode，.cn/.ai 雙平台自動切換）
- **部署** — GitHub Actions → wrangler（見 `DEPLOYMENT.md`）

## 📁 結構

```
crystal/
├── app/            # 前台（工作室、商店、測驗、結帳、3D 預覽）
├── app-admin/      # 後台 SPA（/admin）
├── worker/         # Cloudflare Worker：API、金流、AI 代理、auth
├── migrations/     # D1 schema（CI 自動 apply）
├── pages-static/   # 前台 vite 入口
├── pages-admin/    # 後台 vite 入口
├── public/         # 材料照片、系列 banner、字型子集
├── scripts/        # 照片處理、字型子集、資料產生
└── tests/          # node:test（假 D1）
```

## 📄 許可證

MIT License
