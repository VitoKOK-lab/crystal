"use client";

import { useState } from "react";

export default function DesignGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "BEGIN WITH ONE",
      subtitle: "從一顆開始",
      description: "不必先想好整條的樣子。挑一顆此刻想要的，其餘的會慢慢長出來。"
    },
    {
      title: "CHOOSE THE STONES",
      subtitle: "二十一種天然礦石",
      description: "另有三十七款隔珠與吊飾。每一種的稀有度與能量強度都不同，被吸引的就先放上去。"
    },
    {
      title: "SET THE ORDER",
      subtitle: "排到對的位置",
      description: "按住珠子拖曳，就能換到手鍊上任何位置。哪一顆貼著腕內側，只有你知道。"
    },
    {
      title: "SEE WHAT YOU WEAR",
      subtitle: "六個維度，即時運算",
      description: "財富、愛情、療癒、守護、專注、力量。你在意什麼，戴上之前就已經看見。"
    },
    {
      title: "KEEP IT, OR SHARE IT",
      subtitle: "留著，或送出去",
      description: "配好之後可以直接下單，也可以把設計連結分享出去——讓在意你的人，知道你正往哪裡走。"
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
