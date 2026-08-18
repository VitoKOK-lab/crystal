// LINE Pay Online API v3。
//
// 流程：結帳成立訂單（status=pending）→ 前端 POST /api/pay/linepay →
// 這裡呼叫 LINE Pay Request API 拿到付款頁網址 → 瀏覽器跳轉 → 客人在
// LINE 完成授權 → LINE 把瀏覽器導回 confirmUrl（帶 transactionId）→
// 這裡用「伺服器對伺服器」的 Confirm API 請款，成功才把訂單改 paid。
//
// 付款狀態的真相來自 Confirm API 的回應——導回的網址參數只是線索，
// 訂單金額也只信資料庫裡的數字。偽造 transactionId 過不了 Confirm；
// 拿別張單的交易來冒充也會因為請款金額對不上而被 LINE 拒絕。
//
// 與綠界不同，LINE Pay 沒有公開共用的測試憑證：要在
// https://pay.line.me/tw/developers/techsupport/sandbox/creation
// 申請 Sandbox 商店（免費、馬上寄到信箱），把 Channel ID／Secret 設成
// secrets 後這個模組才會啟用；未設定時回 503，前端顯示尚未開通。
// 正式上線換成正式商店的憑證並把 LINE_PAY_BASE 指向 api-pay.line.me。
import { Env, json, ORDER_ID_RE, rateLimited } from "./lib";
import { getOrder, markPaid } from "./orders-store";

const cfg = (env: Env) => ({
  channelId: env.LINE_PAY_CHANNEL_ID ?? "",
  secret: env.LINE_PAY_CHANNEL_SECRET ?? "",
  base: (env.LINE_PAY_BASE ?? "https://sandbox-api-pay.line.me").replace(/\/$/, ""),
});

// v3 簽章：Base64(HMAC-SHA256(secret, secret + apiPath + body + nonce))。
export async function lineSign(secret: string, apiPath: string, body: string, nonce: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(secret + apiPath + body + nonce));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

// 打 LINE Pay API。回應當純文字收、用正則抓欄位——transactionId 是
// 19 位整數，JSON.parse 會掉精度，所以絕不解析它（Confirm 要用的
// transactionId 一律取自導回網址裡的字串）。
async function callApi(env: Env, apiPath: string, bodyObj: unknown): Promise<{ returnCode: string; text: string }> {
  const { channelId, secret, base } = cfg(env);
  const body = JSON.stringify(bodyObj);
  const nonce = crypto.randomUUID();
  try {
    const res = await fetch(base + apiPath, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-LINE-ChannelId": channelId,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": await lineSign(secret, apiPath, body, nonce),
      },
      body,
    });
    const text = await res.text();
    return { returnCode: /"returnCode"\s*:\s*"(\d{4})"/.exec(text)?.[1] ?? "", text };
  } catch {
    return { returnCode: "", text: "" };
  }
}

const ORDER_RE = ORDER_ID_RE;

async function createPayment(request: Request, env: Env, url: URL): Promise<Response> {
  const { channelId, secret } = cfg(env);
  if (!channelId || !secret) return json({ error: "LINE Pay 尚未開通" }, { status: 503 });
  if (rateLimited(request, "pay", 10)) return json({ error: "too many requests" }, { status: 429 });
  let orderId = "";
  try { orderId = String(((await request.json()) as { order?: unknown }).order ?? ""); } catch { /* validated below */ }
  if (!ORDER_RE.test(orderId)) return json({ error: "invalid order id" }, { status: 400 });
  const order = await getOrder(env, orderId);
  if (!order) return json({ error: "order not found" }, { status: 404 });
  if (order.status !== "pending") return json({ error: `order is ${order.status}` }, { status: 409 });

  // LINE 的 orderId 每次付款嘗試都要唯一（同一張訂單重試也要換號）；
  // 真正的訂單號放在 confirmUrl 的 query 帶回來。
  const attempt = `${orderId}-${Date.now().toString(36).toUpperCase()}`;
  const { returnCode, text } = await callApi(env, "/v3/payments/request", {
    amount: order.total,
    currency: "TWD",
    orderId: attempt,
    packages: [{
      id: "oma",
      amount: order.total,
      products: [{ name: `OMA CRYSTAL 訂單 ${orderId}`, quantity: 1, price: order.total }],
    }],
    redirectUrls: {
      confirmUrl: `${url.origin}/api/linepay/confirm?order=${orderId}`,
      cancelUrl: `${url.origin}/?pay=back&order=${orderId}`,
    },
  });
  const rawUrl = /"web"\s*:\s*"([^"]+)"/.exec(text)?.[1];
  if (returnCode !== "0000" || !rawUrl) return json({ error: `LINE Pay request failed (${returnCode || "no response"})` }, { status: 502 });
  const paymentUrl = rawUrl.replace(/\\\//g, "/");
  // 只把瀏覽器送去 LINE 自己的網域（或本地開發時 LINE_PAY_BASE 指向的
  // 同一主機）——萬一回應被動過手腳，客人也不會被導去別處。
  const payHost = (() => { try { return new URL(paymentUrl).hostname; } catch { return ""; } })();
  const baseHost = new URL(cfg(env).base).hostname;
  if (!payHost || (!payHost.endsWith(".line.me") && payHost !== baseHost)) {
    console.warn("linepay unexpected payment url host", { payHost });
    return json({ error: "LINE Pay request failed (unexpected redirect)" }, { status: 502 });
  }
  // 記下本次嘗試號供對帳；請款成功後會蓋成 LINE 的 transactionId。
  await env.DB.prepare("UPDATE orders SET linepay_txn=? WHERE id=?").bind(attempt, orderId).run();
  return json({ paymentUrl });
}

// LINE 導回：呼叫 Confirm 請款。成功→paid；失敗→單留著可重試。
// 重新整理導回頁不會重複請款——已付款的單直接回成功訊息。
async function confirmPayment(env: Env, url: URL): Promise<Response> {
  const { channelId, secret } = cfg(env);
  const orderId = url.searchParams.get("order") ?? "";
  const txn = url.searchParams.get("transactionId") ?? "";
  const dest = new URL(url.origin);
  if (ORDER_RE.test(orderId)) dest.searchParams.set("order", orderId);
  const redirect = (outcome: "ok" | "fail") => {
    dest.searchParams.set("pay", outcome);
    return new Response(null, { status: 302, headers: { location: dest.toString() } });
  };
  if (!channelId || !secret || !ORDER_RE.test(orderId) || !/^\d{6,25}$/.test(txn)) return redirect("fail");
  const order = await getOrder(env, orderId);
  if (!order) return redirect("fail");
  if (order.status === "paid") return redirect("ok");
  if (order.status !== "pending") return redirect("fail");
  const { returnCode, text } = await callApi(env, `/v3/payments/${txn}/confirm`, { amount: order.total, currency: "TWD" });
  if (returnCode !== "0000") {
    // 請款失敗要留下伺服器日誌：一筆「已授權但請款失敗」的交易若無
    // 紀錄，事後對帳無從查起。
    console.warn("linepay confirm failed", { orderId, txn, returnCode: returnCode || "no response", detail: text.slice(0, 200) });
    return redirect("fail");
  }
  await markPaid(env, orderId, "linepay_txn", txn);
  return redirect("ok");
}

export async function handleLinepay(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/pay/linepay" && request.method === "POST") return createPayment(request, env, url);
  if (url.pathname === "/api/linepay/confirm" && request.method === "GET") return confirmPayment(env, url);
  return null;
}
