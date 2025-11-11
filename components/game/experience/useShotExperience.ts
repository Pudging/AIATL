import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ParsedGameState } from "@/components/types";
import type { ShotType } from "@/components/WebcamGestureDetector";
import type { SoundBankKey } from "@/components/game/useGameAudio";
import {
  PLAYER_LABELS,
  POINT_DELTA,
  type PlayerLabel,
} from "@/components/game/constants";
import {
  createDetectNewShot,
  type RunShotSequenceParams,
} from "@/components/game/experience/detectNewShot";
import type {
  PlayerPointsDisplayMap,
  PlayerSlotMap,
} from "@/components/game/experience/types";
import {
  createEmptyLanePoints,
  createEmptyPointsDisplay,
  initialShotExperienceState,
  type ShotExperienceAction,
  type ShotExperienceState,
} from "@/components/game/experience/shotExperienceTypes";
import { getPlayerShootingDifficulty } from "@/lib/shootingOdds";

type RegisterPredictionArgs = {
  label?: PlayerLabel;
  prediction: {
    ts: number;
    period?: number | string | null;
    clock?: string;
    shotType?: ShotType;
  };
};

type PlayerDeltaMeta = {
  basePoints: number;
  shotMultiplier: number;
  streakMultiplier: number;
  oddsMultiplier: number;
  finalPoints: number;
};

type UseShotExperienceOptions = {
  gameId: string;
  isTestGame: boolean;
  syncAnchor: { nbaTimestamp: number; realWorldTime: number } | null;
  streamDelay: number;
  playersBySlot: PlayerSlotMap;
  activeLabels: PlayerLabel[];
  gameSessionId: string | null;
  playSound: (sound: SoundBankKey) => void;
  setPointsByPlayer: React.Dispatch<
    React.SetStateAction<Record<PlayerLabel, number>>
  >;
};

const LABEL_TO_SLOT_INDEX: Record<PlayerLabel, 0 | 1 | 2> = {
  "Left Player": 0,
  "Center Player": 1,
  "Right Player": 2,
};

