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
// 覆蓋 ECPAY_* 與 ECPAY_BASE 即可，程式不用改。
import { Env, json } from "./lib";

const TEST_MERCHANT_ID = "3362787";
const TEST_HASH_KEY = "5tzn8qyhl9EwzwuT";
const TEST_HASH_IV = "iz8YXaAUx60tijdL";
const TEST_BASE = "https://payment-stage.ecpay.com.tw";

const cfg = (env: Env) => ({
  merchantId: env.ECPAY_MERCHANT_ID ?? TEST_MERCHANT_ID,
  hashKey: env.ECPAY_HASH_KEY ?? TEST_HASH_KEY,
  hashIv: env.ECPAY_HASH_IV ?? TEST_HASH_IV,
  base: (env.ECPAY_BASE ?? TEST_BASE).replace(/\/$/, ""),
});

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
  let orderId = "";
  try { orderId = String(((await request.json()) as { order?: unknown }).order ?? ""); } catch { /* validated below */ }
  if (!/^OMA-[A-Z0-9]{4,20}$/.test(orderId)) return json({ error: "invalid order id" }, { status: 400 });
  const order = await env.DB.prepare("SELECT id, total, status FROM orders WHERE id=?").bind(orderId)
    .first<{ id: string; total: number; status: string }>();
  if (!order) return json({ error: "order not found" }, { status: 404 });
  if (order.status !== "pending") return json({ error: `order is ${order.status}` }, { status: 409 });

  const { merchantId, hashKey, hashIv, base } = cfg(env);
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

async function verifiedCallback(request: Request, env: Env): Promise<{ params: URLSearchParams; ok: boolean }> {
  const { hashKey, hashIv } = cfg(env);
  const params = new URLSearchParams(await request.text());
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  const theirs = (obj.CheckMacValue ?? "").toUpperCase();
  const ours = await checkMacValue(obj, hashKey, hashIv);
  return { params, ok: !!theirs && theirs === ours };
}

// 伺服器回呼：付款狀態唯一的真相來源。簽章不對就拒收；金額對不上
// 訂單也拒收（有人偽造成功通知時，這兩道就擋掉了）。
async function paymentReturn(request: Request, env: Env): Promise<Response> {
  const { params, ok } = await verifiedCallback(request, env);
  if (!ok) return new Response("0|CheckMacValue Error");
  const orderId = params.get("CustomField1") ?? "";
  const rtnCode = params.get("RtnCode") ?? "";
  const amount = Number(params.get("TradeAmt") ?? "");
  if (!/^OMA-[A-Z0-9]{4,20}$/.test(orderId)) return new Response("0|Unknown Order");
  if (rtnCode === "1") {
    const order = await env.DB.prepare("SELECT total, status FROM orders WHERE id=?").bind(orderId)
      .first<{ total: number; status: string }>();
    if (!order || order.total !== amount) return new Response("0|Amount Mismatch");
    await env.DB.prepare("UPDATE orders SET status='paid', ecpay_trade_no=? WHERE id=? AND status='pending'")
      .bind(params.get("TradeNo") ?? "", orderId).run();
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
  if (/^OMA-[A-Z0-9]{4,20}$/.test(orderId)) dest.searchParams.set("order", orderId);
  return new Response(null, { status: 302, headers: { location: dest.toString() } });
}

export async function handleEcpay(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== "POST") return null;
  if (url.pathname === "/api/pay/ecpay") return createPayment(request, env, url);
  if (url.pathname === "/api/ecpay/return") return paymentReturn(request, env);
  if (url.pathname === "/api/ecpay/result") return paymentResult(request, env, url);
  return null;
}
