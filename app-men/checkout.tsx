"use client";

import { useState } from "react";

export type OrderLine = { key: string; visual: React.ReactNode; name: string; sub: string; qty: number; unit: number };
type EnergyInfo = { zh: string; en: string; color: string };

// Wrist sizes offered at checkout: 13–22 cm in half-centimetre steps.
const WRIST_SIZES = Array.from({ length: 19 }, (_, i) => (13 + i * 0.5).toFixed(1).replace(/\.0$/, ""));
const PAYMENTS = [
  { id: "card", name: "信用卡", note: "VISA / Master / JCB" },
  { id: "linepay", name: "LINE Pay", note: "行動支付快速結帳" },
  { id: "cod", name: "貨到付款", note: "宅配到府，取貨付款" },
] as const;

export default function Checkout({ lines, baseFee, dominant, totalEnergy, initialWrist, onBack }: {
  lines: OrderLine[];
  baseFee: number;
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

  const itemsTotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const shipping = itemsTotal + baseFee >= 3000 ? 0 : 120;
  const grand = itemsTotal + baseFee + shipping;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const v = e.target.value; setForm((f) => ({ ...f, [k]: v })); setErrors((er) => { if (!(k in er)) return er; const next = { ...er }; delete next[k]; return next; }); };

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "請填寫收件人姓名";
    if (!/^09\d{8}$/.test(form.phone.trim())) errs.phone = "請填寫正確的手機號碼（09 開頭共 10 碼）";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Email 格式不正確";
    if (!form.address.trim()) errs.address = "請填寫收件地址";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setOrderId(`OMA-${Date.now().toString(36).toUpperCase()}`);
    setStep("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const orderText = () => [
    `OMA CRYSTAL 訂單 ${orderId}`,
    `主能量：${dominant.zh} ${dominant.en}（總能量 ${totalEnergy.toLocaleString()}）`,
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
      <div className="done-mark">✓</div>
      <p className="done-eyebrow">ORDER RECEIVED</p>
      <h1>訂單已成立！</h1>
      <div className="done-order-id">{orderId}</div>
      <p className="done-note">感謝你的訂購。珠寶顧問將在 1 個工作天內透過電話或 Email 與你確認手圍、付款與出貨細節。</p>
      <div className="done-summary">
        {lines.map((l) => <div className="done-line" key={l.key}><span className="dl-visual">{l.visual}</span><span className="dl-name">{l.name}<i>{l.sub}</i></span><span className="dl-qty">× {l.qty}</span><b>NT$ {(l.unit * l.qty).toLocaleString()}</b></div>)}
        <div className="done-line fee"><span /><span className="dl-name">設計串製費</span><span /><b>NT$ {baseFee.toLocaleString()}</b></div>
        <div className="done-line fee"><span /><span className="dl-name">運費</span><span /><b>{shipping ? `NT$ ${shipping}` : "免運"}</b></div>
        <div className="done-line total"><span /><span className="dl-name">合計</span><span /><b>NT$ {grand.toLocaleString()}</b></div>
      </div>
      <div className="done-energy">此手鍊的主能量 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b>・總能量 <em>{totalEnergy.toLocaleString()}</em></div>
      <div className="done-actions">
        <button className="co-secondary" onClick={() => navigator.clipboard?.writeText(orderText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "已複製 ✓" : "複製訂單明細"}</button>
        <button className="co-primary" onClick={onBack}>回到設計工作室</button>
      </div>
    </div>
  </section>;

  return <section className="checkout">
    <button className="co-back" onClick={onBack}>← 返回設計</button>
    <div className="co-grid">
      <aside className="co-summary">
        <p className="co-eyebrow">ORDER SUMMARY</p>
        <h2>你的專屬手鍊</h2>
        <div className="co-energy-chip">主能量 <b style={{ color: dominant.color }}>{dominant.zh} {dominant.en}</b><em>TOTAL ENERGY {totalEnergy.toLocaleString()}</em></div>
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
          <label><span>手圍尺寸</span><select value={form.wrist} onChange={set("wrist")}>{WRIST_SIZES.map((w) => <option key={w} value={w}>{w} cm</option>)}<option value="unsure">不確定，請顧問協助</option></select></label>
          <label className={`co-wide ${errors.address ? "err" : ""}`}><span>收件地址 *</span><input value={form.address} onChange={set("address")} placeholder="縣市、區、路街巷弄門牌樓層" autoComplete="street-address" />{errors.address && <em>{errors.address}</em>}</label>
          <label className="co-wide"><span>備註（選填）</span><textarea value={form.note} onChange={set("note")} rows={2} placeholder="包裝需求、指定到貨時段…" /></label>
        </div>
        <h2 className="co-pay-title">付款方式</h2>
        <div className="co-payments">
          {PAYMENTS.map((p) => <button key={p.id} type="button" className={`co-pay ${payment === p.id ? "active" : ""}`} onClick={() => setPayment(p.id)}>
            <b>{p.name}</b><i>{p.note}</i>
          </button>)}
        </div>
        <button className="co-primary co-submit" onClick={submit}>確認下單 · NT$ {grand.toLocaleString()} <span>→</span></button>
        <p className="co-tip">送出後由珠寶顧問與你確認細節，確認前不會請款。</p>
      </div>
    </div>
  </section>;
}
