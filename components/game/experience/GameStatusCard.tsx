import { formatClock } from "@/lib/gameClock";

type GameStatusCardProps = {
  period?: number | string | null;
  clock?: string | null;
  score?: { home?: number | null; away?: number | null } | null;
  onStreamSettings: () => void;
};

export function GameStatusCard({
  period,
  clock,
  score,
  onStreamSettings,
}: GameStatusCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
            Game Status
          </div>
          <div className="text-2xl font-bold text-white flex flex-wrap items-center gap-4">
            <span>
              Period {period ?? "-"} • {formatClock(clock ?? "")}
            </span>
            <span className="text-base font-semibold text-white/80 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="uppercase text-[10px] tracking-[0.4em] text-emerald-200/80">
                  Away
                </span>
                <span className="text-2xl font-black text-white">
                  {score?.away ?? 0}
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
                /
              </span>
              <span className="flex items-center gap-1 text-purple-100">
                <span className="uppercase text-[10px] tracking-[0.4em] text-purple-200/80">
                  Home
                </span>
                <span className="text-2xl font-black text-white">
                  {score?.home ?? 0}
                </span>
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onStreamSettings}
          className="rounded-full border border-emerald-400/50 bg-black/40 px-4 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:border-emerald-200 hover:text-white"
        >
          Stream Settings
        </button>
      </div>
    </div>
  );
}
