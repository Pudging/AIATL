"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SimplifiedGame } from "@/components/types";

const brandPalette = {
  deep: "#010c07",
  emerald: "#49e6b5",
  emeraldDark: "#0b5f4a",
  midnight: "#02170f",
  purple: "#a855f7",
};

const formatGameClock = (clock?: string | null) => {
  if (!clock) return "—";
  if (clock === "0" || clock === "PT0S") return "00:00";
  const iso = clock.startsWith("PT") ? clock.slice(2) : clock;
  const minutesMatch = (iso ?? "").match(/(\d+)M/);
  const secondsMatch = (iso ?? "").match(/(\d+(\.\d+)?)S/);
  const minutes = minutesMatch?.[1] ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch?.[1]
    ? Math.floor(parseFloat(secondsMatch[1]))
    : 0;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
};

const getClockLabel = (game: SimplifiedGame) => {
  const status = game.statusText?.toLowerCase() ?? "";
  if (!game.gameClock || status.includes("final") || status.includes("end")) {
    return status ? status.toUpperCase() : "FINAL";
  }
  return formatGameClock(game.gameClock);
};

const LoadingState = () => (
  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/5 p-6 text-center text-slate-200">
    <div className="text-sm uppercase tracking-[0.4em] text-emerald-300">
      Live board updating
    </div>
    <p className="mt-3 text-lg font-semibold text-white/90">
      Pulling the latest games…
    </p>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-center text-red-200">
    <p className="font-semibold">{message}</p>
    <p className="text-sm text-red-300">Try refreshing in a few seconds.</p>
  </div>
);

export default function HomePage() {
  const [games, setGames] = useState<SimplifiedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/games", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setGames(data.games ?? []);
        setError(null);
      } catch {
        if (active) setError("Failed to load games");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const testGame: SimplifiedGame = {
    id: "test001",
    status: 2,
    statusText: "TEST GAME",
    period: 2,
    gameClock: "PT05M23.00S",
    home: {
      name: "Lakers",
      tricode: "LAL",
      id: 1610612747,
      score: 58,
      logo: "https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg",
    },
    away: {
      name: "Celtics",
      tricode: "BOS",
      id: 1610612738,
      score: 62,
      logo: "https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg",
    },
  };
  
  const testGame2: SimplifiedGame = {
    id: "test002",
    status: 2,
    statusText: "PLAYOFF GAME (REAL DATA)",
    period: 4,
    gameClock: "PT00M23.80S",
    home: {
      name: "Knicks",
      tricode: "NYK",
      id: 1610612752,
      score: 123,
      logo: "https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg",
    },
    away: {
      name: "Pistons",
      tricode: "DET",
      id: 1610612765,
      score: 112,
      logo: "https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg",
    },
  };

  const allGames = games.length > 0 ? games : [testGame, testGame2];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-black text-white"
      style={{
        background: `
          radial-gradient(circle at 20% -10%, rgba(73, 230, 181, 0.5), transparent 60%),
          radial-gradient(circle at 78% 0%, rgba(168, 85, 247, 0.3), transparent 65%),
          radial-gradient(circle at 50% 120%, rgba(73, 230, 181, 0.18), transparent 62%),
          linear-gradient(125deg, rgba(9, 48, 38, 0.92), rgba(27, 8, 34, 0.94)),
          ${brandPalette.midnight},
          ${brandPalette.deep}
        `,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-32 top-12 h-80 w-80 rotate-6 rounded-full bg-gradient-to-br from-emerald-300/60 via-emerald-500/30 to-transparent blur-[120px]" />
        <div className="absolute right-[-5%] bottom-4 h-96 w-96 -rotate-6 rounded-full bg-gradient-to-br from-purple-500/35 via-emerald-400/20 to-transparent blur-[140px]" />
      </div>
      <div className="relative mx-auto mt-8 flex w-full flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <section className="relative overflow-hidden rounded-[36px] border border-emerald-500/30 bg-gradient-to-r from-[#022d20] via-[#052017] to-[#0b1113] p-10 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.6em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              NBA Gesture Predictor
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                A green-room radar for who&apos;s about to rise.
              </h1>
              <p className="mt-3 max-w-2xl text-base text-emerald-100/90">
                We fuse pose detection with live box scores to surface which
                players are most likely to fire next. Dial in on the best spots,
                then run with confidence.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/60 via-black/30 to-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.5em] text-emerald-200">
                  Hit rate
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-300">82%</p>
                <p className="text-xs text-emerald-100/70">
                  Last 40 tracked shots
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/50 via-black/30 to-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.5em] text-purple-200">
                  Live props
                </p>
                <p className="mt-2 text-3xl font-black text-purple-200">17</p>
                <p className="text-xs text-purple-100/70">
                  Games with active intel
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/40 via-black/25 to-black/5 p-4">
                <p className="text-xs uppercase tracking-[0.5em] text-purple-200">
                  Response
                </p>
                <p className="mt-2 text-3xl font-black text-purple-200">
                  220ms
                </p>
                <p className="text-xs text-purple-100/70">
                  Avg model reaction time
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 right-0 flex translate-x-10 items-center opacity-60">
              <div className="h-60 w-60 rounded-full bg-emerald-400/35 blur-3xl" />
              <div className="ml-[-3rem] h-44 w-44 rounded-full bg-purple-500/30 blur-3xl" />
            </div>
            <div className="absolute -top-10 left-1/3 h-36 w-36 rotate-12 rounded-full bg-purple-500/25 blur-[50px]" />
          </div>
        </section>

        {loading && <LoadingState />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && games.length === 0 && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            No live games right now. We dropped in a test matchup so you can
            still preview the experience.
          </div>
        )}

        {!loading && !error && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-emerald-200">
                  Live slips
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Tonight&apos;s board
                </h2>
              </div>
              <span className="text-sm text-emerald-200/80">
                Auto-refreshing every 10s
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {allGames.map((g) => (
                <Link
                  key={g.id}
                  href={`/game/${g.id}`}
                  className="group rounded-3xl border border-white/5 bg-gradient-to-br from-[#04150f]/80 via-[#120b1a]/70 to-[#1b0f24]/80 p-5 shadow-lg shadow-black/50 ring-1 ring-emerald-500/10 transition hover:-translate-y-1 hover:border-emerald-400/70 hover:ring-purple-400/40"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-emerald-200">
                    <span>{g.statusText}</span>
                    <span className="text-purple-200">{getClockLabel(g)}</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-4">
                    {[g.away, g.home].map((team) => (
                      <div key={team.id} className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 via-purple-500/25 to-emerald-400/15">
                          <img
                            src={team.logo}
                            alt={team.tricode}
                            className="h-8 w-8 object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-white">
                              {team.tricode}
                            </span>
                            <span className="font-mono text-xl text-emerald-200 group-hover:text-purple-200">
                              {team.score}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{team.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Period <strong className="text-white">{g.period}</strong>
                    </span>
                    <span className="text-purple-200">Tap to drill in</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
