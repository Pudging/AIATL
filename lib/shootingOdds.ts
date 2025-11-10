import playerStats from "@/player_stats.json";

type PlayerShootingStats = {
  PLAYER_ID?: number | null;
  PLAYER_NAME: string;
  FG_PCT?: number | null;
  FG3_PCT?: number | null;
};

type ShootingSplits = {
  fgPct?: number;
  fg3Pct?: number;
};

export type ShootingOddsMeta = {
  rewardMultiplier: number;
  lossMultiplier: number;
  percentage: number | null;
  statLabel: "FG%" | "3P%" | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, t: number) =>
  start + (end - start) * t;

const sanitizePlayerName = (name?: string | null) =>
  name?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? null;

const playerShootingLookup: Map<string, ShootingSplits> = (() => {
  const map = new Map<string, ShootingSplits>();
  (playerStats as PlayerShootingStats[]).forEach((player) => {
    const key = sanitizePlayerName(player.PLAYER_NAME);
    const entry: ShootingSplits = {
      fgPct:
        typeof player.FG_PCT === "number"
          ? player.FG_PCT ?? undefined
          : undefined,
      fg3Pct:
        typeof player.FG3_PCT === "number"
          ? player.FG3_PCT ?? undefined
          : undefined,
    };
    if (key) {
      map.set(key, entry);
    }
  });
  return map;
})();

const playerShootingLookupById: Map<string, ShootingSplits> = (() => {
  const map = new Map<string, ShootingSplits>();
  (playerStats as PlayerShootingStats[]).forEach((player) => {
    if (typeof player.PLAYER_ID !== "number") return;
    const entry: ShootingSplits = {
      fgPct:
        typeof player.FG_PCT === "number"
          ? player.FG_PCT ?? undefined
          : undefined,
      fg3Pct:
        typeof player.FG3_PCT === "number"
          ? player.FG3_PCT ?? undefined
          : undefined,
    };
    map.set(String(player.PLAYER_ID), entry);
  });
  return map;
})();

function getPlayerShootingSplits(
  playerId?: string | number | null,
  playerName?: string | null
) {
  if (playerId != null) {
    const entry =
      playerShootingLookupById.get(String(playerId)) ??
      playerShootingLookup.get(sanitizePlayerName(playerName) ?? "");
    if (entry) return entry;
  }
  if (!playerName) return null;
  const key = sanitizePlayerName(playerName);
  if (!key) return null;
  return playerShootingLookup.get(key) ?? null;
}

function getPlayerShootingPercentage(
  playerName: string | null | undefined,
  isThreePointShot: boolean,
  playerId?: string | number | null
): { value: number | null; statLabel: "FG%" | "3P%" | null } {
  const splits = getPlayerShootingSplits(playerId, playerName);
  if (!splits) return { value: null, statLabel: null };

  if (isThreePointShot && typeof splits.fg3Pct === "number") {
    return { value: splits.fg3Pct, statLabel: "3P%" };
  }
  if (!isThreePointShot && typeof splits.fgPct === "number") {
    return { value: splits.fgPct, statLabel: "FG%" };
  }
  if (typeof splits.fgPct === "number") {
    return { value: splits.fgPct, statLabel: "FG%" };
  }
  if (typeof splits.fg3Pct === "number") {
    return { value: splits.fg3Pct, statLabel: "3P%" };
  }
  return { value: null, statLabel: null };
}

function getDirectionalRewardLoss(
  pct: number,
  isThreePointShot: boolean
): { reward: number; loss: number } {
  const minPct = isThreePointShot ? 0.22 : 0.4;
  const maxPct = isThreePointShot ? 0.45 : 0.65;
  const clampedPct = clamp(pct, minPct, maxPct);
  const normalized = (clampedPct - minPct) / Math.max(0.0001, maxPct - minPct);
  const bias = normalized - 0.35; // negative = inefficient shooter

  let reward: number;
  let loss: number;

  if (bias >= 0) {
    reward = lerp(isThreePointShot ? 1.05 : 1.0, 0.8, Math.min(bias * 1.2, 1));
    loss = lerp(isThreePointShot ? 1.7 : 1.5, 2.4, Math.min(bias * 1.1, 1));
  } else {
    const easyBias = Math.min(Math.abs(bias) * 1.3, 1);
    reward = lerp(isThreePointShot ? 1.4 : 1.3, 2.4, easyBias);
    loss = lerp(isThreePointShot ? 1.0 : 0.95, 0.6, easyBias);
  }

  return {
    reward: Number(clamp(reward, 0.8, 2.4).toFixed(2)),
    loss: Number(clamp(loss, 0.6, 2.4).toFixed(2)),
  };
}

export function getPlayerShootingDifficulty(
  playerName: string | null | undefined,
  isThreePointShot: boolean,
  playerId?: string | number | null
): ShootingOddsMeta {
  const { value, statLabel } = getPlayerShootingPercentage(
    playerName,
    isThreePointShot,
    playerId
  );

  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return {
      rewardMultiplier: 1,
      lossMultiplier: 1,
      percentage: null,
      statLabel: null,
    };
  }

  const { reward, loss } = getDirectionalRewardLoss(value, isThreePointShot);

  return {
    rewardMultiplier: reward,
    lossMultiplier: loss,
    percentage: value,
    statLabel,
  };
}
