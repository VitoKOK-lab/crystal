"use client";

// Lightweight Web Audio SFX for tactile UI feedback. Everything is
// synthesised on demand — no audio files to fetch, and the context is
// always created inside a real user gesture so autoplay policies never
// block it.
let actx: AudioContext | null = null;
const ensure = () => {
  if (actx) { if (actx.state === "suspended") actx.resume(); return actx; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  actx = new AC();
  const unlock = actx.createBufferSource();
  unlock.buffer = actx.createBuffer(1, 1, actx.sampleRate);
  unlock.connect(actx.destination);
  unlock.start(0);
  return actx;
};

// Metallic clasp click for adding/removing a material — a tight noise
// transient through a narrow high bandpass, layered with a short square
// "body" tick for thickness. Pitched slightly lower on removal so the two
// actions read as distinct without needing separate assets.
export function playClaspClick(added: boolean) {
  const ctx = ensure();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.045;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = added ? 3400 : 2200;
  bp.Q.value = 8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination);
  src.start(t); src.stop(t + dur);

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(added ? 1400 : 900, t);
  osc.frequency.exponentialRampToValueAtTime(added ? 700 : 500, t + 0.03);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.09, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
  osc.connect(og); og.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.04);
}

// Heavy sub-bass confirm thump for a completed order, with a bright
// metallic ring layered on top to echo the "forging complete" moment.
export function playConfirmBoom() {
  const ctx = ensure();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.38);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.6);

  const bell = ctx.createOscillator();
  bell.type = "triangle";
  bell.frequency.setValueAtTime(1200, t);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, t + 0.02);
  bg.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  bg.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
  bell.connect(bg); bg.connect(ctx.destination);
  bell.start(t + 0.02); bell.stop(t + 0.55);
}
