import type { ParsedGameState } from "@/components/types";

type LastShotCardProps = {
  lastShot?: ParsedGameState["lastShot"] | null;
};

export function LastShotCard({ lastShot }: LastShotCardProps) {
  if (!lastShot?.playerName) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-gradient-to-r from-emerald-500/15 to-purple-500/20 px-3 py-2 text-left">
      <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-200/80">
        Last Shot
      </div>
      <div className="text-base font-semibold text-white">
        {lastShot.playerName}
        {lastShot.teamTricode && (
          <span className="ml-2 text-sm opacity-75">({lastShot.teamTricode})</span>
        )}
      </div>
      <div className="text-xs text-emerald-100/70">
        {lastShot.shotResult ?? "Live update"}
      </div>
    </div>
  );
}
