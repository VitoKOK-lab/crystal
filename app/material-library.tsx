"use client";

import { memo } from "react";

import { COLOR_GROUPS, ENERGY_META, ItemVisual, RARITY_LABEL, defaultStoneMM, inStock, itemPrice, rarityOf, sizesFor, topEnergiesOf, type Accessory, type ColorGroupKey, type DesignItem, type Stone } from "./catalog";
import { PRESETS } from "./presets";

type Tab = "crystal" | "spacer" | "charm";

// The right-hand drawer: preset row, crystal/spacer/charm tabs, search,
// material grid and the selected-item detail card. Reads only what it needs
// to render and add materials — the drag-to-reorder bracelet stage lives in
// Home itself, since it owns the pointer-capture refs this panel never touches.
function MaterialLibrary({
  drawerOpen, onToggleDrawer, tab, onSelectTab, query, onQuery, visible, selected, selectedInfo, add, applyPreset,
  colorFilter, onColorFilter, energyFilter, onEnergyFilter,
}: {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  tab: Tab;
  onSelectTab: (tab: Tab) => void;
  query: string;
  onQuery: (q: string) => void;
  visible: (Stone | Accessory)[];
  selected: DesignItem;
  selectedInfo: Stone | Accessory;
  add: (item: DesignItem) => void;
  applyPreset: (key: keyof typeof PRESETS) => void;
  colorFilter: ColorGroupKey | null;
  onColorFilter: (key: ColorGroupKey | null) => void;
  energyFilter: string | null;
  onEnergyFilter: (key: string | null) => void;
}) {
  const activeEnergy = energyFilter ? ENERGY_META.find((m) => m.key === energyFilter) : null;
  return <aside className={`materials-panel ${drawerOpen ? "" : "collapsed"}`}>
    <button className="drawer-handle" onClick={onToggleDrawer} aria-expanded={drawerOpen} aria-label={drawerOpen ? "收起素材選擇區" : "展開素材選擇區"}><i /><span>{drawerOpen ? "收起選項" : "選擇礦石與配件"}</span></button>
    <div className="drawer-body">
    <div className="materials-head"><p>01 — CHOOSE MATERIAL</p><h1>為自己串一條<br /><em>Crystal Ritual</em></h1><span>點選素材加入手鍊。每一顆天然晶石的紋理都不相同，不會有第二條與你這條一樣。</span></div>
    <div className="preset-row" aria-label="一鍵搭配"><span>一鍵<br />搭配</span>{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => <button key={key} onClick={() => applyPreset(key)}>{PRESETS[key].name}</button>)}</div>
    <div className="tabs" aria-label="素材分類">{([["crystal","天然水晶"],["spacer","精緻隔珠"],["charm","專屬吊飾"]] as const).map(([id, name]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => onSelectTab(id)}>{name}</button>)}</div>
    <label className="search"><span>⌕</span><input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={tab === "crystal" ? "搜尋水晶名稱…" : "搜尋配件名稱…"} /></label>
    {/* 109 顆石頭直接列會滑到天荒地老 — 用顏色先切一刀。能量篩選由左側
        能量矩陣的「用能量挑石」設定，這裡只顯示狀態並提供解除。 */}
    {tab === "crystal" && <div className="color-chips" role="group" aria-label="依顏色篩選">
      <button className={colorFilter === null ? "on" : ""} onClick={() => onColorFilter(null)}>全部</button>
      {COLOR_GROUPS.map((g) => <button
        key={g.key}
        className={colorFilter === g.key ? "on" : ""}
        style={{ "--dot": g.dot } as React.CSSProperties}
        onClick={() => onColorFilter(colorFilter === g.key ? null : g.key)}
        aria-pressed={colorFilter === g.key}
      ><i />{g.zh}</button>)}
    </div>}
    <div className="library-label"><span>{tab === "crystal" ? "選擇水晶尺寸" : tab === "spacer" ? "選擇精緻隔珠" : "選擇專屬吊飾"}</span>
      {activeEnergy && tab === "crystal" && <button className="energy-filter-tag" style={{ "--chip": activeEnergy.color } as React.CSSProperties} onClick={() => onEnergyFilter(null)} aria-label={`取消${activeEnergy.zh}能量篩選`}>{activeEnergy.zh}能量 ✕</button>}
      <b>{visible.length} 款素材</b></div>
    <div className="material-grid" key={tab}>{visible.length ? visible.map((x: Stone | Accessory) => {
      const tier = rarityOf(x.price);
      if (tab === "crystal") {
        // Size buttons come from the stone's own ladder, so an admin adding
        // a 12mm (or retiring 8mm) changes what the studio offers. A size
        // with no stock stays visible but unbuyable — the customer sees the
        // option exists and is coming back.
        const ladder = sizesFor(x.id);
        const defaultMM = defaultStoneMM(x.id);
        const item: DesignItem = { kind: "stone", id: x.id, mm: defaultMM };
        return <article className={`material-card crystal-card rarity-${tier} ${selected.id === x.id ? "selected" : ""}`} key={x.id}><span className="rarity-tag">{RARITY_LABEL[tier]}</span><button className="card-main" onClick={() => add(item)} aria-label={`加入 ${x.zh} ${defaultMM}mm`}><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><span className="energy-chips">{topEnergiesOf(x as Stone).map((m) => <i key={m.key} style={{ "--chip": m.color } as React.CSSProperties}>{m.zh} {(x as Stone).energy[m.key]}</i>)}</span><em>NT$ {itemPrice(item)}</em></button>
          <div className="size-actions">{ladder.map((s) => {
            const sized: DesignItem = { kind: "stone", id: x.id, mm: s.mm };
            const out = !inStock(sized);
            return <button key={s.mm} disabled={out} className={out ? "out" : ""} onClick={() => add(sized)} aria-label={out ? `${s.mm}mm 補貨中` : `加入 ${s.mm}mm`} title={out ? "補貨中" : undefined}>{s.mm}mm{out && <i>補貨中</i>}</button>;
          })}</div></article>;
      }
      const item: DesignItem = { kind: "accessory", id: x.id };
      const out = !inStock(item);
      return <button className={`material-card rarity-${tier} ${selected.id === item.id ? "selected" : ""} ${out ? "out" : ""}`} key={x.id} disabled={out} onClick={() => add(item)}><span className="rarity-tag">{out ? "補貨中" : RARITY_LABEL[tier]}</span><div className="visual-wrap"><ItemVisual item={item} /><span>＋</span></div><b>{x.zh}</b><small>{x.en}</small><em>NT$ {x.price}</em><i>{(x as Accessory).type === "spacer" ? "精緻小隔珠" : "垂墜吊飾"}</i></button>;
    }) : <div className="empty-library"><b>這裡暫時沒有符合的素材</b><span>清除搜尋文字，或換一個分類看看。</span></div>}</div>
    <div className="selected-detail"><div className="detail-visual"><ItemVisual item={selected} /></div><div><p>{selected.kind === "stone" ? "NATURAL STONE" : "JEWELRY DETAIL"} · <span className={`sd-rarity rarity-${rarityOf(selectedInfo.price)}`}>{RARITY_LABEL[rarityOf(selectedInfo.price)]}</span></p><b>{selectedInfo.zh}</b><span>{selectedInfo.note}</span></div><button onClick={() => add(selected)}>加入 <strong>＋</strong></button></div>
    </div>
  </aside>;
}

// Memoised: the studio re-renders on every notice tick and search keystroke;
// this subtree only needs to follow its own props.
export default memo(MaterialLibrary);