export function useShotExperience({
  gameId,
  isTestGame,
  syncAnchor,
  streamDelay,
  playersBySlot,
  activeLabels,
  gameSessionId,
  playSound,
  setPointsByPlayer,
}: UseShotExperienceOptions) {
  const [shotState, dispatch] = useReducer(
    shotExperienceReducer,
    initialShotExperienceState
  );
  const shotStateRef = useRef(shotState);

  useEffect(() => {
    shotStateRef.current = shotState;
  }, [shotState]);

  const predictionsRef = useRef<
    Record<PlayerLabel, RegisterPredictionArgs["prediction"][]>
  >({
    "Left Player": [],
    "Right Player": [],
    "Center Player": [],
  });
  const lastProcessedShotRef = useRef<string | null>(null);

  const resetPredictions = useCallback(() => {
    predictionsRef.current = {
      "Left Player": [],
      "Right Player": [],
      "Center Player": [],
    };
  }, []);

  const registerPrediction = useCallback(
    (
      label: PlayerLabel | undefined,
      prediction: RegisterPredictionArgs["prediction"]
    ) => {
      if (!shotStateRef.current.predictionWindowActive || !label) return;
      const arr = predictionsRef.current[label] ?? [];
      arr.push(prediction);
      if (arr.length > 10) arr.shift();
      predictionsRef.current[label] = arr;
    },
    []
  );

  const runShotSequence = useCallback(
    ({ lastShot, popupDelay = 0 }: RunShotSequenceParams) => {
      if (!lastShot || !lastShot.playerName) return;

      const execute = () => {
        const is3pt =
          (lastShot.points ?? 0) === 3 ||
          !!lastShot.shotType?.toLowerCase().includes("3");
        const shootingOddsMeta = getPlayerShootingDifficulty(
          lastShot.playerName,
          is3pt ?? false,
          lastShot.playerId
        );
        const rewardMultiplier = shootingOddsMeta.rewardMultiplier;
        const lossMultiplier = shootingOddsMeta.lossMultiplier;

        dispatch({
          type: "PATCH",
          payload: {
            shotCountdown: 3,
            activeShotOdds: {
              playerName: lastShot.playerName ?? "Unknown",
              percentage: shootingOddsMeta.percentage,
              statLabel: shootingOddsMeta.statLabel,
              rewardMultiplier,
              lossMultiplier,
              isThree: !!is3pt,
            },
            showShotIncoming: true,
            predictionWindowActive: true,
          },
        });
        resetPredictions();

        setTimeout(() => {
          dispatch({
            type: "PATCH",
            payload: {
              showShotIncoming: false,
              activeShotOdds: null,
              predictionWindowActive: false,
            },
          });

          const distance = is3pt
            ? `${22 + Math.floor(Math.random() * 8)} ft`
            : `${8 + Math.floor(Math.random() * 14)} ft`;

          const shotData = {
            playerName: lastShot.playerName,
            teamTricode: lastShot.teamTricode,
            shotResult: lastShot.shotResult || "Unknown",
            shotType: lastShot.shotType,
            points: lastShot.points,
            shotLocation: {
              x: is3pt ? 30 + Math.random() * 40 : 40 + Math.random() * 20,
              y: is3pt ? 20 + Math.random() * 40 : 50 + Math.random() * 30,
            },
            distance,
          };
          dispatch({
            type: "PATCH",
            payload: {
              showShotResult: true,
              currentShotData: shotData,
              overlay: lastShot.shotResult?.toLowerCase().includes("made")
                ? "score"
                : "miss",
            },
          });

          const isMade = lastShot.shotResult?.toLowerCase().includes("made");
          const labelsWithPrediction = PLAYER_LABELS.filter(
            (label) => (predictionsRef.current[label]?.length ?? 0) > 0
          );
          const labelsInSession = labelsWithPrediction.filter((label) => {
            const slotIndex = LABEL_TO_SLOT_INDEX[label];
            return playersBySlot[slotIndex] !== null;
          });

          const actualShotType = lastShot.shotType?.toLowerCase();
          let actualGestureType: ShotType = "normal";
          if (actualShotType?.includes("dunk")) {
            actualGestureType = "dunk";
          } else if (actualShotType?.includes("layup")) {
            actualGestureType = "layup";
          }

          const baseDelta = isMade ? POINT_DELTA : -POINT_DELTA;

          if (labelsInSession.length > 0) {
            const shotState = shotStateRef.current;
            const { deltas, displayInfo, nextStreaks } =
              calculatePlayerDeltaInfo({
                labels: labelsInSession,
                predictionsRef,
                playerStreaks: shotState.playerStreaks,
                isMade,
                actualGestureType,
                baseDelta,
                rewardMultiplier,
                lossMultiplier,
              });

            dispatch({
              type: "PATCH",
              payload: {
                playerPointsDisplay: buildPlayerDisplayMap(
                  shotState.playerPointsDisplay,
                  displayInfo
                ),
                playerStreaks: nextStreaks,
                showMoneyRain: isMade,
              },
            });

            if (!isMade) {
              playSound("lose");
            } else {
              playSound("point");
              setTimeout(() => {
                dispatch({ type: "PATCH", payload: { showMoneyRain: false } });
              }, 3000);
            }

            setPointsByPlayer((prev) => {
              const next = { ...prev };
              labelsInSession.forEach((label) => {
                next[label] = (next[label] ?? 0) + deltas[label];
              });
              return next;
            });

            labelsInSession.forEach((label) => {
              if (deltas[label] > 0) {
                playSound("point");
              }
            });

            setTimeout(() => {
              dispatch({ type: "RESET_PLAYER_DISPLAY" });
            }, 2500);

            const hasSinglePlayer = labelsInSession.length === 1;
            const pointsEarnedLabel = hasSinglePlayer
              ? (() => {
                  const label = labelsInSession[0];
                  const slotIndex =
                    LABEL_TO_SLOT_INDEX[label ? label : "Left Player"];
                  const player = playersBySlot[slotIndex];
                  return player?.name?.trim() || label;
                })()
              : null;
            dispatch({
              type: "PATCH",
              payload: {
                showPointsEarned: hasSinglePlayer,
                pointsEarned: baseDelta,
                pointsEarnedLabel,
              },
            });
            const overlayDuration = 1800;
            setTimeout(() => {
              dispatch({
                type: "PATCH",
                payload: {
                  showPointsEarned: false,
                  pointsEarned: 0,
                  pointsEarnedLabel: null,
                },
              });
            }, overlayDuration);

            persistShotsForPlayers({
              labels: labelsInSession,
              playersBySlot,
              predictionsRef,
              lastShot,
              actualGestureType,
              gameId,
              gameSessionId,
              isMade,
            });
          }

          const laneMap = buildLaneMap({
            labelsWithPrediction: labelsInSession,
            predictionsRef,
            baseDelta,
            actualGestureType,
            rewardMultiplier,
            lossMultiplier,
            activeLabels,
          });
          dispatch({
            type: "PATCH",
            payload: { lanePoints: laneMap },
          });
          setTimeout(() => {
            dispatch({ type: "RESET_LANE_POINTS" });
          }, 3000);

          resetPredictions();

          const resultDuration = 1800;
          setTimeout(() => {
            dispatch({
              type: "PATCH",
              payload: {
                showShotResult: false,
                currentShotData: null,
                overlay: null,
              },
            });
          }, resultDuration);
        }, 3000);
      };

      if (popupDelay > 0) {
        setTimeout(execute, popupDelay);
      } else {
        execute();
      }
    },
    [
      activeLabels,
      dispatch,
      gameId,
      gameSessionId,
      playersBySlot,
      playSound,
      predictionsRef,
      resetPredictions,
      setPointsByPlayer,
      shotStateRef,
    ]
  );

  const detectNewShot = useMemo(
    () =>
      createDetectNewShot({
        isTestGame,
        syncAnchor,
        streamDelay,
        lastProcessedShotRef,
        runShotSequence,
      }),
    [isTestGame, runShotSequence, syncAnchor, streamDelay]
  );

  return {
    showShotIncoming: shotState.showShotIncoming,
    shotCountdown: shotState.shotCountdown,
    activeShotOdds: shotState.activeShotOdds,
    showShotResult: shotState.showShotResult,
    currentShotData: shotState.currentShotData,
    overlay: shotState.overlay,
    showMoneyRain: shotState.showMoneyRain,
    playerPointsDisplay: shotState.playerPointsDisplay,
    playerStreaks: shotState.playerStreaks,
    lanePoints: shotState.lanePoints,
    showPointsEarned: shotState.showPointsEarned,
    pointsEarned: shotState.pointsEarned,
    pointsEarnedLabel: shotState.pointsEarnedLabel,
    registerPrediction,
    detectNewShot,
    runShotSequence,
  };
}

