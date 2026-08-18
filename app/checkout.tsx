"use client";

import { useMemo, useState } from "react";
import { WRIST_CHOICES, pricing } from "./catalog";
import { playConfirmBoom } from "./ui-sound";

// kind/id/mm ride along invisibly: they're what the order API needs to find
// the exact stock rows (stone_sizes is keyed by stone_id+mm) to deduct.
export type OrderLine = { key: string; visual: React.ReactNode; name: string; sub: string; qty: number; unit: number; kind: "stone" | "accessory"; id: string; mm?: number };
type EnergyInfo = { zh: string; en: string; color: string };

// Same wrist sizes the studio offers, formatted as the plain "16" / "16.5"
// strings this form's <select> uses.
const WRIST_SIZES = WRIST_CHOICES.map((cm) => cm.toFixed(1).replace(/\.0$/, ""));
const PAYMENTS = [
  { id: "card", name: "信用卡", note: "VISA / Master / JCB" },
  { id: "linepay", name: "LINE Pay", note: "行動支付快速結帳" },
  { id: "cod", name: "貨到付款", note: "宅配到府，取貨付款" },
] as const;

export default function Checkout({ lines, spec, dominant, totalEnergy, initialWrist, onBack }: {
  lines: OrderLine[];
  /** Compact design notation (encodeDesign) — the order's authoritative composition. */
  spec: string;
  dominant: EnergyInfo;
  totalEnergy: number;
  initialWrist?: number;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"form" | "done">("form");
  const [orderId, setOrderId] = useState("");
  const [payment, setPayment] = useState<string>("card");
  const [form, setForm] = useState({ name: "", phone: "", email: "", wrist: initialWrist ? String(initialWrist % 1 ? initialWrist.toFixed(1) : initialWrist) : "16", address: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const baseFee = pricing.baseFee;
  // 這裡的金額只是「預覽」——伺服器下單時會用資料庫價格重算並比對，
  // 不一致會回 409（見下方 price changed 分支）。
  const { itemsTotal, shipping, grand } = useMemo(() => {
    const sum = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const ship = sum + baseFee >= pricing.freeShippingOver ? 0 : pricing.shippingFee;
    return { itemsTotal: sum, shipping: ship, grand: sum + baseFee + ship };
  }, [lines, baseFee]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const v = e.target.value; setForm((f) => ({ ...f, [k]: v })); setErrors((er) => { if (!(k in er)) return er; const next = { ...er }; delete next[k]; return next; }); };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "請填寫收件人姓名";
    if (!/^09\d{8}$/.test(form.phone.trim())) errs.phone = "請填寫正確的手機號碼（09 開頭共 10 碼）";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Email 格式不正確";
    if (!form.address.trim()) errs.address = "請填寫收件地址";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
          address: form.address.trim(), note: form.note.trim(), wrist: form.wrist,
          payment, spec,
          lines: lines.map((l) => ({ kind: l.kind, id: l.id, mm: l.mm, qty: l.qty, unit: l.unit, name: l.name, sub: l.sub })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string; shortages?: string[] } | null;
      if (res.status === 409 && data?.shortages?.length) {
        setSubmitError(`這些素材剛好賣完了：${data.shortages.join("、")}。回上一步把它們換掉，就能完成下單`);
        return;
      }
      if (res.status === 409 && data?.error === "price changed") {
        setSubmitError("價格剛剛更新過，畫面上的金額已經不是現價。請重新整理頁面再下單一次");
        return;
      }
      if (!res.ok || !data?.id) throw new Error(data?.error ?? `order failed (${res.status})`);
      setOrderId(data.id);
      setStep("done");
      playConfirmBoom();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("訂單沒有送出去（網路或伺服器問題）。稍等一下再按一次，你填的資料都還在");
    } finally {
      setSubmitting(false);
    }
  };

  // LINE Pay：後端向 LINE 要一次性的付款頁網址，整頁跳轉過去；付完
  // LINE 會把瀏覽器帶回站上（後端請款成功才算付款完成）。
  const payWithLinepay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/pay/linepay", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: orderId }),
      });
      const data = (await res.json().catch(() => null)) as { paymentUrl?: string; error?: string } | null;
      if (res.status === 503) { setPayError("LINE Pay 尚未開通，先用其他方式付款，或稍後再試"); setPaying(false); return; }
      if (!res.ok || !data?.paymentUrl) throw new Error(data?.error ?? `pay failed (${res.status})`);
      window.location.href = data.paymentUrl;
    } catch {
      setPayError("前往 LINE Pay 失敗，稍等一下再按一次；訂單已成立，不會不見");
      setPaying(false);
    }
  };

  // 綠界付款：跟後端要簽好章的表單欄位，組一個隱藏 form POST 到綠界
  // 收銀台（金流頁必須用表單導轉，不能用 fetch）。
  const payWithEcpay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/pay/ecpay", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: orderId }),
      });
      const data = (await res.json().catch(() => null)) as { action?: string; fields?: Record<string, string>; error?: string } | null;
      if (!res.ok || !data?.action || !data.fields) throw new Error(data?.error ?? `pay failed (${res.status})`);
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.action;
      for (const [k, v] of Object.entries(data.fields)) {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = k; input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch {
      setPayError("前往付款頁失敗，稍等一下再按一次；訂單已成立，不會不見");
      setPaying(false);
    }
  };

  const orderText = () => [
    `OMA CRYSTAL 訂單 ${orderId}`,
    `主屬性：${dominant.zh} ${dominant.en}（總能量 ${totalEnergy.toLocaleString()}）`,
    ...lines.map((l) => `・${l.name} ${l.sub}｜${l.qty} 顆 × NT$${l.unit}`),
    `設計串製費 NT$${baseFee}`,
    shipping ? `運費 NT$${shipping}` : "免運費",
    `合計 NT$${grand.toLocaleString()}`,
    `收件人：${form.name}／${form.phone}`,
    `手圍：${form.wrist} cm`,
    `地址：${form.address}`,
  ].join("\n");

  if (step === "done") return <section className="checkout done-view">
    <div className="done-card">
      <div className="forge-flash" />
      <div className="done-mark">✓</div>
      <p className="done-eyebrow">RITUAL COMPLETE · 圓滿</p>
      <h1>你的手鍊，開始成形了</h1>
      <div className="done-order-id">{orderId}</div>
      <p className="done-note">謝謝你把這條交給我們。珠寶顧問會在一個工作天內與你確認手圍、付款與出貨細節——在那之前，一切都還可以更動。確認後 1–2 天為你排單揀珠、3–5 天親手串製完成出貨。</p>
      <div className="done-summary">
        {lines.map((l) => <div className="done-line" key={l.key}><span className="dl-visual">{l.visual}</span><span className="dl-name">{l.name}<i>{l.sub}</i></span><span className="dl-qty">× {l.qty}</span><b>NT$ {(l.unit * l.qty).toLocaleString()}</b></div>)}
        <div className="done-line fee"><span /><span className="dl-name">設計串製費</span><span /><b>NT$ {baseFee.toLocaleString()}</b></div>
        <div className="done-line fee"><span /><span className="dl-name">運費</span><span /><b>{shipping ? `NT$ ${shipping}` : "免運"}</b></div>
        <div className="done-line total"><span /><span className="dl-name">合計</span><span /><b>NT$ {grand.toLocaleString()}</b></div>
      </div>
      <div className="done-energy">此手鍊的主屬性 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b>・總能量 <em>{totalEnergy.toLocaleString()}</em></div>
      <div className="done-actions">
        <button className="co-secondary" onClick={() => navigator.clipboard?.writeText(orderText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "已複製 ✓" : "複製訂單明細"}</button>
        {payment === "card" && <button className="co-primary" disabled={paying} onClick={payWithEcpay}>{paying ? "正在前往綠界…" : "前往綠界線上付款 →"}</button>}
        {payment === "linepay" && <button className="co-primary co-linepay" disabled={paying} onClick={payWithLinepay}>{paying ? "正在前往 LINE Pay…" : "使用 LINE Pay 付款 →"}</button>}
        <button className={payment === "card" || payment === "linepay" ? "co-secondary" : "co-primary"} onClick={onBack}>回到工作室</button>
      </div>
      {payError && <p className="co-error">{payError}</p>}
    </div>
  </section>;

  return <section className="checkout">
    <button className="co-back" onClick={onBack}>← 回去再調整</button>
    <div className="co-grid">
      <aside className="co-summary">
        <p className="co-eyebrow">ORDER SUMMARY</p>
        <h2>為你而生的這一條</h2>
        <div className="co-energy-chip">主屬性 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b><em>TOTAL ENERGY {totalEnergy.toLocaleString()}</em></div>
        <div className="co-lines">
          {lines.map((l) => <div className="co-line" key={l.key}>
            <span className="co-visual">{l.visual}</span>
            <span className="co-name">{l.name}<i>{l.sub}</i></span>
            <span className="co-qty">× {l.qty}</span>
            <b>NT$ {(l.unit * l.qty).toLocaleString()}</b>
          </div>)}
        </div>
        <div className="co-fees">
          <div><span>素材小計</span><b>NT$ {itemsTotal.toLocaleString()}</b></div>
          <div><span>設計串製費</span><b>NT$ {baseFee.toLocaleString()}</b></div>
          <div><span>運費{shipping === 0 ? "（滿 NT$3,000 免運）" : ""}</span><b>{shipping ? `NT$ ${shipping}` : "免運"}</b></div>
          <div className="co-grand"><span>合計</span><b>NT$ {grand.toLocaleString()}</b></div>
        </div>
      </aside>
      <div className="co-form">
        <p className="co-eyebrow">02 — CHECKOUT</p>
        <h2>收件資訊</h2>
        <div className="co-fields">
          <label className={errors.name ? "err" : ""}><span>收件人姓名 *</span><input value={form.name} onChange={set("name")} placeholder="王小明" autoComplete="name" />{errors.name && <em>{errors.name}</em>}</label>
          <label className={errors.phone ? "err" : ""}><span>手機號碼 *</span><input value={form.phone} onChange={set("phone")} placeholder="0912345678" inputMode="numeric" autoComplete="tel" />{errors.phone && <em>{errors.phone}</em>}</label>
          <label className={errors.email ? "err" : ""}><span>Email（選填）</span><input value={form.email} onChange={set("email")} placeholder="you@example.com" inputMode="email" autoComplete="email" />{errors.email && <em>{errors.email}</em>}</label>
          <label><span>手圍尺寸</span><select value={form.wrist} onChange={set("wrist")}>{WRIST_SIZES.map((w) => <option key={w} value={w}>{w} cm{w === "14" ? " · 最多人選" : ""}</option>)}<option value="unsure">不確定，請顧問協助</option></select></label>
          <label className={`co-wide ${errors.address ? "err" : ""}`}><span>收件地址 *</span><input value={form.address} onChange={set("address")} placeholder="縣市、區、路街巷弄門牌樓層" autoComplete="street-address" />{errors.address && <em>{errors.address}</em>}</label>
          <label className="co-wide"><span>備註（選填）</span><textarea value={form.note} onChange={set("note")} rows={2} placeholder="包裝需求、指定到貨時段…" /></label>
        </div>
        <h2 className="co-pay-title">付款方式</h2>
        <div className="co-payments">
          {PAYMENTS.map((p) => <button key={p.id} type="button" className={`co-pay ${payment === p.id ? "active" : ""}`} onClick={() => setPayment(p.id)}>
            <b>{p.name}</b><i>{p.note}</i>
          </button>)}
        </div>
        <button className="co-primary co-submit" onClick={submit} disabled={submitting}>{submitting ? "送出中…" : <>確認下單 · NT$ {grand.toLocaleString()} <span>→</span></>}</button>
        {submitError && <p className="co-error">{submitError}</p>}
        <p className="co-tip">送出後由珠寶顧問與你確認細節，確認前不會請款。慢慢想，不急。</p>
        <div className="co-promise">
          <b>OMA 的製作承諾</b>
          <span>接單後 1–2 天排單與揀珠——每一顆都親手挑過紋理，這段時間是為你選石的儀式，不是等待。</span>
          <span>天然晶石的冰裂、棉絮與色差不是瑕疵，是這顆石頭獨一無二的簽名；珠徑公差 ±0.4mm。</span>
          <span>若收到時有運送損傷，48 小時內拍照聯繫我們，直接為你重製。</span>
        </div>
      </div>
    </div>
  </section>;
}
