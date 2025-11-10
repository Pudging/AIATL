type StreamSettingsModalProps = {
  open: boolean;
  streamDelay: number;
  onStreamDelayChange: (value: number) => void;
  streamClockInput: string;
  onStreamClockChange: (value: string) => void;
  streamPeriodInput: number;
  onStreamPeriodChange: (value: number) => void;
  onSync: () => void;
  onClose: () => void;
  isSynced: boolean;
  syncedPeriod: number;
  streamGameClock: string;
};

export function StreamSettingsModal({
  open,
  streamDelay,
  onStreamDelayChange,
  streamClockInput,
  onStreamClockChange,
  streamPeriodInput,
  onStreamPeriodChange,
  onSync,
  onClose,
  isSynced,
  syncedPeriod,
  streamGameClock,
}: StreamSettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-emerald-400/30 bg-[#0b1527] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Stream Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-300">
              <span>Speed Up Playback</span>
              <span>{streamDelay}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={streamDelay}
              onChange={(event) => onStreamDelayChange(Number(event.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded bg-white/10 accent-emerald-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              Reduce delay by {streamDelay}s. Popups appear {streamDelay + 3}s before your stream.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-300">
              Sync To Game Clock
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="MM:SS"
                value={streamClockInput}
                onChange={(event) => onStreamClockChange(event.target.value)}
                className="flex-1 rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 border border-white/20 focus:border-emerald-400 focus:outline-none"
              />
              <input
                type="number"
                min="1"
                max="4"
                placeholder="Period"
                value={streamPeriodInput}
                onChange={(event) => onStreamPeriodChange(Number(event.target.value))}
                className="w-24 rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 border border-white/20 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onSync}
              className="w-full rounded bg-gradient-to-r from-emerald-500 to-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110"
            >
              Sync Now
            </button>
            {isSynced && (
              <div className="text-xs text-emerald-200/70">
                Synced to Period {syncedPeriod} • {streamGameClock}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
