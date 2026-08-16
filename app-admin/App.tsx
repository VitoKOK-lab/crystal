import { useEffect, useState } from "react";

// 後台管理：登入閘門 + 六個分頁的骨架。每個分頁的實作在各自的檔案裡
// （stones/accessories/products/series/orders/settings），共用的型別與
// fetch 工具在 shared.tsx。

import { Accessories } from "./accessories";
import { Orders } from "./orders";
import { Products } from "./products";
import { SeriesTab } from "./series";
import { Settings } from "./settings";
import { api, type Catalog } from "./shared";
import { Stones } from "./stones";

export default function App() {
  const [me, setMe] = useState<{ authed: boolean; email?: string; oauthReady?: boolean } | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<"stones" | "accessories" | "products" | "series" | "orders" | "settings">("stones");
  const [toast, setToast] = useState("");

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2600); };
  const reload = () => api("/api/admin/catalog").then(setCatalog).catch((e) => notify(`載入失敗：${e.message}`));

  useEffect(() => {
    fetch("/api/admin/me").then(async (r) => {
      const d = await r.json();
      setMe(d);
      if (d.authed) reload();
    }).catch(() => setMe({ authed: false }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- boot once

  if (!me) return <div className="gate"><p>載入中…</p></div>;
  if (!me.authed) {
    return <div className="gate">
      <h1>OMA CRYSTAL 後台</h1>
      {me.oauthReady
        ? <a className="google-btn" href="/api/auth/google/start">使用 Google 帳號登入</a>
        : <p className="dim">Google 登入尚未設定完成（缺 GOOGLE_CLIENT_ID / SECRET）。</p>}
    </div>;
  }

  return <div className="admin">
    <header>
      <b>OMA CRYSTAL 後台</b>
      <nav>
        <button className={tab === "stones" ? "on" : ""} onClick={() => setTab("stones")}>礦石</button>
        <button className={tab === "accessories" ? "on" : ""} onClick={() => setTab("accessories")}>配件</button>
        <button className={tab === "products" ? "on" : ""} onClick={() => setTab("products")}>成品</button>
        <button className={tab === "series" ? "on" : ""} onClick={() => setTab("series")}>系列</button>
        <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>訂單</button>
        <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>設定</button>
      </nav>
      <span className="dim">{me.email}</span>
      <a href="/api/auth/logout">登出</a>
    </header>
    {!catalog ? <p className="pad">載入中…</p> : <>
      {tab === "stones" && <Stones catalog={catalog} reload={reload} notify={notify} />}
      {tab === "accessories" && <Accessories catalog={catalog} reload={reload} notify={notify} />}
      {tab === "products" && <Products catalog={catalog} reload={reload} notify={notify} />}
      {tab === "series" && <SeriesTab catalog={catalog} reload={reload} notify={notify} />}
      {tab === "orders" && <Orders notify={notify} />}
      {tab === "settings" && <Settings catalog={catalog} reload={reload} notify={notify} />}
    </>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
