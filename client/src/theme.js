export const FILTERS = {
  classic: { label: "Plain", css: "none" },
  noir: { label: "B&W", css: "grayscale(1) contrast(1.15)" },
  bright: { label: "Bright", css: "brightness(1.12) saturate(1.2) contrast(1.05)" },
  grain: { label: "Grain", css: "contrast(1.1) saturate(0.85) brightness(0.97)" },
};

export const SHAPES = {
  square: { label: "Square" },
  heart: { label: "Heart" },
};

export const INFO_POSITIONS = {
  none: { label: "None" },
  center: { label: "Center" },
  below: { label: "Below" },
};

// Flat accent colors used for the strip frame + as the app's per-room accent.
export const COLORS = {
  ink: { label: "Ink", hex: "#14151a", paper: "#f4f1ea", ink: "#14151a" },
  maroon: { label: "Maroon", hex: "#7a1f2b", paper: "#fbeceb", ink: "#2a0f12" },
  blush: { label: "Blush", hex: "#f2b9c6", paper: "#fff7f8", ink: "#3a1620" },
  sky: { label: "Sky", hex: "#7ec4e0", paper: "#f2fafd", ink: "#0f2a33" },
  teal: { label: "Teal", hex: "#2ba38f", paper: "#eefaf7", ink: "#0c2622" },
  lime: { label: "Lime", hex: "#8fce2e", paper: "#f7fbea", ink: "#1f2a0c" },
};

export const MAX_SPOTS = 8;

export function heartPath(ctx, x, y, w, h) {
  const topCurveHeight = h * 0.32;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h * 0.28);
  ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y + (h + topCurveHeight) / 2, x + w / 2, y + (h + topCurveHeight) / 1.35, x + w / 2, y + h);
  ctx.bezierCurveTo(
    x + w / 2,
    y + (h + topCurveHeight) / 1.35,
    x + w,
    y + (h + topCurveHeight) / 2,
    x + w,
    y + topCurveHeight
  );
  ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + h * 0.28);
  ctx.closePath();
}

const HEART_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<path d="M50 90 C18 68,3 46,3 26 C3 8,18 -2,50 21 C82 -2,97 8,97 26 C97 46,82 68,50 90 Z"/>' +
  "</svg>";

export const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(HEART_SVG)}")`;
