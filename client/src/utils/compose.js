import { COLORS, heartPath } from "../theme.js";

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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

export async function composePhotos(photos, settings) {
  const color = COLORS[settings.color] || COLORS.ink;
  const shape = settings.shape || "square";
  const infoPosition = settings.infoPosition || "below";
  const images = await Promise.all(photos.map((p) => loadImage(p.dataUrl)));

  const stripW = 380;
  const pad = 22;
  const gap = 16;
  const photoW = stripW - pad * 2;
  const photoH = Math.round(photoW * 0.74);
  const nameH = infoPosition === "below" ? 30 : 0;
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
  ctx.font = "600 26px 'Fraunces', Georgia, serif";
  ctx.fillText(settings.caption || "Together", canvas.width / 2, 48);

  images.forEach((img, i) => {
    const x = pad;
    const y = headerH + i * (cellH + gap);

    ctx.save();
    if (shape === "heart") {
      heartPath(ctx, x, y, photoW, photoH);
      ctx.clip();
      ctx.fillStyle = "#00000015";
      ctx.fillRect(x, y, photoW, photoH);
      drawCover(ctx, img, x, y, photoW, photoH);
    } else {
      roundRectPath(ctx, x, y, photoW, photoH, 10);
      ctx.save();
      ctx.clip();
      drawCover(ctx, img, x, y, photoW, photoH);
      ctx.restore();
      ctx.strokeStyle = `${color.ink}22`;
      ctx.lineWidth = 1;
      roundRectPath(ctx, x, y, photoW, photoH, 10);
      ctx.stroke();
    }
    ctx.restore();

    if (infoPosition === "center") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "500 14px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 6;
      ctx.fillText(photos[i].name, x + photoW / 2, y + photoH - 14);
      ctx.restore();
    } else if (infoPosition === "below") {
      ctx.fillStyle = color.ink;
      ctx.textAlign = "center";
      ctx.font = "500 14px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText(photos[i].name, x + photoW / 2, y + photoH + 20);
    }
  });

  ctx.fillStyle = color.ink;
  ctx.textAlign = "center";
  const footerY = canvas.height - footerH / 2 - 10;
  ctx.font = "600 20px 'Fraunces', Georgia, serif";
  ctx.fillText(settings.caption || "Together", canvas.width / 2, footerY);
  ctx.font = "400 13px 'Inter', 'Segoe UI', sans-serif";
  ctx.globalAlpha = 0.75;
  ctx.fillText(todayLabel(), canvas.width / 2, footerY + 24);
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
}
