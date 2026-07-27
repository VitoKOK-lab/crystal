# 🚀 部署指南

本項目支持多種部署方式。選擇最適合您的方法。

## 選項 1: Cloudflare Pages (推薦) 🌐

### 前置要求
- Cloudflare 帳戶
- 域名（可選）

### 步驟

1. **連接 GitHub 倉庫**
   - 訪問 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 進入 "Pages" 部分
   - 點擊 "連接到 Git"
   - 授權 GitHub 訪問權限
   - 選擇 `VitoKOK-lab/crystal` 倉庫

2. **配置構建設置**
   - **框架預設**: None
   - **構建命令**: `npm run build`
   - **構建輸出目錄**: `.vinext/dist`
   - **環境變量**: (無需配置)

3. **設置環境變量** (如需要)
   ```
   CLOUDFLARE_API_TOKEN: [你的 API Token]
   CLOUDFLARE_ACCOUNT_ID: [你的帳戶 ID]
   ```

4. **部署**
   - 保存設置後自動部署
   - 每次推送到 `main` 分支都會自動重新部署

### 查看部署狀態
```bash
# 在本地構建並測試
npm run build
npm run start
```

---

## 選項 2: GitHub Pages 📄

### 步驟

1. **在倉庫設置中啟用 Pages**
   - 進入 Settings → Pages
   - 選擇 Source: "Deploy from a branch"
   - 選擇 Branch: `main` / `/ (root)`

2. **自動部署**
   - 推送到 main 分支即可自動部署

### 限制
- 需要在 `vite.config.ts` 中配置 base URL
- 不支持服務器端路由

---

## 選項 3: Vercel 🎯

### 步驟

1. **連接 GitHub**
   - 訪問 [Vercel](https://vercel.com)
   - 點擊 "Import Project"
   - 連接 GitHub 帳戶

2. **導入倉庫**
   - 選擇 `VitoKOK-lab/crystal`
   - Vercel 會自動檢測為 Next.js 項目

3. **部署**
   - 點擊 "Deploy"
   - 等待構建完成

---

## 選項 4: Docker 🐳

### 構建 Docker 鏡像

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "start"]
```

### 運行容器

```bash
docker build -t crystal-builder .
docker run -p 5173:5173 crystal-builder
```

---

## 選項 5: 本地服務器 (開發)

### 快速啟動

```bash
# 安裝依賴
npm install

# 開發模式 (帶熱重載)
npm run dev

# 訪問
open http://localhost:5173
```

### 生產構建

```bash
# 構建
npm run build

# 驗證
npm run validate:artifact

# 啟動生產服務器
npm run start
```

---

## 環境變量

### 可選配置

```env
# OpenAI 配置 (用於 ChatGPT 登錄)
VITE_OPENAI_API_KEY=your_key_here

# 資料庫 (D1)
VITE_DATABASE_URL=your_d1_url

# API 基礎 URL
VITE_API_BASE_URL=https://api.example.com
```

---

## 持續集成

### GitHub Actions

項目已配置自動 CI/CD:

1. **代碼推送** → 觸發 GitHub Actions
2. **自動測試** → 運行 ESLint 和構建驗證
3. **自動部署** → 部署到 Cloudflare Pages

### 查看構建狀態

```bash
# 查看工作流
git log --oneline | grep "Deploy"

# 在 GitHub 上查看
# Settings → Actions
```

---

## 性能優化

### 構建優化

```bash
# 分析包體積
npm run build -- --analyze

# 驗證構建
npm run validate:artifact
```

### 運行時優化

- 啟用 CDN 緩存
- 使用 Cloudflare 圖片優化
- 啟用 Brotli 壓縮

---

## 故障排除

### 構建失敗

```bash
# 清理緩存
rm -rf node_modules package-lock.json
npm install

# 重新構建
npm run build
```

### 部署失敗

1. 檢查 Node.js 版本: `node --version` (需 >= 22.13.0)
2. 檢查構建輸出: 確保 `.vinext/dist` 存在
3. 查看日誌: GitHub Actions 或 Cloudflare Dashboard

### 性能問題

- 減少初始 JavaScript 體積
- 實現代碼分割
- 優化圖片資源

---

## 域名配置

### 添加自定義域名到 Cloudflare Pages

1. 進入 Pages 項目設置
2. 在 "Custom domain" 中添加域名
3. 按照 DNS 配置說明操作

### DNS 記錄

```
Type: CNAME
Name: crystal
Value: crystal-builder.pages.dev
```

---

## 監控和日誌

### 查看部署日誌

- **Cloudflare Pages**: Dashboard → Deployments → Build Logs
- **GitHub Actions**: Actions 選項卡 → 選擇工作流 → 查看日誌

### 性能監控

- 使用 Cloudflare 分析
- 集成 Sentry 用於錯誤追蹤
- 使用 Google Analytics

---

## 安全性

### 生產環境清單

- [ ] 環境變量已正確設置
- [ ] API 金鑰已安全存儲
- [ ] CORS 已正確配置
- [ ] 啟用 HTTPS
- [ ] 設置安全標頭
- [ ] 更新依賴包

---

## 支持

如遇問題，請：

1. 檢查此文檔
2. 查看項目 Issues
3. 聯絡支持團隊

**Happy deploying! 🚀✨**
