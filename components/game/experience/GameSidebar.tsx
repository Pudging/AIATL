"use client";

import type { ParsedGameState } from "@/components/types";
import { GameStatusCard } from "@/components/game/experience/GameStatusCard";
import { TestGameTracker } from "@/components/game/experience/TestGameTracker";
import { LastShotCard } from "@/components/game/experience/LastShotCard";
import { PlayerSpotlightCard } from "@/components/game/experience/PlayerSpotlightCard";
import { JoinCodeCard } from "@/components/game/experience/JoinCodeCard";
import { HotStreakCard } from "@/components/game/experience/HotStreakCard";

type GameSidebarProps = {
  state: ParsedGameState | null;
  isTestGame: boolean;
  testGameTimestamp: number;
  onTestGameTimestampChange: (value: number) => void;
  joinCode: string | null;
  onOpenStreamSettings: () => void;
};

export function GameSidebar({
  state,
  isTestGame,
  testGameTimestamp,
  onTestGameTimestampChange,
  joinCode,
  onOpenStreamSettings,
}: GameSidebarProps) {
  return (
    <div className="space-y-6 border rounded-lg border-[#1f364d] bg-[#0b1426] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.65)] backdrop-blur-md transition-transform duration-300">
      <GameStatusCard
        period={state?.period}
        clock={state?.clock}
        score={state?.score}
        onStreamSettings={onOpenStreamSettings}
      />
      {isTestGame && (
        <TestGameTracker
          value={testGameTimestamp}
          onChange={onTestGameTimestampChange}
        />
      )}
      <LastShotCard lastShot={state?.lastShot} />
      <PlayerSpotlightCard player={state?.ballHandler} />
      <JoinCodeCard joinCode={joinCode} />
      <HotStreakCard shooter={state?.shooter} />
    </div>
  );
}
