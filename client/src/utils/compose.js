import { FRAMES } from "../theme.js";

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

function paintBackground(ctx, w, h, frame) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, frame.colors[0]);
  gradient.addColorStop(0.55, frame.colors[1]);
  gradient.addColorStop(1, frame.colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function paintPolaroid(ctx, x, y, w, h, frame) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = frame.paper;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function paintFooter(ctx, x, y, w, frame, text) {
  ctx.fillStyle = frame.ink;
  ctx.font = "600 22px 'Fredoka', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y);
  ctx.font = "400 13px 'Inter', 'Segoe UI', sans-serif";
  ctx.globalAlpha = 0.75;
  ctx.fillText("togetherbooth.app", x + w / 2, y + 26);
  ctx.globalAlpha = 1;
}

export async function composePhotos(photos, settings) {
  const frame = FRAMES[settings.frame] || FRAMES.sunset;
  const images = await Promise.all(photos.map((p) => loadImage(p.dataUrl)));

  const photoW = 420;
  const photoH = 315;
  const inset = 16;
  const gap = 22;
  const pad = 34;

  let canvas, ctx, photoBoxes;

  if (settings.layout === "grid") {
    const cols = images.length <= 1 ? 1 : images.length <= 4 ? 2 : 3;
    const rows = Math.ceil(images.length / cols);
    const cellW = photoW * 0.72;
    const cellH = photoH * 0.72;
    const w = pad * 2 + cols * cellW + (cols - 1) * gap;
    const headerH = 96;
    const footerH = 84;
    const h = headerH + rows * cellH + (rows - 1) * gap + footerH;

    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext("2d");
    paintBackground(ctx, w, h, frame);

    photoBoxes = images.map((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        img,
        x: pad + col * (cellW + gap),
        y: headerH + row * (cellH + gap),
        w: cellW,
        h: cellH,
        name: photos[i].name,
      };
    });

    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = "600 30px 'Fredoka', 'Segoe UI', sans-serif";
    ctx.fillText(settings.caption || "together, apart", w / 2, 52);

    photoBoxes.forEach(({ img, x, y, w: bw, h: bh, name }) => {
      paintPolaroid(ctx, x, y, bw, bh, frame);
      ctx.save();
      ctx.filter = "none";
      drawCover(ctx, img, x + inset * 0.6, y + inset * 0.6, bw - inset * 1.2, bh - inset * 1.6);
      ctx.restore();
      ctx.fillStyle = frame.ink;
      ctx.font = "500 13px 'Inter', 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name, x + bw / 2, y + bh - inset * 0.55);
    });

    paintFooter(ctx, pad, h - footerH / 2, w - pad * 2, frame, "");
  } else {
    const w = photoW + pad * 2;
    const headerH = 88;
    const footerH = 96;
    const h = headerH + images.length * (photoH + gap) - gap + footerH;

    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext("2d");
    paintBackground(ctx, w, h, frame);

    ctx.fillStyle = frame.ink;
    ctx.textAlign = "center";
    ctx.font = "600 32px 'Fredoka', 'Segoe UI', sans-serif";
    ctx.fillText(settings.caption || "together, apart", w / 2, 54);

    images.forEach((img, i) => {
      const x = pad;
      const y = headerH + i * (photoH + gap);
      paintPolaroid(ctx, x, y, photoW, photoH, frame);
      ctx.save();
      ctx.filter = "none";
      drawCover(ctx, img, x + inset, y + inset, photoW - inset * 2, photoH - inset * 2 - 20);
      ctx.restore();
      ctx.fillStyle = frame.ink;
      ctx.font = "500 15px 'Inter', 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(photos[i].name, x + photoW / 2, y + photoH - 12);
    });

    paintFooter(ctx, pad, h - footerH / 2 - 6, photoW, frame, "");
  }

  return canvas.toDataURL("image/png");
}
