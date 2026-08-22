export const FILTERS = {
  classic: { label: "Classic", css: "contrast(1.08) saturate(1.15) brightness(1.02)" },
  noir: { label: "Noir", css: "grayscale(1) contrast(1.2) brightness(1.05)" },
  sepia: { label: "Sepia", css: "sepia(0.65) contrast(1.05) saturate(1.2)" },
  dreamy: { label: "Dreamy", css: "brightness(1.08) saturate(0.9) blur(0.4px) contrast(0.96)" },
  vivid: { label: "Vivid", css: "saturate(1.6) contrast(1.15)" },
};

export const FRAMES = {
  sunset: { label: "Sunset", colors: ["#ff9a62", "#ff6f91", "#7b4397"], ink: "#2c1a2e", paper: "#fff7ee" },
  midnight: { label: "Midnight", colors: ["#1b1035", "#3a1c5e", "#6b2a6b"], ink: "#fdf6ff", paper: "#140a24" },
  meadow: { label: "Meadow", colors: ["#d9f2b4", "#7fc8a9", "#3a7d63"], ink: "#173620", paper: "#fbfff4" },
  blush: { label: "Blush", colors: ["#ffe0ec", "#ffb6c8", "#f97ba0"], ink: "#4a1030", paper: "#fffafb" },
  mono: { label: "Mono", colors: ["#4a4a4a", "#2b2b2b", "#0e0e0e"], ink: "#f5f5f5", paper: "#fafafa" },
};

export function frameCssBackground(frame) {
  return `linear-gradient(160deg, ${frame.colors[0]} 0%, ${frame.colors[1]} 55%, ${frame.colors[2]} 100%)`;
}

export const LAYOUTS = {
  strip: { label: "Film strip" },
  grid: { label: "Grid" },
};
