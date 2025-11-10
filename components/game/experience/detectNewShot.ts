import type { ParsedGameState } from "@/components/types";
import type { MutableRefObject } from "react";

export type RunShotSequenceParams = {
  lastShot: ParsedGameState["lastShot"];
  popupDelay?: number;
};

type DetectNewShotDeps = {
  isTestGame: boolean;
  syncAnchor: { nbaTimestamp: number; realWorldTime: number } | null;
  streamDelay: number;
  lastProcessedShotRef: MutableRefObject<string | null>;
  runShotSequence: (params: RunShotSequenceParams) => void;
};

export function createDetectNewShot({
  isTestGame,
  syncAnchor,
  streamDelay,
  lastProcessedShotRef,
  runShotSequence,
}: DetectNewShotDeps) {
  return function detectNewShot(
    gameState: ParsedGameState,
    timestamp: number,
    isFromDelayedState: boolean = false
  ) {
    const lastShot = gameState?.lastShot;
    if (!lastShot || !lastShot.playerName) return;

    const shotId = `${lastShot.playerName}-${lastShot.shotResult}-${gameState.clock}`;
    if (lastProcessedShotRef.current === shotId) return;
    lastProcessedShotRef.current = shotId;

    let popupDelay = 0;
    if (isTestGame || isFromDelayedState) {
      popupDelay = 0;
    } else if (syncAnchor) {
      const shotWillAppearAt =
        syncAnchor.realWorldTime +
        (timestamp - syncAnchor.nbaTimestamp) -
        streamDelay * 1000;
      const now = Date.now();
      const timeUntilShotAppears = shotWillAppearAt - now;
      popupDelay = Math.max(0, timeUntilShotAppears - 3000);
      if (timeUntilShotAppears < -10000) {
        console.warn("[SHOT TIMING] Shot already passed, skipping");
        return;
      }
    } else {
      popupDelay = 0;
    }

    runShotSequence({ lastShot, popupDelay });
  };
}
