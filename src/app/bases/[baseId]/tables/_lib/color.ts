import { clamp } from "./math";

export const getRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const fullHex = isShort
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;
  const value = Number.parseInt(fullHex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export const toRgba = (hex: string, alpha: number) => {
  const { r, g, b } = getRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const adjustColor = (hex: string, amount: number) => {
  const { r, g, b } = getRgb(hex);
  return `rgb(${clamp(r + amount, 0, 255)}, ${clamp(g + amount, 0, 255)}, ${clamp(b + amount, 0, 255)})`;
};

export const getContrastColor = (hex: string) => {
  const { r, g, b } = getRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#1d1f25" : "#ffffff";
};
