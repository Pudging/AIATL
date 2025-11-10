"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParsedGameState } from "@/components/types";
import type { ShotType } from "@/components/WebcamGestureDetector";
import ShotIncomingOverlay from "@/components/ShotIncomingOverlay";
import ShotResultOverlay from "@/components/ShotResultOverlay";
import PointsEarnedOverlay from "@/components/PointsEarnedOverlay";
import MultiPlayerPointsOverlay from "@/components/MultiPlayerPointsOverlay";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useGameAudio } from "@/components/game/useGameAudio";
import { PLAYER_LABELS, type PlayerLabel } from "@/components/game/constants";
import { useGameSession } from "@/components/game/useGameSession";
import type { OtherHostSession } from "@/components/game/experience/OtherHostsGrid";
import type {
  PlayerPointsDisplayMap,
  PlayerSlotMap,
  ShotOddsInfo,
} from "@/components/game/experience/types";
import { StreamSettingsModal } from "@/components/game/experience/StreamSettingsModal";
import { useGameStateFeed } from "@/components/game/experience/useGameStateFeed";
import { useShotExperience } from "@/components/game/experience/useShotExperience";
import { GameSidebar } from "@/components/game/experience/GameSidebar";
import { GameCameraPanel } from "@/components/game/experience/GameCameraPanel";
import {
  GameExperienceProvider,
  useGameExperienceContext,
} from "@/components/game/experience/GameExperienceContext";

type GameExperienceProps = {
  gameId: string;
  sessionIdParam: string | null;
};

type GameExperienceViewModel = {
  showMoneyRain: boolean;
  state: ParsedGameState | null;
  isTestGame: boolean;
  isTest002: boolean;
  testGameTimestamp: number;
  setTestGameTimestamp: React.Dispatch<React.SetStateAction<number>>;
  joinCode: string | null;
  assignedLabels: PlayerLabel[];
  playersBySlot: PlayerSlotMap;
  pointsByPlayer: Record<PlayerLabel, number>;
  playerPointsDisplay: PlayerPointsDisplayMap;
  playerStreaks: Record<PlayerLabel, number>;
  otherHosts: OtherHostSession[];
  handleRemovePlayer: (slot: number) => void;
  setActiveLabels: (labels: PlayerLabel[]) => void;
  handleShootGesture: (label?: PlayerLabel, shotType?: ShotType) => void;
  error: string | null;
  showShotIncoming: boolean;
  shotCountdown: number;
  activeShotOdds: ShotOddsInfo | null;
  showShotResult: boolean;
  currentShotData: any;
  showPointsEarned: boolean;
  pointsEarned: number;
  pointsEarnedLabel: string | null;
  showStreamSettings: boolean;
  setShowStreamSettings: React.Dispatch<React.SetStateAction<boolean>>;
  streamDelay: number;
  setStreamDelay: React.Dispatch<React.SetStateAction<number>>;
  streamClockInput: string;
  setStreamClockInput: React.Dispatch<React.SetStateAction<string>>;
  streamPeriodInput: number;
  setStreamPeriodInput: React.Dispatch<React.SetStateAction<number>>;
  handleStreamSync: () => void;
  syncAnchor: { nbaTimestamp: number; realWorldTime: number } | null;
  syncedPeriod: number;
  streamGameClock: string;
  showTutorial: boolean;
  setShowTutorial: React.Dispatch<React.SetStateAction<boolean>>;
  triggerManualShotTest: () => void;
};

type ShotHandler = (
  gameState: ParsedGameState,
  timestamp: number,
  isFromDelayedState: boolean
) => void;

