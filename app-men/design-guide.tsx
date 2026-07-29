"use client";

import { useState } from "react";

export default function DesignGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "How to Design",
      subtitle: "打造專屬 Crystal Story",
      description: "透過簡單的拖拽和點擊，創造屬於你的獨特礦石手鍊"
    },
    {
      title: "Choose Material",
      subtitle: "選擇你的素材",
      description: "瀏覽21種天然礦石和20多種精緻配件，每一種都有獨特的稀有度與屬性強度"
    },
    {
      title: "Rearrange Order",
      subtitle: "調整排列順序",
      description: "在手鍊上拖拽珠子即可改變位置和順序，找到最完美的組合"
    },
    {
      title: "View Power",
      subtitle: "查看戰力矩陣",
      description: "實時看到你的手鍊設計如何通過不同的屬性維度（財富、意志、決斷等）發揮作用"
    },
    {
      title: "Save & Share",
      subtitle: "保存並分享",
      description: "完成設計後，保存你的創作並與朋友分享這份獨特的戰力禮物"
    }
  ];

  if (!isOpen) return null;

  const current = steps[step];

  return (
    <div className="guide-overlay" onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>
        <button className="guide-close" onClick={onClose}>✕</button>

        <div className="guide-content">
          <span className="guide-index">{String(step + 1).padStart(2, "0")}</span>
          <h1>{current.title}</h1>
          <h2>{current.subtitle}</h2>
          <p>{current.description}</p>
        </div>

        <div className="guide-progress">
          <div className="progress-dots">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === step ? "active" : ""}`}
                onClick={e => { e.stopPropagation(); setStep(i); }}
              />
            ))}
          </div>
          <span className="progress-text">{step + 1} / {steps.length}</span>
        </div>

        <div className="guide-actions">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
              ← Previous
            </button>
          )}
          {step < steps.length - 1 && (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>
              Next →
            </button>
          )}
          {step === steps.length - 1 && (
            <button className="btn-primary" onClick={onClose}>
              Let's Create
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
