// Renders the design into a premium 1080x1350 share-card PNG: brand header,
// the bracelet at true bead proportions, dominant energy, a mini energy
// radar, pricing, and the shareable design link.

export type SharePiece = { mm: number; src: string | null; metal: "gold" | "silver"; isCharm: boolean };
export type ShareEnergy = { zh: string; en: string; color: string; score: number };

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = () => resolve(null);
  im.src = src;
});

export async function generateShareCard(opts: {
  pieces: SharePiece[];
  capacityMM: number;
  energies: ShareEnergy[];
  dominant: ShareEnergy;
  totalEnergy: number;
  priceNTD: number;
  wristCm: number;
  beads: number;
  url: string;
}): Promise<Blob> {
  const { pieces, capacityMM, energies, dominant, totalEnergy, priceNTD, wristCm, beads, url } = opts;
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  const images = await Promise.all(pieces.map((p) => (p.src ? loadImage(p.src) : Promise.resolve(null))));

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.62, "#fbfdfc");
  bg.addColorStop(1, "#edf4f2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // brand header
  ctx.textAlign = "center";
  ctx.fillStyle = "#172929";
  ctx.font = "500 60px Georgia, serif";
  ctx.fillText("O M A", W / 2, 108);
  ctx.fillStyle = "#159d9b";
  ctx.font = "600 24px Arial, sans-serif";
  ctx.fillText("C R Y S T A L", W / 2, 148);
  ctx.fillStyle = "#8a9c99";
  ctx.font = "500 17px Arial, sans-serif";
  ctx.fillText("M A K E   Y O U R   O W N   E N E R G Y   J E W E L R Y", W / 2, 186);

  // bracelet ring at true proportions
  const cx = W / 2, cy = 600;
  const s = 6.2;
  const R = (capacityMM / (Math.PI * 2)) * s;
  ctx.strokeStyle = "rgba(178,168,152,0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  let cum = 0;
  pieces.forEach((p, i) => {
    const center = cum + p.mm / 2;
    cum += p.mm;
    const a = (center / capacityMM) * Math.PI * 2 - Math.PI / 2;
    const img = images[i];
    ctx.save();
    if (p.isCharm) {
      const orbit = R + 14 * s * 0.55;
      ctx.translate(cx + Math.cos(a) * orbit, cy + Math.sin(a) * orbit);
      ctx.rotate(a - Math.PI / 2);
      const d = 15 * s;
      ctx.shadowColor = "rgba(60,84,79,0.22)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      if (img) ctx.drawImage(img, -d / 2, -d / 2, d, d);
      else { ctx.fillStyle = p.metal === "gold" ? "#d8b25a" : "#c9ced0"; ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      const d = p.mm * s;
      ctx.shadowColor = "rgba(60,84,79,0.2)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      if (img) ctx.drawImage(img, -d / 2, -d / 2, d, d);
      else {
        const g = ctx.createRadialGradient(-d * 0.18, -d * 0.18, d * 0.08, 0, 0, d / 2);
        if (p.metal === "gold") { g.addColorStop(0, "#f6e3ae"); g.addColorStop(1, "#a8781f"); }
        else { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#8d9598"); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  });

  // dominant energy in the ring centre
  ctx.textAlign = "center";
  ctx.fillStyle = "#299b98";
  ctx.font = "600 18px Arial, sans-serif";
  ctx.fillText("D O M I N A N T   E N E R G Y", cx, cy - 46);
  ctx.save();
  ctx.shadowColor = "rgba(255,215,106,0.85)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#b9891e";
  ctx.font = "600 64px Georgia, serif";
  ctx.fillText(dominant.en, cx, cy + 22);
  ctx.restore();
  ctx.fillStyle = "#8a6d1f";
  ctx.font = "500 34px Georgia, serif";
  ctx.fillText(dominant.score.toLocaleString(), cx, cy + 68);
  ctx.fillStyle = "#8ba39f";
  ctx.font = "500 18px Arial, sans-serif";
  ctx.fillText(`${beads} NATURAL STONES · ${pieces.length} PIECES`, cx, cy + 104);

  // mini energy radar (bottom left)
  const rx = 285, ry = 1080, rr = 96;
  const pt = (i: number, radius: number) => {
    const a = -Math.PI / 2 + (i / energies.length) * Math.PI * 2;
    return [rx + Math.cos(a) * radius, ry + Math.sin(a) * radius] as const;
  };
  const maxScore = Math.max(...energies.map((e) => e.score), 1);
  for (const f of [0.33, 0.66, 1]) {
    ctx.beginPath();
    energies.forEach((_, i) => { const [x, y] = pt(i, rr * f); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = "#d8e4e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.beginPath();
  energies.forEach((e, i) => { const [x, y] = pt(i, 10 + (e.score / maxScore) * (rr - 10)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.closePath();
  ctx.fillStyle = "rgba(227,176,75,0.28)";
  ctx.fill();
  ctx.strokeStyle = "#c9a355";
  ctx.lineWidth = 3;
  ctx.stroke();
  energies.forEach((e, i) => {
    const [x, y] = pt(i, rr + 34);
    ctx.fillStyle = e.color;
    ctx.font = "600 22px Arial, sans-serif";
    ctx.fillText(e.zh, x, y);
    ctx.fillStyle = "#7d9490";
    ctx.font = "500 17px Arial, sans-serif";
    ctx.fillText(e.score.toLocaleString(), x, y + 24);
  });

  // totals (bottom right)
  ctx.textAlign = "left";
  const tx = 560;
  ctx.fillStyle = "#8a9c99";
  ctx.font = "600 17px Arial, sans-serif";
  ctx.fillText("TOTAL ENERGY", tx, 1000);
  ctx.save();
  ctx.shadowColor = "rgba(255,215,106,0.6)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#b9891e";
  ctx.font = "600 54px Georgia, serif";
  ctx.fillText(totalEnergy.toLocaleString(), tx, 1052);
  ctx.restore();
  ctx.fillStyle = "#8a9c99";
  ctx.font = "600 17px Arial, sans-serif";
  ctx.fillText("ESTIMATED TOTAL", tx, 1104);
  ctx.fillStyle = "#0d7f7c";
  ctx.font = "600 46px Georgia, serif";
  ctx.fillText(`NT$ ${priceNTD.toLocaleString()}`, tx, 1152);
  ctx.fillStyle = "#7d9490";
  ctx.font = "500 22px Arial, sans-serif";
  ctx.fillText(`手圍 ${wristCm} cm`, tx, 1192);

  // footer link bar
  const fy = 1246, fh = 64;
  ctx.fillStyle = "#143331";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(60, fy, W - 120, fh, 16); ctx.fill(); }
  else ctx.fillRect(60, fy, W - 120, fh);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd76a";
  ctx.font = "600 21px Arial, sans-serif";
  const shortUrl = url.replace(/^https?:\/\//, "");
  ctx.fillText(`✨ 打造你的同款 → ${shortUrl.length > 62 ? shortUrl.slice(0, 60) + "…" : shortUrl}`, W / 2, fy + 40);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
