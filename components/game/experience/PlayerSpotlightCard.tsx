import type { ParsedGameState } from "@/components/types";

type PlayerSpotlightCardProps = {
  player?: ParsedGameState["ballHandler"] | null;
};

export function PlayerSpotlightCard({ player }: PlayerSpotlightCardProps) {
  if (!player) return null;

  const stats = player.liveStats;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#1a1d29] p-4 shadow-lg border-l-2 border-l-green-500 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {player.name && (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-500/50 bg-[#0f1419]">
              <img
                src={
                  player.personId
                    ? `https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`
                    : `https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(
                        player.name
                      )}`
                }
                alt={player.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  const parent = event.currentTarget.parentElement;
                  if (parent && player?.name) {
                    event.currentTarget.style.display = "none";
                    const initials = player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const fallback = document.createElement("div");
                    fallback.className =
                      "absolute inset-0 flex items-center justify-center text-2xl font-black text-emerald-300";
                    fallback.textContent = initials;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Featured Player
            </div>
            <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-white">
              <span className="text-flash" key={player.name ?? "unknown"}>
                {player.name ?? "Unknown"}
              </span>
              <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                {player.teamTricode ?? "LAD"}
              </span>
            </div>
          </div>
        </div>
      </div>
      {stats ? (
        <div className="mt-4 grid grid-cols-5 gap-3 text-center text-xs uppercase tracking-[0.25em] text-slate-200">
          {[
            {
              label: "PTS",
              value: stats.points ?? 0,
              color: "text-sky-300",
              borderColor: "border-sky-400/40",
            },
            {
              label: "FG",
              value: `${stats.fieldGoalsMade ?? 0}/${stats.fieldGoalsAttempted ?? 0}`,
              color: "text-orange-300",
              borderColor: "border-orange-400/40",
            },
            {
              label: "3PT",
              value: `${stats.threePointersMade ?? 0}/${stats.threePointersAttempted ?? 0}`,
              color: "text-rose-300",
              borderColor: "border-rose-400/40",
            },
            {
              label: "REB",
              value: stats.rebounds ?? 0,
              color: "text-emerald-300",
              borderColor: "border-emerald-400/40",
            },
            {
              label: "AST",
              value: stats.assists ?? 0,
              color: "text-purple-300",
              borderColor: "border-purple-400/40",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
            >
              <div>{stat.label}</div>
              <div
                className="mt-2 text-lg font-black tracking-normal text-white text-flash"
                key={String(stat.value)}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 border border-white/10 bg-[#101d35] px-3 py-2 text-xs text-slate-300/80">
          Tracking player metrics…
        </div>
      )}
    </div>
  );
}
