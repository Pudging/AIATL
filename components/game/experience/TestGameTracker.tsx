type TestGameTrackerProps = {
  value: number;
  max?: number;
  onChange: (nextValue: number) => void;
};

export function TestGameTracker({
  value,
  max = 6,
  onChange,
}: TestGameTrackerProps) {
  return (
    <div className="relative overflow-hidden border border-purple-500/30 bg-[#111d33] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-purple-300">
          Live Play Tracker
        </span>
        <span className="text-xs font-bold text-emerald-300">
          Pitch {value + 1}/{max + 1}
        </span>
      </div>
      <div className="relative mt-6">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mlb-range w-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-[2px] pt-3.5">
          {Array.from({ length: max + 1 }).map((_, index) => (
            <svg
              key={index}
              aria-hidden="true"
              className={`h-4 w-4 ${
                index <= value ? "text-emerald-300" : "text-purple-500/40"
              }`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2a9 9 0 1 0 9 9A9 9 0 0 0 12 2Zm0 2.5a6.5 6.5 0 0 1 6.46 6h-4.21a2.29 2.29 0 0 0-2.25-1.88 2.31 2.31 0 0 0-2.26 1.88H5.54A6.5 6.5 0 0 1 12 4.5Zm0 13a6.47 6.47 0 0 1-6.42-5.5h4.21a2.3 2.3 0 0 0 2.21 1.87 2.3 2.3 0 0 0 2.21-1.87h4.21A6.47 6.47 0 0 1 12 17.5Z" />
            </svg>
          ))}
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-300/90">
        Scrub through play-by-play to watch pitch detection and live odds
        swings.
      </div>
    </div>
  );
}
