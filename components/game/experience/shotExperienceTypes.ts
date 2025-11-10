import type { PlayerLabel } from "@/components/game/constants";
import type {
  PlayerPointsDisplayMap,
  ShotOddsInfo,
} from "@/components/game/experience/types";

export type ShotExperienceState = {
  showShotIncoming: boolean;
  shotCountdown: number;
  activeShotOdds: ShotOddsInfo | null;
  predictionWindowActive: boolean;
  showShotResult: boolean;
  currentShotData: any;
  overlay: "score" | "miss" | null;
  showMoneyRain: boolean;
  playerPointsDisplay: PlayerPointsDisplayMap;
  playerStreaks: Record<PlayerLabel, number>;
  lanePoints: Record<PlayerLabel, number | null>;
  showPointsEarned: boolean;
  pointsEarned: number;
  pointsEarnedLabel: string | null;
};

export type ShotExperienceAction =
  | { type: "PATCH"; payload: Partial<ShotExperienceState> }
  | { type: "RESET_PLAYER_DISPLAY" }
  | { type: "RESET_LANE_POINTS" };

const basePointsDisplayEntry = () => ({
  show: false,
  points: 0,
  basePoints: 0,
  shotMultiplier: 1,
  streakMultiplier: 1,
  oddsMultiplier: 1,
});

export const createEmptyPointsDisplay = (): PlayerPointsDisplayMap => ({
  "Left Player": basePointsDisplayEntry(),
  "Right Player": basePointsDisplayEntry(),
  "Center Player": basePointsDisplayEntry(),
});

export const createEmptyLanePoints = (): Record<
  PlayerLabel,
  number | null
> => ({
  "Left Player": null,
  "Right Player": null,
  "Center Player": null,
});

export const initialShotExperienceState: ShotExperienceState = {
  showShotIncoming: false,
  shotCountdown: 3,
  activeShotOdds: null,
  predictionWindowActive: false,
  showShotResult: false,
  currentShotData: null,
  overlay: null,
  showMoneyRain: false,
  playerPointsDisplay: createEmptyPointsDisplay(),
  playerStreaks: {
    "Left Player": 0,
    "Right Player": 0,
    "Center Player": 0,
  },
  lanePoints: createEmptyLanePoints(),
  showPointsEarned: false,
  pointsEarned: 0,
  pointsEarnedLabel: null,
};
