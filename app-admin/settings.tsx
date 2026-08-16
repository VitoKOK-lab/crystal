import { useState } from "react";
import { putJson, type TabProps } from "./shared";

export function Settings({ catalog, reload, notify }: TabProps) {
  const [form, setForm] = useState({
    base_fee: catalog.settings.base_fee ?? "680",
    shipping_fee: catalog.settings.shipping_fee ?? "120",
    free_shipping_over: catalog.settings.free_shipping_over ?? "3000",
  });
  const save = async () => {
    try {
      await putJson("/api/admin/settings", form);
      notify("已儲存，前台一分鐘內生效");
      reload();
    } catch (e) { notify(`儲存失敗：${(e as Error).message}`); }
  };
  return <div className="editor pad">
    <div className="grid">
      <label>基本工費 NT$<input type="number" min={0} value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: e.target.value })} /></label>
      <label>運費 NT$<input type="number" min={0} value={form.shipping_fee} onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })} /></label>
      <label>免運門檻 NT$<input type="number" min={0} value={form.free_shipping_over} onChange={(e) => setForm({ ...form, free_shipping_over: e.target.value })} /></label>
    </div>
    <p className="dim">這三個數字直接決定前台顯示與結帳金額：工作室總價、運費與免運判斷，約一分鐘內生效。</p>
    <div className="actions"><button className="primary" onClick={save}>儲存</button></div>
  </div>;
}
