import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerLabel } from "@/components/game/constants";
import type { PlayerSlotMap } from "@/components/game/experience/types";
import type { OtherHostSession } from "@/components/game/experience/OtherHostsGrid";

const EMPTY_SLOTS: PlayerSlotMap = {
  0: null,
  1: null,
  2: null,
};

type UseGameSessionOptions = {
  gameId: string;
  sessionIdParam: string | null;
  onPointsSync: (points: Record<PlayerLabel, number>) => void;
};

export function useGameSession({
  gameId,
  sessionIdParam,
  onPointsSync,
}: UseGameSessionOptions) {
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [playersBySlot, setPlayersBySlot] = useState<PlayerSlotMap>(EMPTY_SLOTS);
  const [otherHosts, setOtherHosts] = useState<OtherHostSession[]>([]);

  const fetchSession = useCallback(async () => {
    try {
      const url = sessionIdParam
        ? `/api/game-session/${gameId}?sessionId=${encodeURIComponent(
            sessionIdParam
          )}`
        : `/api/game-session/${gameId}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        console.error("[JOIN CODE] API error:", data);
        return;
      }

      setGameSessionId(data.id ?? null);
      setJoinCode(data.joinCode ?? null);

      const nextSlots: PlayerSlotMap = { 0: null, 1: null, 2: null };
      const pointsInit: Record<PlayerLabel, number> = {
        "Left Player": 0,
        "Right Player": 0,
        "Center Player": 0,
      };

      (data.players ?? []).forEach((p: any) => {
        nextSlots[p.slot] = {
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
        };
        const pts = typeof p.points === "number" ? p.points : 0;
        if (p.slot === 0) pointsInit["Left Player"] = pts;
        if (p.slot === 1) pointsInit["Center Player"] = pts;
        if (p.slot === 2) pointsInit["Right Player"] = pts;
      });

      setPlayersBySlot(nextSlots);
      onPointsSync(pointsInit);

      try {
        const allRes = await fetch(`/api/game-session/${gameId}/all`, {
          cache: "no-store",
        });
        const allData = await allRes.json();
        if (allRes.ok && Array.isArray(allData.sessions)) {
          const others = allData.sessions.filter(
            (s: any) => s.id !== data.id
          );
          setOtherHosts(others);
        }
      } catch (err) {
        console.error("[JOIN CODE] Failed to fetch other hosts:", err);
      }
    } catch (err) {
      console.error("[JOIN CODE] Fetch error:", err);
    }
  }, [gameId, sessionIdParam, onPointsSync]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const run = async () => {
      if (cancelled) return;
      await fetchSession();
    };
    run();
    timer = setInterval(run, 3000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [fetchSession]);

  return {
    gameSessionId,
    joinCode,
    playersBySlot,
    otherHosts,
    refetchSession: fetchSession,
  };
}
