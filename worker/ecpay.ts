// 綠界 ECPay 全方位金流（AioCheckOut V5）。
//
// 流程：結帳成立訂單（orders.ts，status=pending）→ 前端 POST
// /api/pay/ecpay 拿到表單欄位＋簽章 → 瀏覽器 form POST 到綠界收銀台 →
// 客人刷卡 → 綠界「伺服器對伺服器」POST ReturnURL（這裡核對簽章與金
// 額後把訂單改成 paid）→ 瀏覽器經 OrderResultURL 轉回站上顯示結果。
//
// 付款狀態的真相永遠來自 ReturnURL 的伺服器回呼——瀏覽器導回的結果
// 頁只做顯示，改不動任何訂單狀態以外的東西。
//
// 預設憑證是綠界官方公開的測試商店（developers.ecpay.com.tw 文件頁
// 直接刊出，所有開發者共用，非機密）；正式上線時以 wrangler secret
// 覆蓋 ECPAY_* 即可，程式不用改。
//
// 安全規則：公開測試金鑰「只在完全沒設定任何 ECPAY_* secret 時」生效，
// 而且永遠指向 stage——絕不會出現正式站配測試金鑰的組合（那等於任何
// 人都能用公開金鑰偽造付款回呼）。只設定了一部分 secrets 視為設定
// 錯誤，回 503 而不是悄悄用測試值補齊。
import { Env, json, ORDER_ID_RE, rateLimited } from "./lib";
import { getOrder, markPaid } from "./orders-store";

const TEST_MERCHANT_ID = "3362787";
const TEST_HASH_KEY = "5tzn8qyhl9EwzwuT";
const TEST_HASH_IV = "iz8YXaAUx60tijdL";
const TEST_BASE = "https://payment-stage.ecpay.com.tw";
const PROD_BASE = "https://payment.ecpay.com.tw";

type EcpayCfg = { merchantId: string; hashKey: string; hashIv: string; base: string };

function cfg(env: Env): EcpayCfg | null {
  const anySet = env.ECPAY_MERCHANT_ID || env.ECPAY_HASH_KEY || env.ECPAY_HASH_IV;
  if (anySet) {
    if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) return null; // 部分設定＝設定錯誤
    return {
      merchantId: env.ECPAY_MERCHANT_ID,
      hashKey: env.ECPAY_HASH_KEY,
      hashIv: env.ECPAY_HASH_IV,
      base: (env.ECPAY_BASE ?? PROD_BASE).replace(/\/$/, ""),
    };
  }
  // 未設定 → 測試商店，強制 stage（忽略 ECPAY_BASE，杜絕測試金鑰打正式站）。
  return { merchantId: TEST_MERCHANT_ID, hashKey: TEST_HASH_KEY, hashIv: TEST_HASH_IV, base: TEST_BASE };
}

// .NET HttpUtility.UrlEncode 相容編碼：綠界簽章規定用它的保留字集合。
// encodeURIComponent 之後只差三處：空白是 +、~ 要編、' 要編。
const dotNetUrlEncode = (s: string) => encodeURIComponent(s)
  .replace(/%20/g, "+")
  .replace(/~/g, "%7e")
  .replace(/'/g, "%27");

// CheckMacValue（EncryptType=1／SHA-256）：參數鍵不分大小寫排序 →
// HashKey 開頭、HashIV 結尾串起來 → .NET UrlEncode → 全轉小寫 →
// SHA-256 → 全大寫。
export async function checkMacValue(params: Record<string, string>, hashKey: string, hashIv: string): Promise<string> {
  const keys = Object.keys(params).filter((k) => k !== "CheckMacValue")
    .sort((a, b) => { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; });
  const raw = `HashKey=${hashKey}&${keys.map((k) => `${k}=${params[k]}`).join("&")}&HashIV=${hashIv}`;
  const encoded = dotNetUrlEncode(raw).toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encoded));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// 綠界要台北時間 yyyy/MM/dd HH:mm:ss。
