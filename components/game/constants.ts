export const brandPalette = {
  deep: "#010c07",
  emerald: "#49e6b5",
  emeraldDark: "#0b5f4a",
  midnight: "#02170f",
  purple: "#a855f7",
};

export const PLAYER_LABELS = [
  "Left Player",
  "Right Player",
  "Center Player",
] as const;

export type PlayerLabel = (typeof PLAYER_LABELS)[number];

export const LABEL_COLORS: Record<PlayerLabel, string> = {
  "Left Player": brandPalette.emerald,
  "Right Player": brandPalette.purple,
  "Center Player": "#34d399",
};

export const POINT_DELTA = 1000;
