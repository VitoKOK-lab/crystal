// Shared plumbing for the admin tabs: the database row shapes as the admin
// API returns them, the fetch helper, and the photo-upload control used by
// both material editors.

export type StoneRow = { id: string; zh: string; en: string; energy_zh: string; price: number; note: string; energies: string; photo: string; active: number };
export type SizeRow = { stone_id: string; mm: number; price_delta: number; stock: number; active: number };
export type AccessoryRow = { id: string; zh: string; en: string; type: string; metal: string; price: number; note: string; photo: string; stock: number; active: number };
export type SeriesRow = { id: string; name: string; en: string; tone: string; active: number };
export type ProductRow = { id: string; series_id: string; name: string; tagline: string; style: string; wrist: number; spec: string; active: number };
export type OrderRow = { id: string; created_at: string; status: string; name: string; phone: string; email: string; address: string; items: string; total: number; ref_code: string };
export type Catalog = {
  stones: StoneRow[]; stoneSizes: SizeRow[]; accessories: AccessoryRow[];
  series: SeriesRow[]; products: ProductRow[]; settings: Record<string, string>;
};

// Every tab takes the same trio: the loaded catalog, a reload-after-save,
// and the toast.
export type TabProps = { catalog: Catalog; reload: () => void; notify: (m: string) => void };

export const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
};

export const putJson = (path: string, body: unknown) =>
  api(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function PhotoUpload({ kind, id, notify, reload }: { kind: "stone" | "accessory"; id: string; notify: (m: string) => void; reload: () => void }) {
  return <label className="upload">
    換照片
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        await api(`/api/admin/photo/${kind}/${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": f.type }, body: f });
        notify("照片已更新，前台一分鐘內生效");
        reload();
      } catch (err) { notify(`上傳失敗：${(err as Error).message}`); }
      e.target.value = "";
    }} />
  </label>;
}
