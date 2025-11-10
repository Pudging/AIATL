import type { PlayerLabel } from "@/components/game/constants";

export type PlayerSlotMap = Record<
  number,
  { id: string; name?: string | null; image?: string | null } | null
>;

export type PlayerPointsDisplayEntry = {
  show: boolean;
  points: number;
  basePoints: number;
  shotMultiplier: number;
  streakMultiplier: number;
  oddsMultiplier: number;
};

export type PlayerPointsDisplayMap = Record<
  PlayerLabel,
  PlayerPointsDisplayEntry
>;

export type ShotOddsInfo = {
  playerName: string;
  percentage: number | null;
  statLabel: "FG%" | "3P%" | null;
  rewardMultiplier: number;
  lossMultiplier: number;
  isThree: boolean;
};
