"use client";

import { useState } from "react";
import { playConfirmBoom } from "./ui-sound";

export type OrderLine = { key: string; visual: React.ReactNode; name: string; sub: string; qty: number; unit: number };
type EnergyInfo = { en: string; color: string };

// Wrist sizes offered at checkout: 13–22 cm in half-centimetre steps.
const WRIST_SIZES = Array.from({ length: 19 }, (_, i) => (13 + i * 0.5).toFixed(1).replace(/\.0$/, ""));
const PAYMENTS = [
  { id: "card", name: "Card", note: "Visa · Mastercard · JCB" },
  { id: "linepay", name: "LINE Pay", note: "Mobile checkout" },
  { id: "cod", name: "Cash on delivery", note: "Pay when it arrives" },
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
    if (!form.name.trim()) errs.name = "Please enter a name";
    if (!/^09\d{8}$/.test(form.phone.trim())) errs.phone = "Enter a valid mobile number (10 digits, starting 09)";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "That email doesn’t look right";
    if (!form.address.trim()) errs.address = "Please enter a delivery address";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setOrderId(`OMA-${Date.now().toString(36).toUpperCase()}`);
    setStep("done");
    playConfirmBoom();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const orderText = () => [
    `OMA CRYSTAL order ${orderId}`,
    `Dominant: ${dominant.en} (total ${totalEnergy.toLocaleString()})`,
    ...lines.map((l) => `- ${l.name} ${l.sub} | ${l.qty} x NT$${l.unit}`),
    `Making fee NT$${baseFee}`,
    shipping ? `Shipping NT$${shipping}` : "Free shipping",
    `Total NT$${grand.toLocaleString()}`,
    `Recipient: ${form.name} / ${form.phone}`,
    `Wrist: ${form.wrist} cm`,
    `Address: ${form.address}`,
  ].join("\n");

  if (step === "done") return <section className="checkout done-view">
    <div className="done-card">
      <div className="forge-flash" />
      <div className="done-mark">✓</div>
      <p className="done-eyebrow">Ritual complete</p>
      <h1>Your piece has begun</h1>
      <div className="done-order-id">{orderId}</div>
      <p className="done-note">Thank you for trusting us with this one. A jewellery adviser will confirm your wrist size, payment and delivery within one working day. Until then, nothing is fixed.</p>
      <div className="done-summary">
        {lines.map((l) => <div className="done-line" key={l.key}><span className="dl-visual">{l.visual}</span><span className="dl-name">{l.name}<i>{l.sub}</i></span><span className="dl-qty">× {l.qty}</span><b>NT$ {(l.unit * l.qty).toLocaleString()}</b></div>)}
        <div className="done-line fee"><span /><span className="dl-name">Making fee</span><span /><b>NT$ {baseFee.toLocaleString()}</b></div>
        <div className="done-line fee"><span /><span className="dl-name">Shipping</span><span /><b>{shipping ? `NT$ ${shipping}` : "Free"}</b></div>
        <div className="done-line total"><span /><span className="dl-name">Total</span><span /><b>NT$ {grand.toLocaleString()}</b></div>
      </div>
      <div className="done-energy">Dominant energy <b style={{ color: dominant.color }}>{dominant.en}</b> · total <em>{totalEnergy.toLocaleString()}</em></div>
      <div className="done-actions">
        <button className="co-secondary" onClick={() => navigator.clipboard?.writeText(orderText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? "Copied ✓" : "Copy order details"}</button>
        <button className="co-primary" onClick={onBack}>Back to the atelier</button>
      </div>
    </div>
  </section>;

  return <section className="checkout">
    <button className="co-back" onClick={onBack}>← Keep adjusting</button>
    <div className="co-grid">
      <aside className="co-summary">
        <p className="co-eyebrow">ORDER SUMMARY</p>
        <h2>Your piece</h2>
        <div className="co-energy-chip">Dominant <b style={{ color: dominant.color }}>{dominant.en}</b><em>TOTAL ENERGY {totalEnergy.toLocaleString()}</em></div>
        <div className="co-lines">
          {lines.map((l) => <div className="co-line" key={l.key}>
            <span className="co-visual">{l.visual}</span>
            <span className="co-name">{l.name}<i>{l.sub}</i></span>
            <span className="co-qty">× {l.qty}</span>
            <b>NT$ {(l.unit * l.qty).toLocaleString()}</b>
          </div>)}
        </div>
        <div className="co-fees">
          <div><span>Materials</span><b>NT$ {itemsTotal.toLocaleString()}</b></div>
          <div><span>Making fee</span><b>NT$ {baseFee.toLocaleString()}</b></div>
          <div><span>Shipping{shipping === 0 ? " (free over NT$3,000)" : ""}</span><b>{shipping ? `NT$ ${shipping}` : "Free"}</b></div>
          <div className="co-grand"><span>Total</span><b>NT$ {grand.toLocaleString()}</b></div>
        </div>
      </aside>
      <div className="co-form">
        <p className="co-eyebrow">02 — Checkout</p>
        <h2>Delivery</h2>
        <div className="co-fields">
          <label className={errors.name ? "err" : ""}><span>Name *</span><input value={form.name} onChange={set("name")} placeholder="Full name" autoComplete="name" />{errors.name && <em>{errors.name}</em>}</label>
          <label className={errors.phone ? "err" : ""}><span>Mobile *</span><input value={form.phone} onChange={set("phone")} placeholder="0912345678" inputMode="numeric" autoComplete="tel" />{errors.phone && <em>{errors.phone}</em>}</label>
          <label className={errors.email ? "err" : ""}><span>Email (optional)</span><input value={form.email} onChange={set("email")} placeholder="you@example.com" inputMode="email" autoComplete="email" />{errors.email && <em>{errors.email}</em>}</label>
          <label><span>Wrist size</span><select value={form.wrist} onChange={set("wrist")}>{WRIST_SIZES.map((w) => <option key={w} value={w}>{w} cm</option>)}<option value="unsure">Not sure — please advise</option></select></label>
          <label className={`co-wide ${errors.address ? "err" : ""}`}><span>Delivery address *</span><input value={form.address} onChange={set("address")} placeholder="Street, district, city, postcode" autoComplete="street-address" />{errors.address && <em>{errors.address}</em>}</label>
          <label className="co-wide"><span>Notes (optional)</span><textarea value={form.note} onChange={set("note")} rows={2} placeholder="Gift wrapping, preferred delivery window…" /></label>
        </div>
        <h2 className="co-pay-title">Payment</h2>
        <div className="co-payments">
          {PAYMENTS.map((p) => <button key={p.id} type="button" className={`co-pay ${payment === p.id ? "active" : ""}`} onClick={() => setPayment(p.id)}>
            <b>{p.name}</b><i>{p.note}</i>
          </button>)}
        </div>
        <button className="co-primary co-submit" onClick={submit}>Place order · NT$ {grand.toLocaleString()} <span>→</span></button>
        <p className="co-tip">An adviser confirms the details before anything is charged. Take your time.</p>
      </div>
    </div>
  </section>;
}
