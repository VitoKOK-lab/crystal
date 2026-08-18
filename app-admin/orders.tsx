import { useEffect, useState } from "react";
import { api, putJson, runSave, type OrderRow } from "./shared";

const STATUS_LABEL: Record<string, string> = {
  pending: "待付款", paid: "已付款", making: "製作中", shipped: "已出貨", done: "完成", cancelled: "已取消",
};

// The order row's items column is {spec, wrist, lines} JSON written by
// /api/orders. Render the lines as a readable packing list; if the JSON is
// ever from another era, fall back to showing it raw.
function OrderItems({ items }: { items: string }) {
  try {
    const parsed = JSON.parse(items) as { spec?: string; wrist?: string; lines?: { qty: number; unit: number; name: string; sub: string }[] };
    if (!parsed.lines?.length) throw new Error("no lines");
    return <>
      <ul className="order-lines">
        {parsed.lines.map((l, i) => <li key={i}>{l.name}{l.sub ? `（${l.sub}）` : ""} × {l.qty} · NT$ {(l.unit * l.qty).toLocaleString()}</li>)}
      </ul>
      {parsed.wrist && <p className="dim">手圍：{parsed.wrist} cm</p>}
      {parsed.spec && <p className="dim mono">串珠順序：{parsed.spec}</p>}
    </>;
  } catch {
    return <pre className="mono small">{items}</pre>;
  }
}

export function Orders({ notify }: { notify: (m: string) => void }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => api("/api/admin/orders").then((d) => setOrders(d.orders)).catch((e) => notify(`載入失敗：${e.message}`));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- load-once
  if (!orders) return <p className="pad">載入中…</p>;
  if (!orders.length) return <p className="pad dim">目前沒有訂單。客人在前台完成結帳後，就會出現在這裡。</p>;
  return <div className="list">
    {orders.map((o) => <div key={o.id} className="card">
      <button className="row" onClick={() => setOpen(open === o.id ? null : o.id)}>
        <div><b>{o.id}</b><small>{o.created_at} · {o.name}</small></div>
        <div className="meta">NT$ {o.total.toLocaleString()}<small>{STATUS_LABEL[o.status] ?? o.status}</small></div>
      </button>
      {open === o.id && <div className="editor">
        <p>{o.name}．{o.phone}{o.email ? `．${o.email}` : ""}</p>
        <p>{o.address}</p>
        {o.ref_code && <p className="dim">推薦碼：{o.ref_code}</p>}
        <OrderItems items={o.items} />
        <div className="actions">
          <label>狀態
            <select value={o.status} onChange={(e) => runSave(notify, load,
              () => putJson(`/api/admin/orders/${encodeURIComponent(o.id)}/status`, { status: e.target.value }),
              { ok: "狀態已更新", errPrefix: "更新失敗" })}>
              {Object.entries(STATUS_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>}
    </div>)}
  </div>;
}