export function GameExperience({
  gameId,
  sessionIdParam,
}: GameExperienceProps) {
  const { playSound } = useGameAudio();
  const id = gameId;
  const isTestGame = id?.toUpperCase() === "TEST001";
  const isTest002 = id?.toUpperCase() === "TEST002";

  const shotHandlerRef = useRef<
    | ((
        state: ParsedGameState,
        timestamp: number,
        isFromDelayedState: boolean
      ) => void)
    | null
  >(null);
  const [pointsByPlayer, setPointsByPlayer] = useState<
    Record<PlayerLabel, number>
  >(() => {
    const isTest = id?.toUpperCase() === "TEST001";
    return {
      "Left Player": isTest ? 10000 : 0,
      "Right Player": isTest ? 10000 : 0,
      "Center Player": isTest ? 10000 : 0,
    };
  });
  const handlePointsSync = useCallback(
    (points: Record<PlayerLabel, number>) => {
      setPointsByPlayer((prev) => ({ ...prev, ...points }));
    },
    []
  );
  const { gameSessionId, joinCode, playersBySlot, otherHosts, refetchSession } =
    useGameSession({
      gameId: id,
      sessionIdParam,
      onPointsSync: handlePointsSync,
    });
  const assignedLabels = useMemo<PlayerLabel[]>(() => {
    const labels: PlayerLabel[] = [];
    if (playersBySlot[0]) labels.push("Left Player");
    if (playersBySlot[1]) labels.push("Center Player");
    if (playersBySlot[2]) labels.push("Right Player");
    return labels;
  }, [playersBySlot]);

  const [activeLabels, setActiveLabels] = useState<PlayerLabel[]>([
    "Left Player",
    "Right Player",
  ]);
  const [streamClockInput, setStreamClockInput] = useState("");
  const [streamPeriodInput, setStreamPeriodInput] = useState<number>(1);
  const [streamDelay, setStreamDelay] = useState<number>(0);
  const [testGameTimestamp, setTestGameTimestamp] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStreamSettings, setShowStreamSettings] = useState(false);

  const handleShotEvent = useCallback<ShotHandler>(
    (gameState, timestamp, isFromDelayedState) => {
      shotHandlerRef.current?.(gameState, timestamp, isFromDelayedState);
    },
    []
  );

  const {
    state,
    error,
    syncAnchor,
    syncedPeriod,
    streamGameClock,
    syncToClock,
  } = useGameStateFeed({
    gameId: id,
    isTestGame,
    isTest002,
    testGameTimestamp,
    streamDelay,
    onStateForShot: handleShotEvent,
  });

  const {
    showShotIncoming,
    shotCountdown,
    activeShotOdds,
    showShotResult,
    currentShotData,
    showMoneyRain,
    playerPointsDisplay,
    playerStreaks,
    showPointsEarned,
    pointsEarned,
    pointsEarnedLabel,
    registerPrediction,
    detectNewShot,
    runShotSequence,
  } = useShotExperience({
    gameId: id,
    isTestGame,
    syncAnchor,
    streamDelay,
    playersBySlot,
    activeLabels,
    gameSessionId,
    playSound,
    setPointsByPlayer,
  });

  useEffect(() => {
    shotHandlerRef.current = detectNewShot;
  }, [detectNewShot]);

  const triggerManualShotTest = useCallback(() => {
    const targetLabels =
      assignedLabels.length > 0
        ? assignedLabels
        : (["Left Player", "Right Player"] as PlayerLabel[]);
    const fakePeriod =
      typeof state?.period === "number"
        ? state.period
        : Number(state?.period) || 1;
    const fakeClock = state?.clock ?? "12:00";
    const fakeScore = state?.score ?? { home: 0, away: 0 };
    const fakeShotState: ParsedGameState = {
      period: fakePeriod,
      clock: fakeClock,
      score: fakeScore,
      homeTeam: state?.homeTeam,
      awayTeam: state?.awayTeam,
      shooter: null,
      ballHandler: null,
      lastAction: null,
      recentActions: [],
      players: state?.players ?? [],
      lastShot: {
        playerName: "Manual Tester",
        teamTricode: state?.homeTeam ?? "LAL",
        shotResult: "Made",
        shotType: "Layup",
        points: 2,
        playerId: "manual-shot",
      },
    };
    runShotSequence({
      lastShot: fakeShotState.lastShot,
      popupDelay: 0,
    });

    targetLabels.forEach((label, index) => {
      setTimeout(() => {
        registerPrediction(label, {
          ts: Date.now(),
          period: fakePeriod,
          clock: fakeClock,
          shotType: index === 0 ? "layup" : "normal",
        });
      }, 200 + index * 120);
    });
  }, [assignedLabels, registerPrediction, runShotSequence, state]);

  const handleShootGesture = useCallback(
    (label?: PlayerLabel, shotType?: ShotType) => {
      if (!label) return;
      registerPrediction(label, {
        ts: Date.now(),
        period: state?.period,
        clock: state?.clock,
        shotType: shotType ?? null,
      });
    },
    [registerPrediction, state]
  );

  useEffect(() => {
    if (!isTestGame) {
      setTestGameTimestamp(0);
    }
  }, [isTestGame]);

  const handleStreamSync = useCallback(() => {
    if (!streamClockInput) return;
    syncToClock(streamClockInput, streamPeriodInput);
  }, [streamClockInput, streamPeriodInput, syncToClock]);

  useEffect(() => {
    console.log("[DEBUG] Game ID:", id, "isTestGame:", isTestGame);
  }, [id, isTestGame]);

  const handleRemovePlayer = useCallback(
    async (slot: number) => {
      if (!gameSessionId) return;
      try {
        await fetch("/api/join/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameSessionId, slot }),
        });
        await refetchSession();
      } catch (err) {
        console.error("[JOIN CODE] Failed to remove player:", err);
      }
    },
    [gameSessionId, refetchSession]
  );

  const contextValue = useMemo<GameExperienceViewModel>(
    () => ({
      showMoneyRain,
      state,
      isTestGame,
      isTest002,
      testGameTimestamp,
      setTestGameTimestamp,
      joinCode,
      assignedLabels,
      playersBySlot,
      pointsByPlayer,
      playerPointsDisplay,
      playerStreaks,
      otherHosts,
      handleRemovePlayer,
      setActiveLabels,
      handleShootGesture,
      error,
      showShotIncoming,
      shotCountdown,
      activeShotOdds,
      showShotResult,
      currentShotData,
      showPointsEarned,
      pointsEarned,
      pointsEarnedLabel,
      showStreamSettings,
      setShowStreamSettings,
      streamDelay,
      setStreamDelay,
      streamClockInput,
      setStreamClockInput,
      streamPeriodInput,
      setStreamPeriodInput,
      handleStreamSync,
      syncAnchor,
      syncedPeriod,
      streamGameClock,
      showTutorial,
      setShowTutorial,
      triggerManualShotTest,
    }),
    [
      activeLabels,
      activeShotOdds,
      assignedLabels,
      currentShotData,
      error,
      handleRemovePlayer,
      handleShootGesture,
      handleStreamSync,
      isTestGame,
      isTest002,
      joinCode,
      otherHosts,
      playerPointsDisplay,
      playerStreaks,
      playersBySlot,
      pointsByPlayer,
      pointsEarned,
      pointsEarnedLabel,
      setActiveLabels,
      setShowStreamSettings,
      setShowTutorial,
      setStreamClockInput,
      setStreamDelay,
      setStreamPeriodInput,
      setTestGameTimestamp,
      showMoneyRain,
      showPointsEarned,
      showShotIncoming,
      showShotResult,
      showStreamSettings,
      showTutorial,
      shotCountdown,
      state,
      streamClockInput,
      streamDelay,
      streamGameClock,
      streamPeriodInput,
      syncAnchor,
      syncedPeriod,
      testGameTimestamp,
      triggerManualShotTest,
    ]
  );

  return (
    <GameExperienceProvider<GameExperienceViewModel> value={contextValue}>
      <GameExperienceLayout />
    </GameExperienceProvider>
  );
}