function shotExperienceReducer(
  state: ShotExperienceState,
  action: ShotExperienceAction
): ShotExperienceState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.payload };
    case "RESET_PLAYER_DISPLAY":
      return { ...state, playerPointsDisplay: createEmptyPointsDisplay() };
    case "RESET_LANE_POINTS":
      return { ...state, lanePoints: createEmptyLanePoints() };
    default:
      return state;
  }
}

function buildPlayerDisplayMap(
  current: PlayerPointsDisplayMap,
  updates: Record<PlayerLabel, PlayerDeltaMeta>
): PlayerPointsDisplayMap {
  const next: PlayerPointsDisplayMap = {
    "Left Player": { ...current["Left Player"] },
    "Right Player": { ...current["Right Player"] },
    "Center Player": { ...current["Center Player"] },
  };
  Object.entries(updates).forEach(([label, info]) => {
    next[label as PlayerLabel] = {
      show: true,
      points: info.finalPoints,
      basePoints: info.basePoints,
      shotMultiplier: info.shotMultiplier,
      streakMultiplier: info.streakMultiplier,
      oddsMultiplier: info.oddsMultiplier,
    };
  });
  return next;
}

function buildLaneMap({
  labelsWithPrediction,
  predictionsRef,
  baseDelta,
  actualGestureType,
  rewardMultiplier,
  lossMultiplier,
  activeLabels,
}: {
  labelsWithPrediction: PlayerLabel[];
  predictionsRef: MutableRefObject<
    Record<PlayerLabel, RegisterPredictionArgs["prediction"][]>
  >;
  baseDelta: number;
  actualGestureType: ShotType;
  rewardMultiplier: number;
  lossMultiplier: number;
  activeLabels: PlayerLabel[];
}): Record<PlayerLabel, number | null> {
  const laneMap = createEmptyLanePoints();
  const laneOddsFactor = baseDelta >= 0 ? rewardMultiplier : lossMultiplier;

  labelsWithPrediction.forEach((label) => {
    const playerPredictions = predictionsRef.current[label] ?? [];
    const lastPrediction = playerPredictions[playerPredictions.length - 1];
    const predictedShotType = lastPrediction?.shotType;
    const shotMatchMultiplier = predictedShotType === actualGestureType ? 2 : 1;
    laneMap[label] = baseDelta * shotMatchMultiplier * laneOddsFactor;
  });

  activeLabels.forEach((label) => {
    if (!labelsWithPrediction.includes(label)) {
      laneMap[label] = 0;
    }
  });

  return laneMap;
}

