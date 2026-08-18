"use client";

import { useEffect, useState } from "react";
import { decodeDesign, type DesignItem } from "./catalog";
import { bySeries } from "./series";

export type StudioView = "home" | "shop" | "studio" | "checkout" | "quiz";

// The view lives in the URL (?v=shop|studio|checkout|quiz, plus ?series=),
// so the browser's back button steps between views instead of leaving the
// site, and a refresh comes back to the same place. pushState on
// programmatic navigation, popstate to follow the history. Initial load
// also owns the two special entries: a shared design link (?d=) and a
// payment return (?pay=ok|back|fail) — both are consumed and stripped from
// the URL so a refresh doesn't replay them.
export function useStudioRouter({ onLoadShared, onPayReturn }: {
  /** A valid ?d= share link decoded — load it into the studio. */
  onLoadShared: (items: DesignItem[], wrist: number) => void;
  /** A ?pay= return from a payment flow — surface the outcome. */
  onPayReturn: (pay: string, order: string | null) => void;
}) {
  const [view, setView] = useState<StudioView>("home");
  const [seriesId, setSeriesId] = useState<string | null>(null);

  const navigate = (v: StudioView, sid: string | null, opts: { push?: boolean; scroll?: boolean } = {}) => {
    setSeriesId(sid);
    setView(v);
    const params = new URLSearchParams(window.location.search);
    params.delete("v"); params.delete("series"); params.delete("d");
    if (v !== "home") params.set("v", v);
    if (sid && (v === "shop" || v === "studio")) params.set("series", sid);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (opts.push === false) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    if (opts.scroll !== false) window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const applyUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get("series");
      if (sid && bySeries[sid]) setSeriesId(sid);
      const v = params.get("v");
      if (v === "shop" || v === "studio" || v === "checkout" || v === "quiz") setView(v);
      else if (params.get("d")) setView("studio"); // a history entry from before a share link's design was navigated away
      else if (sid && bySeries[sid]) setView("shop"); // /men/ redirects here with ?series=forge
      else setView("home");
    };
    window.addEventListener("popstate", applyUrl);

    const params = new URLSearchParams(window.location.search);
    // 金流導回：顯示結果訊息後把參數從網址拿掉（重新整理不重播）。
    const pay = params.get("pay");
    if (pay) {
      onPayReturn(pay, params.get("order"));
      params.delete("pay"); params.delete("order");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
    // Initial load: a shared design link (?d=) wins and opens the studio.
    const code = params.get("d");
    const decoded = code ? decodeDesign(code) : null;
    if (decoded) {
      onLoadShared(decoded.items, decoded.wrist);
      const sid = params.get("series");
      if (sid && bySeries[sid]) setSeriesId(sid);
      setView("studio");
    } else {
      applyUrl();
    }
    return () => window.removeEventListener("popstate", applyUrl);
    // Both callbacks are stable useCallbacks from Home — this stays a
    // mount-only effect while satisfying exhaustive-deps.
  }, [onLoadShared, onPayReturn]);

  return { view, seriesId, navigate };
}
