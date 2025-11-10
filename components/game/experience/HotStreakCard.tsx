import type { ParsedGameState } from "@/components/types";

type HotStreakCardProps = {
  shooter?: ParsedGameState["shooter"] | null;
};

export function HotStreakCard({ shooter }: HotStreakCardProps) {
  if (!shooter) return null;

  const stats = shooter.liveStats;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-[#1a1d29] p-4 shadow-lg border-l-4 border-l-red-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {shooter.name && (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-red-500/50 bg-[#0f1419]">
              <img
                src={
                  shooter.personId
                    ? `https://cdn.nba.com/headshots/nba/latest/260x190/${shooter.personId}.png`
                    : `https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(
                        shooter.name
                      )}`
                }
                alt={shooter.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  const parent = event.currentTarget.parentElement;
                  if (parent && shooter?.name) {
                    event.currentTarget.style.display = "none";
                    const initials = shooter.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const fallback = document.createElement("div");
                    fallback.className =
                      "absolute inset-0 flex items-center justify-center text-2xl font-black text-purple-300";
                    fallback.textContent = initials;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hot Streak Watch
            </div>
            <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-white">
              <span className="text-flash" key={shooter.name ?? "unknown"}>
                {shooter.name ?? "Unknown"}
              </span>
              <span className="rounded-md bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 border border-red-500/30">
                {shooter.teamTricode ?? "ATL"}
              </span>
            </div>
            {shooter.result && (
              <div className="mt-1 inline-flex items-center gap-2 border border-white/10 bg-[#121f36] px-3 py-1 text-xs text-slate-200">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-purple-300"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5 21v-2h14v2Zm7-2q-2.075 0-3.537-1.462Q7 16.075 7 14q0-.9.438-1.913.437-1.012 1.462-2.087 1.025-1.075 1.562-1.725Q11 7.625 11 7t-.275-1.463Q10.45 4.075 9.5 3.1q1.825.175 3.125 1.7 1.3 1.525 1.3 3.575 0 1.175-.563 2.213-.562 1.037-1.562 2.037l-.8.775h3.3L12 17l1.5 1.5Z" />
                </svg>
                {shooter.result}
              </div>
            )}
          </div>
        </div>
      </div>
      {stats ? (
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs uppercase tracking-[0.25em] text-slate-300">
          {[
            {
              label: "PTS",
              value: stats.points ?? 0,
              color: "text-amber-300",
              borderColor: "border-amber-400/40",
            },
            {
              label: "FG",
              value: `${stats.fieldGoalsMade ?? 0}/${stats.fieldGoalsAttempted ?? 0}`,
              color: "text-pink-300",
              borderColor: "border-pink-400/40",
            },
            {
              label: "3PT",
              value: `${stats.threePointersMade ?? 0}/${stats.threePointersAttempted ?? 0}`,
              color: "text-cyan-300",
              borderColor: "border-cyan-400/40",
            },
            {
              label: "REB",
              value: stats.rebounds ?? 0,
              color: "text-lime-300",
              borderColor: "border-lime-400/40",
            },
            {
              label: "AST",
              value: stats.assists ?? 0,
              color: "text-violet-300",
              borderColor: "border-violet-400/40",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
            >
              <div>{stat.label}</div>
              <div
                className="mt-1 text-lg font-black tracking-normal text-white text-flash"
                key={String(stat.value)}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 border border-white/10 bg-[#131f35] px-3 py-2 text-xs text-slate-400">
          Tracking player metrics…
        </div>
      )}
    </div>
  );
}