function calculatePlayerDeltaInfo({
  labels,
  predictionsRef,
  playerStreaks,
  isMade,
  actualGestureType,
  baseDelta,
  rewardMultiplier,
  lossMultiplier,
}: {
  labels: PlayerLabel[];
  predictionsRef: MutableRefObject<
    Record<PlayerLabel, RegisterPredictionArgs["prediction"][]>
  >;
  playerStreaks: Record<PlayerLabel, number>;
  isMade: boolean;
  actualGestureType: ShotType;
  baseDelta: number;
  rewardMultiplier: number;
  lossMultiplier: number;
}) {
  const deltas: Record<PlayerLabel, number> = {} as Record<PlayerLabel, number>;
  const displayInfo: Record<PlayerLabel, PlayerDeltaMeta> = {} as Record<
    PlayerLabel,
    PlayerDeltaMeta
  >;
  const nextStreaks = { ...playerStreaks };

  labels.forEach((label) => {
    const playerPredictions = predictionsRef.current[label] ?? [];
    const lastPrediction = playerPredictions[playerPredictions.length - 1];
    const predictedShotType = lastPrediction?.shotType;
    const shotMultiplier =
      isMade && predictedShotType === actualGestureType ? 2 : 1;
    const currentStreak = playerStreaks[label] ?? 0;
    const newStreak = isMade ? currentStreak + 1 : 0;
    nextStreaks[label] = newStreak;

    const streakMultiplier = 1 + Math.max(0, newStreak - 1) * 0.2;
    const oddsFactor = baseDelta >= 0 ? rewardMultiplier : lossMultiplier;
    const delta = Math.round(
      baseDelta * shotMultiplier * streakMultiplier * oddsFactor
    );

    deltas[label] = delta;
    displayInfo[label] = {
      basePoints: baseDelta,
      shotMultiplier,
      streakMultiplier,
      oddsMultiplier: oddsFactor,
      finalPoints: delta,
    };
  });

  return { deltas, displayInfo, nextStreaks };
}

function persistShotsForPlayers({
  labels,
  playersBySlot,
  predictionsRef,
  lastShot,
  actualGestureType,
  gameId,
  gameSessionId,
  isMade,
}: {
  labels: PlayerLabel[];
  playersBySlot: PlayerSlotMap;
  predictionsRef: MutableRefObject<
    Record<PlayerLabel, RegisterPredictionArgs["prediction"][]>
  >;
  lastShot: ParsedGameState["lastShot"];
  actualGestureType: ShotType;
  gameId: string;
  gameSessionId: string | null;
  isMade: boolean;
}) {
  try {
    const payload = labels
      .map((label) => ({
        label,
        invariant: {
          shotTypeActual: actualGestureType ?? null,
          shotTypePredicted:
            predictionsRef.current[label]?.slice(-1)[0]?.shotType ?? null,
          predictedPlayer: undefined,
          predictedGesture: undefined,
        },
        points: {
          predicted: 0,
        },
      }))
      .map((entry) => ({
        ...entry,
        player: playersBySlot[LABEL_TO_SLOT_INDEX[entry.label]],
      }))
      .filter((entry) => entry.player);

    if (!gameSessionId || payload.length === 0) return;

    fetch(`/api/game-session/${gameId}/shots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: gameSessionId,
        shot: {
          result: lastShot?.shotResult ?? "Unknown",
          points: lastShot?.points,
          playerName: lastShot?.playerName,
          playerId: lastShot?.playerId,
        },
        details: payload,
        isMade,
      }),
    });
  } catch (err) {
    console.error("[PERSIST SHOT] failed", err);
  }
}
