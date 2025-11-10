"use client";

import dynamic from "next/dynamic";
import type { ShotType } from "@/components/WebcamGestureDetector";
import { PlayerScoreboard } from "@/components/game/experience/PlayerScoreboard";
import {
  OtherHostsGrid,
  type OtherHostSession,
} from "@/components/game/experience/OtherHostsGrid";
import type {
  PlayerPointsDisplayMap,
  PlayerSlotMap,
} from "@/components/game/experience/types";
import type { PlayerLabel } from "@/components/game/constants";

const WebcamGestureDetector = dynamic(
  () => import("@/components/WebcamGestureDetector"),
  {
    ssr: false,
    loading: () => (
      <div className="text-center text-sm opacity-70">Loading camera…</div>
    ),
  }
);

type GameCameraPanelProps = {
  assignedLabels: PlayerLabel[];
  playersBySlot: PlayerSlotMap;
  pointsByPlayer: Record<PlayerLabel, number>;
  playerPointsDisplay: PlayerPointsDisplayMap;
  playerStreaks: Record<PlayerLabel, number>;
  otherHosts: OtherHostSession[];
  onRemovePlayer: (slot: number) => void;
  onActiveLabelsChange: (labels: PlayerLabel[]) => void;
  onShootGesture: (label?: PlayerLabel, shotType?: ShotType) => void;
};

export function GameCameraPanel({
  assignedLabels,
  playersBySlot,
  pointsByPlayer,
  playerPointsDisplay,
  playerStreaks,
  otherHosts,
  onRemovePlayer,
  onActiveLabelsChange,
  onShootGesture,
}: GameCameraPanelProps) {
  return (
    <div className="relative rounded-lg border border-white/10 bg-black/45 p-4 lg:p-6 shadow-lg shadow-black/50">
      <WebcamGestureDetector
        debug
        activeLabelsOverride={assignedLabels}
        hideReadyBanner
        onReadyChange={() => {}}
        displayNames={{
          "Left Player": playersBySlot[0]?.name ?? undefined,
          "Center Player": playersBySlot[1]?.name ?? undefined,
          "Right Player": playersBySlot[2]?.name ?? undefined,
        }}
        extraContent={
          <>
            <PlayerScoreboard
              labels={assignedLabels}
              pointsByPlayer={pointsByPlayer}
              playerPointsDisplay={playerPointsDisplay}
              playersBySlot={playersBySlot}
              playerStreaks={playerStreaks}
              onRemovePlayer={onRemovePlayer}
            />
            <OtherHostsGrid hosts={otherHosts} />
          </>
        }
        onActiveLabelsChange={onActiveLabelsChange}
        onShootGesture={onShootGesture}
      />
    </div>
  );
}
