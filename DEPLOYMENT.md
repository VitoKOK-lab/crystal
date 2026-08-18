# 部署指南

正式環境跑在 **Cloudflare Workers**（網址 `https://oma-crystal.vitokok.workers.dev`），
靜態站與 API 同一個 Worker 服務。部署完全自動：**推送到 `main` 分支即部署**，
流程定義在 `.github/workflows/deploy-cloudflare.yml`。

## 自動部署做了什麼

1. `npm ci` → `npm run build:cf`（前台＋後台雙 vite 建置，最後跑 CJK 字型
   覆蓋檢查，缺字直接紅燈）
2. 首次執行自動建立 D1 資料庫 `oma-crystal` 與 R2 bucket `oma-crystal-img`
3. `wrangler d1 migrations apply oma-crystal --remote` — `migrations/` 下的
   新 SQL 自動套用
4. 同步 secrets（只在 GitHub Secrets 有設定時）：`GOOGLE_CLIENT_SECRET`、
   `KIMI_API_KEY`、`LINE_PAY_CHANNEL_ID`、`LINE_PAY_CHANNEL_SECRET`
5. `wrangler deploy` → 對 `/api/health` 與首頁做煙霧測試

## GitHub Secrets 一覽

| Secret | 用途 | 沒設定時 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN`／`CLOUDFLARE_ACCOUNT_ID` | 部署（必填） | 部署失敗（fail early） |
| `GOOGLE_CLIENT_ID`（var）＋`GOOGLE_CLIENT_SECRET` | 後台 Google 登入 | 後台登入停用 |
| `KIMI_API_KEY` | AI 解讀／命名 | 前台靜靜退回內建文案 |
| `LINE_PAY_CHANNEL_ID`＋`LINE_PAY_CHANNEL_SECRET` | LINE Pay | 按鈕顯示「尚未開通」 |
| `ECPAY_MERCHANT_ID`＋`ECPAY_HASH_KEY`＋`ECPAY_HASH_IV`（＋`ECPAY_BASE`） | 綠界正式商店 | 用官方公開測試商店（stage，不收真錢） |

安全規則：綠界測試金鑰**只在完全沒設定 ECPAY secrets 時**生效且強制走
stage；只設定一部分視為設定錯誤（API 回 503）。正式上線就是把正式商店的
三個值設進 Secrets，程式不用改。LINE Pay 正式環境另加
`LINE_PAY_BASE=https://api-pay.line.me`。

## 本地開發

```bash
npm install
npx wrangler d1 migrations apply oma-crystal --local   # 首次＋每次新 migration
npm run dev                                            # http://localhost:8787
```

環境變數可用 `--var` 傳入（如 `KIMI_API_KEY`），或放 `.dev.vars`（勿提交）。

## 中文字型子集

字型只含站上實際用到的字。新增中文文案後若建置報缺字：

```bash
npm run build:cf                        # 會列出缺哪些字
python3 scripts/build-cjk-fonts.py      # 重建 public/fonts/*.woff2（需 fonttools+brotli）
```

## 資料備份

- 訂單／目錄資料在 D1：`npx wrangler d1 export oma-crystal --remote --output=backup.sql`
- 後台上傳的照片在 R2 bucket `oma-crystal-img`
