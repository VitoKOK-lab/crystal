"use client";

import { useState } from "react";

export default function DesignGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Begin With One",
      subtitle: "從一顆開始",
      description: "不用先想好整條的樣子。挑一顆你此刻想要的，其餘的會慢慢長出來。"
    },
    {
      title: "Choose Your Stones",
      subtitle: "選你想要的礦石",
      description: "21 款天然礦石、37 款隔珠與吊飾。每一種的稀有度與能量強度都不一樣，喜歡的就先放上去。"
    },
    {
      title: "Move Them Around",
      subtitle: "換到對的位置",
      description: "按住珠子拖曳就能換位置。哪一顆貼著手腕內側，只有你會知道——那是給自己留的。"
    },
    {
      title: "See What You're Wearing",
      subtitle: "看見你戴的是什麼",
      description: "六個維度即時運算：財富、愛情、療癒、守護、專注、力量。你在意什麼，戴上之前就看得出來。"
    },
    {
      title: "Keep It, Or Share It",
      subtitle: "留著，或送出去",
      description: "配好之後可以直接下單，也可以把設計連結分享出去——讓在意你的人知道你正在往哪裡走。"
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
