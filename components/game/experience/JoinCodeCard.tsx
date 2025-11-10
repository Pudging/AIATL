type JoinCodeCardProps = {
  joinCode: string | null;
};

export function JoinCodeCard({ joinCode }: JoinCodeCardProps) {
  return (
    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/80">
          Join Code
        </span>
        {joinCode && (
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(joinCode);
              } catch {
                /* no-op */
              }
            }}
            className="rounded bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-200 hover:bg-emerald-500/30 transition"
          >
            Copy
          </button>
        )}
      </div>
      <div className="text-4xl font-mono font-bold text-emerald-300">
        {joinCode ?? "Loading..."}
      </div>
      <div className="text-xs text-emerald-200/70">
        Share this code with players to join the lobby.
      </div>
    </div>
  );
}