function taipeiNow(): string {
  const t = new Date(Date.now() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}

// MerchantTradeNo：≤20 位英數、每次付款嘗試都要唯一（同一張訂單重試
// 也要換號）。訂單號去掉連字號後補上時間亂數尾巴；真正的訂單對應放
// CustomField1，回呼時取回。
const tradeNoFor = (orderId: string) =>
  (orderId.replace(/[^A-Za-z0-9]/g, "") + "T" + Date.now().toString(36).toUpperCase()).slice(0, 20);

async function createPayment(request: Request, env: Env, url: URL): Promise<Response> {
  const c = cfg(env);
  if (!c) return json({ error: "payment not configured" }, { status: 503 });
  if (rateLimited(request, "pay", 10)) return json({ error: "too many requests" }, { status: 429 });
  let orderId = "";
  try { orderId = String(((await request.json()) as { order?: unknown }).order ?? ""); } catch { /* validated below */ }
  if (!ORDER_ID_RE.test(orderId)) return json({ error: "invalid order id" }, { status: 400 });
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: "order not found" }, { status: 404 });
  if (order.status !== "pending") return json({ error: `order is ${order.status}` }, { status: 409 });

  const { merchantId, hashKey, hashIv, base } = c;
  const tradeNo = tradeNoFor(orderId);
  const fields: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: taipeiNow(),
    PaymentType: "aio",
    TotalAmount: String(order.total),
    TradeDesc: "OMA CRYSTAL 能量水晶手鍊",
    ItemName: `OMA CRYSTAL 訂單 ${orderId}`,
    ReturnURL: `${url.origin}/api/ecpay/return`,
    OrderResultURL: `${url.origin}/api/ecpay/result`,
    ClientBackURL: `${url.origin}/?pay=back`,
    ChoosePayment: "ALL",
    EncryptType: "1",
    CustomField1: orderId,
    NeedExtraPaidInfo: "N",
  };
  fields.CheckMacValue = await checkMacValue(fields, hashKey, hashIv);
  // 紀錄本次嘗試的交易號，後台對帳查得到；付款成功後會再蓋成綠界的
  // TradeNo。
  await env.DB.prepare("UPDATE orders SET ecpay_trade_no=? WHERE id=?").bind(tradeNo, orderId).run();
  return json({ action: `${base}/Cashier/AioCheckOut/V5`, fields });
}

async function verifiedCallback(request: Request, env: Env): Promise<{ params: URLSearchParams; ok: boolean; merchantId: string }> {
  const c = cfg(env);
  const params = new URLSearchParams(await request.text());
  if (!c) return { params, ok: false, merchantId: "" };
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  const theirs = (obj.CheckMacValue ?? "").toUpperCase();
  const ours = await checkMacValue(obj, c.hashKey, c.hashIv);
  return { params, ok: !!theirs && theirs === ours, merchantId: c.merchantId };
}

// 伺服器回呼：付款狀態唯一的真相來源。四道防線：簽章、商店代號、
// 金額對訂單、交易號前綴對訂單（tradeNoFor 的產生規則）。
async function paymentReturn(request: Request, env: Env): Promise<Response> {
  const { params, ok, merchantId } = await verifiedCallback(request, env);
  if (!ok) return new Response("0|CheckMacValue Error");
  if ((params.get("MerchantID") ?? "") !== merchantId) return new Response("0|Unknown Merchant");
  const orderId = params.get("CustomField1") ?? "";
  const rtnCode = params.get("RtnCode") ?? "";
  const amount = Number(params.get("TradeAmt") ?? "");
  if (!ORDER_ID_RE.test(orderId)) return new Response("0|Unknown Order");
  const tradePrefix = orderId.replace(/[^A-Za-z0-9]/g, "") + "T";
  if (!(params.get("MerchantTradeNo") ?? "").startsWith(tradePrefix)) return new Response("0|Unknown Trade");
  if (rtnCode === "1") {
    const order = await getOrder(env, orderId);
    if (!order || order.total !== amount) return new Response("0|Amount Mismatch");
    await markPaid(env, orderId, "ecpay_trade_no", params.get("TradeNo") ?? "");
  } else {
    // 失敗通知：留一筆伺服器日誌供對帳（不動訂單），並回 1|OK 讓綠界
    // 停止重送。
    console.warn("ecpay payment failed", { orderId, rtnCode, msg: params.get("RtnMsg") ?? "" });
  }
  return new Response("1|OK");
}

// 瀏覽器導回：只負責把客人送回站上並帶結果訊息，不動訂單。
async function paymentResult(request: Request, env: Env, url: URL): Promise<Response> {
  const { params, ok } = await verifiedCallback(request, env);
  const paid = ok && params.get("RtnCode") === "1";
  const orderId = ok ? (params.get("CustomField1") ?? "") : "";
  const dest = new URL(url.origin);
  dest.searchParams.set("pay", paid ? "ok" : "fail");
  if (ORDER_ID_RE.test(orderId)) dest.searchParams.set("order", orderId);
  return new Response(null, { status: 302, headers: { location: dest.toString() } });
}

export async function handleEcpay(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== "POST") return null;
  if (url.pathname === "/api/pay/ecpay") return createPayment(request, env, url);
  if (url.pathname === "/api/ecpay/return") return paymentReturn(request, env);
  if (url.pathname === "/api/ecpay/result") return paymentResult(request, env, url);
  return null;
}
