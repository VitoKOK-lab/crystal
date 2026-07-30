"use client";

import { useState } from "react";

export default function DesignGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Begin With One",
      subtitle: "One stone at a time",
      description: "You don't need the whole piece in mind. Choose the one you want right now; the rest will follow."
    },
    {
      title: "Choose The Stones",
      subtitle: "Twenty-one naturals",
      description: "Plus thirty-seven spacers and charms. Each carries its own rarity and its own strength — add whichever you are drawn to."
    },
    {
      title: "Set The Order",
      subtitle: "Until it reads right",
      description: "Hold a stone and drag it anywhere on the strand. Which one sits against the inside of your wrist is yours alone to know."
    },
    {
      title: "See What You Wear",
      subtitle: "Six dimensions, live",
      description: "Six dimensions, computed live: wealth, love, healing, protection, focus, power. What you care about is legible before you put it on."
    },
    {
      title: "Keep It, Or Share It",
      subtitle: "However you like",
      description: "Order it as it stands, or share the link — so the people who care about you can see where you are headed."
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
