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

// The brand palette: cream paper + a warm red for the app chrome.
export const BRAND = {
  red: "#C4132B",
  redDark: "#8E0C1E",
  ink: "#141414",
  cream: "#FDF7EE",
  muted: "#6B6560",
  mutedLight: "#B3ACA4",
  line: "#E4D9C7",
};

// Five pastel frame colors, each paired with a dark ink that reads clearly on top.
export const COLORS = {
  blush: { label: "Blush", hex: "#F7D6DA", paper: "#F7D6DA", ink: "#141414" },
  butter: { label: "Butter", hex: "#FBEFC0", paper: "#FBEFC0", ink: "#141414" },
  mint: { label: "Mint", hex: "#CFEFDD", paper: "#CFEFDD", ink: "#141414" },
  sky: { label: "Sky", hex: "#CFE6F5", paper: "#CFE6F5", ink: "#141414" },
  lavender: { label: "Lavender", hex: "#E1D6F5", paper: "#E1D6F5", ink: "#141414" },
};

export const MAX_SPOTS = 8;

// A heart region (viewBox 100 x 92) used to clip a whole photo into a heart shape.
export const HEART_OUTLINE_PATH =
  "M50 84C24 66 8 52 8 35 8 22 18 12 30 12c8 0 15 4 20 11 5-7 12-11 20-11 12 0 22 10 22 23 0 17-16 31-42 49z";

const HEART_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92">' +
  `<path d="${HEART_OUTLINE_PATH}"/>` +
  "</svg>";

export const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(HEART_SVG)}")`;
