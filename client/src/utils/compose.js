import { COLORS, HEART_OUTLINE_PATH } from "../theme.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

export async function composePhotos(photos, settings) {
  const color = COLORS[settings.color] || COLORS.blush;
  const shape = settings.shape || "square";
  const infoPosition = settings.infoPosition || "below";
  const images = await Promise.all(photos.map((p) => loadImage(p.dataUrl)));

  const stripW = 380;
  const pad = 22;
  const gap = 16;
  const photoW = stripW - pad * 2;
  const photoH = Math.round(photoW * 0.92);
  const nameH = infoPosition === "below" ? 28 : 0;
  const cellH = photoH + nameH;
  const headerH = 78;
  const footerH = 92;

  const canvas = document.createElement("canvas");
  canvas.width = stripW;
  canvas.height = headerH + images.length * cellH + Math.max(0, images.length - 1) * gap + footerH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = color.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color.ink;
  ctx.textAlign = "center";
  ctx.font = "800 26px 'Bricolage Grotesque', sans-serif";
  ctx.fillText((settings.caption || "Together").toUpperCase(), canvas.width / 2, 48);

  images.forEach((img, i) => {
    const x = pad;
    const y = headerH + i * (cellH + gap);

    if (shape === "heart") {
      // The heart is a cutout on the card's own paper color, not a photo
      // sitting in a black box -- so the corners outside the heart match
      // the strip's background instead of being filled black.
      ctx.fillStyle = color.paper;
      ctx.fillRect(x, y, photoW, photoH);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(photoW / 100, photoH / 92);
      ctx.clip(new Path2D(HEART_OUTLINE_PATH));
      drawCover(ctx, img, 0, 0, 100, 92);
      ctx.restore();
    } else {
      ctx.fillStyle = "#141414";
      ctx.fillRect(x, y, photoW, photoH);
      drawCover(ctx, img, x, y, photoW, photoH);
      ctx.strokeStyle = "#141414";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, photoW - 1.5, photoH - 1.5);
    }

    if (infoPosition === "center") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "600 13px 'Instrument Sans', 'Segoe UI', sans-serif";
      ctx.fillStyle = "#FDF7EE";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 6;
      ctx.fillText(photos[i].name.toUpperCase(), x + photoW / 2, y + photoH - 14);
      ctx.restore();
    } else if (infoPosition === "below") {
      ctx.fillStyle = color.ink;
      ctx.textAlign = "center";
      ctx.font = "500 13px 'Instrument Sans', 'Segoe UI', sans-serif";
      ctx.fillText(photos[i].name.toUpperCase(), x + photoW / 2, y + photoH + 19);
    }
  });

  ctx.fillStyle = color.ink;
  ctx.textAlign = "center";
  const footerY = canvas.height - footerH / 2 - 10;
  ctx.font = "600 12px 'Instrument Sans', sans-serif";
  ctx.fillText((settings.caption || "Together").toUpperCase(), canvas.width / 2, footerY);
  ctx.font = "400 12px 'IBM Plex Mono', monospace";
  ctx.globalAlpha = 0.7;
  ctx.fillText(todayLabel(), canvas.width / 2, footerY + 22);
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
}
