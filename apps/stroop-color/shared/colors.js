export const COLORS = [
  { en: "Red",    hex: "#E70022" }, // Official Wizard Red
  { en: "Blue",   hex: "#00A6ED" }, // Official Wizard Cyan/Blue
  { en: "Yellow", hex: "#FFBA00" }, // Official Wizard Gold
  { en: "Green",  hex: "#00E676" }, // High-contrast Emerald
  { en: "Purple", hex: "#B388FF" }, // Vibrant Purple
  { en: "Orange", hex: "#FF6D00" }, // Vibrant Orange
  { en: "Pink",   hex: "#FF4081" }, // Neon Pink
  { en: "White",  hex: "#FFFFFF" }, // High-contrast White
  { en: "Brown",  hex: "#BCAAA4" }, // Warm Tan
  { en: "Cyan",   hex: "#1DE9B6" }, // Teal / Cyan
];

export function generateRound(count) {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5).slice(0, count);
  // derangement: garante que cor da tinta != cor do nome
  let inks;
  do {
    inks = [...shuffled].sort(() => Math.random() - 0.5).map(c => c.hex);
  } while (inks.some((hex, i) => hex === shuffled[i].hex));
  return { words: shuffled, inks };
}
