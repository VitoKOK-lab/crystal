# 🔮 OMA Crystal - Interactive Crystal Bracelet Builder

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Vinext](https://img.shields.io/badge/Built%20with-Vinext-blue.svg)](https://github.com/cloudflare/vinext)
[![Node.js Required](https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen.svg)](https://nodejs.org/)

> 一個優雅的水晶手鍊設計應用，結合能量冥想與互動設計的完美融合

## ✨ 特色功能

### 🎨 交互式設計器
- **16種天然水晶** - 每種都有獨特的能量屬性
- **20+精緻配件** - 隔珠、吊飾、金銀飾品
- **拖曳重排** - 直觀的珠子位置調整
- **即時預覽** - 實時3D視覺化
- **多尺寸選擇** - 8mm / 10mm / 20mm 特大主珠，手圍依珠徑即時累計（上限 22cm）

### ⚡ 能量矩陣系統
- **6維度能量分析** - 豐盛、愛情、療癒、守護、清晰、能量
- **實時雷達圖表** - 視覺化能量組成
- **智能推薦** - 基於能量屬性推薦搭配
- **能量計分** - 1-10分的能量強度

### 📚 互動教學
- **5步驟設計指南** - 新手友好的逐步教程
- **美麗動畫** - 流暢的過渡和互動效果
- **響應式設計** - 在所有設備上完美展現

### 💰 智能定價
- **即時計算** - 根據選擇自動計算價格
- **尺寸差異** - 不同珠子尺寸的定價
- **詳細明細** - 清楚的價格分解

## 🚀 快速開始

### 前置需求
- Node.js `>= 22.13.0`
- npm 或 yarn

### 安裝步驟

```bash
# 克隆項目
git clone https://github.com/VitoKOK-lab/crystal.git
cd crystal

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 開啟瀏覽器並訪問
# http://localhost:5173
```

### 構建和部署

```bash
# 構建生產版本
npm run build

# 預覽構建結果
npm run start

# 驗證構建
npm run validate:artifact
```

## 🔷 水晶庫

### 16種天然水晶

| 名稱 | 英文 | 主要能量 | 價格 |
|------|------|---------|------|
| 粉水晶 | Rose Quartz | 愛情、溫柔 | NT$260 |
| 白水晶 | Clear Quartz | 淨化、清晰 | NT$230 |
| 紫水晶 | Amethyst | 守護、平靜 | NT$280 |
| 黃水晶 | Citrine | 豐盛、自信 | NT$300 |
| 海藍寶 | Aquamarine | 療癒、自在 | NT$360 |
| 黑碧璽 | Black Tourmaline | 守護、穩定 | NT$290 |
| 太陽石 | Sunstone | 行動、勇氣 | NT$330 |
| 月光石 | Moonstone | 療癒、直覺 | NT$320 |
| 苔蘚瑪瑙 | Moss Agate | 生長、療癒 | NT$290 |
| 青金石 | Lapis Lazuli | 表達、智慧 | NT$330 |
| 石榴石 | Garnet | 熱情、行動 | NT$310 |
| 虎眼石 | Tiger's Eye | 豐盛、果斷 | NT$270 |
| 茶晶 | Smoky Quartz | 沉穩、守護 | NT$300 |
| 螢石 | Fluorite | 淨化、思緒 | NT$320 |
| 薔薇輝石 | Rhodonite | 愛情、修復 | NT$350 |
| 拉長石 | Labradorite | 守護、光芒 | NT$380 |

## 🛠 技術堆棧

- **前端框架** - React 19 (via Vinext)
- **編譯工具** - Vite 8
- **樣式** - CSS Grid + Flexbox
- **類型系統** - TypeScript
- **部署** - Cloudflare Workers/Pages
- **數據庫** - Cloudflare D1 (可選)

## 📁 項目結構

```
crystal/
├── app/
│   ├── page.tsx              # 主應用組件
│   ├── design-guide.tsx      # 設計教學模態框
│   ├── layout.tsx            # 頁面佈局
│   ├── globals.css           # 全局樣式
│   ├── chatgpt-auth.ts       # ChatGPT認證
│   └── [其他文件]
├── public/
│   ├── materials/            # 水晶及配件圖片
│   ├── favicon.svg
│   └── [其他資源]
├── worker/
│   └── index.ts              # Cloudflare Worker
├── build/
│   └── sites-vite-plugin.ts
├── scripts/
│   ├── build-verified.sh     # 驗證構建
│   ├── install-ci.sh         # CI安裝
│   └── validate-artifact.sh
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🎨 設計靈感

本項目受到 [Sunday Fate - The Intention Builder](https://sundayfate.com/pages/the-intention-builder) 的啟發，但提供了以下增強：

✅ **更優雅的視覺設計** - 現代審美的重新設計  
✅ **能量矩陣系統** - 完整的能量可視化  
✅ **互動教學** - 逐步引導新用戶  
✅ **更多選擇** - 擴展的水晶和配件庫  
✅ **流暢動畫** - 專業級的過渡效果  
✅ **完全響應式** - 移動/平板/桌面完美適配  

## 🌐 在線演示

**立即體驗：https://vitokok-lab.github.io/crystal/**

每次推送到 `main` 分支都會透過 GitHub Actions 自動重新部署。

## 📝 功能路線圖

- [x] 基礎水晶設計器
- [x] 能量矩陣可視化
- [x] 互動設計指南
- [ ] 用戶賬戶系統
- [ ] 設計保存和分享
- [ ] 社區展示廊
- [ ] AI 推薦引擎
- [ ] 打印和導出功能
- [ ] 多語言支持
- [ ] 深色模式

## 🔧 開發指南

### 添加新水晶
編輯 `app/page.tsx` 中的 `stones` 數組：

```typescript
["id", "中文名", "English Name", "分類", "#顏色", "#亮色", "#深色", 價格, "描述", {能量屬性}]
```

### 自定義能量維度
修改 `EnergyMatrix` 組件中的 `energyTypes` 數組。

### 修改設計指南
編輯 `app/design-guide.tsx` 中的 `steps` 數組。

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📞 聯絡方式

- 📧 Email: hello@omacrystal.com
- 🌍 Website: [即將推出]
- 💬 Discord: [即將加入]

---

**Made with 💎 and ✨ by OMA Crystal Team**

*在每個細節中投入意圖，讓水晶成為你日常能量的伴侶*
