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

// The brand palette: cream paper + a warm red, plus the frame-color swatches.
export const BRAND = {
  red: "#C4132B",
  redDark: "#8E0C1E",
  ink: "#141414",
  cream: "#FDF7EE",
  muted: "#6B6560",
  mutedLight: "#B3ACA4",
  line: "#E4D9C7",
};

export const COLORS = {
  cream: { label: "Cream", hex: "#FDF7EE", paper: "#FDF7EE", ink: "#141414" },
  red: { label: "Red", hex: "#C4132B", paper: "#C4132B", ink: "#FDF7EE" },
  blush: { label: "Blush", hex: "#F4B8B0", paper: "#F4B8B0", ink: "#141414" },
  tan: { label: "Tan", hex: "#EBD7A8", paper: "#EBD7A8", ink: "#141414" },
  teal: { label: "Teal", hex: "#2F6F62", paper: "#2F6F62", ink: "#FDF7EE" },
  black: { label: "Black", hex: "#141414", paper: "#141414", ink: "#FDF7EE" },
};

export const MAX_SPOTS = 8;

// A hand-drawn heart outline, used as a decorative sticker over the photo
// (not a clip mask) -- viewBox is 100 x 92.
export const HEART_OUTLINE_PATH =
  "M50 84C24 66 8 52 8 35 8 22 18 12 30 12c8 0 15 4 20 11 5-7 12-11 20-11 12 0 22 10 22 23 0 17-16 31-42 49z";

export function drawHeartOutline(ctx, cx, cy, w, color = "#C4132B") {
  const h = (w * 92) / 100;
  const scale = w / 100;
  ctx.save();
  ctx.translate(cx - w / 2, cy - h / 2);
  ctx.scale(scale, scale);
  ctx.beginPath();
  const p = new Path2D(HEART_OUTLINE_PATH);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 / scale;
  ctx.lineJoin = "round";
  ctx.stroke(p);
  ctx.restore();
}