function GameExperienceLayout() {
  const {
    showMoneyRain,
    state,
    isTestGame,
    isTest002,
    testGameTimestamp,
    setTestGameTimestamp,
    joinCode,
    assignedLabels,
    playersBySlot,
    pointsByPlayer,
    playerPointsDisplay,
    playerStreaks,
    otherHosts,
    handleRemovePlayer,
    setActiveLabels,
    handleShootGesture,
    error,
    showShotIncoming,
    shotCountdown,
    activeShotOdds,
    showShotResult,
    currentShotData,
    showPointsEarned,
    pointsEarned,
    pointsEarnedLabel,
    showStreamSettings,
    setShowStreamSettings,
    streamDelay,
    setStreamDelay,
    streamClockInput,
    setStreamClockInput,
    streamPeriodInput,
    setStreamPeriodInput,
    handleStreamSync,
    syncAnchor,
    syncedPeriod,
    streamGameClock,
    showTutorial,
    setShowTutorial,
    triggerManualShotTest,
  } = useGameExperienceContext<GameExperienceViewModel>();

  const overlayDisplayNames: Partial<Record<PlayerLabel, string>> = {
    "Left Player": playersBySlot[0]?.name ?? "Left Player",
    "Center Player": playersBySlot[1]?.name ?? "Center Player",
    "Right Player": playersBySlot[2]?.name ?? "Right Player",
  };
  const labelToIndex = (label: PlayerLabel) =>
    label === "Left Player" ? 0 : label === "Center Player" ? 1 : 2;
  const activePlayers = PLAYER_LABELS.filter(
    (label) => playersBySlot[labelToIndex(label)] !== null
  );
  const overlayPlayers = activePlayers.map((label) => {
    const entry = playerPointsDisplay[label];
    return {
      label,
      points: entry.points,
      show: entry.show,
      basePoints: entry.basePoints,
      shotMultiplier: entry.shotMultiplier,
      streakMultiplier: entry.streakMultiplier,
      oddsMultiplier: entry.oddsMultiplier,
    };
  });
  const shouldShowMultiOverlay = overlayPlayers.length > 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050913] text-white">
      <div className="mlb-diamond-bg absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 opacity-65 mix-blend-screen">
        <div className="absolute -left-32 top-8 h-96 w-96 rotate-6 rounded-none bg-gradient-to-br from-emerald-500/25 via-emerald-400/15 to-transparent blur-[150px]" />
        <div className="absolute right-[-8%] bottom-0 h-96 w-96 -rotate-6 rounded-none bg-gradient-to-br from-purple-500/30 via-emerald-400/15 to-transparent blur-[160px]" />
      </div>
      <div className="mlb-highlight-sweep" />
      {showMoneyRain && (
        <div className="money-rain">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              ★
            </span>
          ))}
        </div>
      )}
      <div className="relative w-full px-6 pt-16 pb-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <GameSidebar
            state={state}
            isTestGame={isTestGame}
            testGameTimestamp={testGameTimestamp}
            onTestGameTimestampChange={setTestGameTimestamp}
            joinCode={joinCode}
            onOpenStreamSettings={() => setShowStreamSettings(true)}
          />

          <div className="flex flex-col">
            <GameCameraPanel
              assignedLabels={assignedLabels}
              playersBySlot={playersBySlot}
              pointsByPlayer={pointsByPlayer}
              playerPointsDisplay={playerPointsDisplay}
              playerStreaks={playerStreaks}
              otherHosts={otherHosts}
              onRemovePlayer={handleRemovePlayer}
              onActiveLabelsChange={setActiveLabels}
              onShootGesture={handleShootGesture}
            />
            {/* {isTest002 && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={triggerManualShotTest}
                  className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200 transition hover:border-emerald-300/70 hover:text-white"
                >
                  Simulate shot + points
                </button>
              </div>
            )} */}
            {error && (
              <div className="mt-4 rounded border border-purple-400/30 bg-black/60 p-3 text-xs text-purple-200">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <ShotIncomingOverlay
        show={showShotIncoming}
        countdown={shotCountdown}
        shotOdds={activeShotOdds}
      />
      <ShotResultOverlay show={showShotResult} shotData={currentShotData} />
      {shouldShowMultiOverlay && (
        <MultiPlayerPointsOverlay
          players={overlayPlayers}
          displayNames={overlayDisplayNames}
        />
      )}
      <PointsEarnedOverlay
        show={showPointsEarned}
        points={pointsEarned}
        label={pointsEarnedLabel ?? undefined}
      />
      <StreamSettingsModal
        open={showStreamSettings}
        streamDelay={streamDelay}
        onStreamDelayChange={setStreamDelay}
        streamClockInput={streamClockInput}
        onStreamClockChange={setStreamClockInput}
        streamPeriodInput={streamPeriodInput}
        onStreamPeriodChange={setStreamPeriodInput}
        onSync={() => {
          handleStreamSync();
          setShowStreamSettings(false);
        }}
        onClose={() => setShowStreamSettings(false)}
        isSynced={!!syncAnchor}
        syncedPeriod={syncedPeriod}
        streamGameClock={streamGameClock}
      />
      <TutorialOverlay
        show={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}

export default GameExperience;
