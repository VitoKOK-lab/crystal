"use client";

import { useEffect, useState } from "react";
import { pricing } from "./catalog";

// 頂端公告列：轉換鉤子輪播（免運門檻讀自後台設定，永遠是現值）。
// 單一資料源、不寫死數字——競品把 $39/$59 寫得全站互相矛盾，引以為戒。
export default function AnnounceBar({ onQuiz }: { onQuiz?: () => void }) {
  const items = [
    { text: `滿 NT$${pricing.freeShippingOver.toLocaleString()} 免運費`, onClick: undefined as (() => void) | undefined },
    { text: "深度配對上線 — 生日×MBTI×七脈輪，配出你的七輪平衡手鍊", onClick: onQuiz },
    { text: "說個願望，顧問替你選五顆石頭", onClick: onQuiz },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [items.length]);
  const cur = items[i];
  return <div className="announce-bar" role="status">
    {cur.onClick
      ? <button key={i} onClick={cur.onClick}>{cur.text} →</button>
      : <span key={i}>{cur.text}</span>}
  </div>;
}
