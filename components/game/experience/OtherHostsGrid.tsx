type OtherHostPlayer = {
  slot: number;
  points: number;
  user: { id: string; name: string | null; image: string | null };
};

export type OtherHostSession = {
  id: string;
  joinCode: string;
  hostName: string | null;
  players: OtherHostPlayer[];
};

type OtherHostsGridProps = {
  hosts: OtherHostSession[];
};

export function OtherHostsGrid({ hosts }: OtherHostsGridProps) {
  const filteredHosts = hosts.filter(
    (host) => host.hostName || host.players.length > 0
  );
  if (filteredHosts.length === 0) return null;

  return (
    <div className="mt-4 w-full max-w-7xl mx-auto px-2">
      <div className="mb-2 text-xs uppercase tracking-[0.35em] text-white/60">
        Other Hosts
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredHosts.map((host) => (
          <div
            key={host.id}
            className="rounded-xl border border-white/10 bg-black/35 p-3 relative"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-white">
                  {host.hostName ?? "Anonymous Host"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/50">
                  Join: {host.joinCode}
                </div>
              </div>
            </div>
            {host.players.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {host.players.map((player) => (
                  <div
                    key={`${host.id}-${player.slot}`}
                    className="flex-1 min-w-[130px] rounded border border-white/10 bg-[#0d1b31] px-3 py-2"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
                      {player.user.id ? (
                        <a
                          href={`/stats?userId=${player.user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-emerald-300 transition"
                        >
                          {player.user.name ?? `Player ${player.slot + 1}`}
                        </a>
                      ) : (
                        player.user.name ?? `Player ${player.slot + 1}`
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-black text-white">
                      {player.points.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">No players yet</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
