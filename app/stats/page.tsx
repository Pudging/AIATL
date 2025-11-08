"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type PlayerStats = {
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  overall: {
    totalShots: number;
    made: number;
    missed: number;
    accuracy: number;
    gestureAccuracy: number;
    typeAccuracy: number;
  };
  games: Array<{
    gameId: string;
    totalShots: number;
    made: number;
    missed: number;
    accuracy: number;
    totalPoints: number;
    lastPlayed: string;
  }>;
};

type Player = {
  id: string;
  name: string;
  image: string | null;
  shotCount: number;
};

export default function StatsPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch list of players
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch("/api/stats/players", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setPlayers(data.players ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch players:", err);
      }
    }
    fetchPlayers();
  }, []);

  // Fetch stats for selected user
  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/stats?userId=${encodeURIComponent(userId ?? "")}`,
          {
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (res.ok) {
          setStats(data);
        } else {
          setError(data.error ?? "Failed to load stats");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [userId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050913] text-white">
      <div className="mlb-diamond-bg absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 opacity-65 mix-blend-screen">
        <div className="absolute -left-32 top-8 h-96 w-96 rotate-6 rounded-none bg-gradient-to-br from-emerald-500/25 via-emerald-400/15 to-transparent blur-[150px]" />
        <div className="absolute right-[-8%] bottom-0 h-96 w-96 -rotate-6 rounded-none bg-gradient-to-br from-purple-500/30 via-emerald-400/15 to-transparent blur-[160px]" />
      </div>

      <div className="relative w-full px-6 pt-24 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
            >
              ← Back to Games
            </Link>
          </div>

          <h1 className="mb-8 text-4xl font-black tracking-tight text-white">
            Player Statistics
          </h1>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Player List */}
            <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-4 shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Players
              </h2>
              <div className="space-y-2">
                {players.length === 0 ? (
                  <div className="text-sm text-white/40">No players yet</div>
                ) : (
                  players.map((player) => (
                    <Link
                      key={player.id}
                      href={`/stats?userId=${player.id}`}
                      className={`block rounded-lg border p-3 transition ${
                        userId === player.id
                          ? "border-emerald-400/50 bg-emerald-500/10"
                          : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {player.image ? (
                          <Image
                            src={player.image}
                            alt={player.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {player.name}
                          </div>
                          <div className="text-xs text-white/50">
                            {player.shotCount} shots
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Stats Display */}
            <div className="space-y-6">
              {!userId ? (
                <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-8 text-center shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                  <div className="text-white/60">
                    Select a player to view their stats
                  </div>
                </div>
              ) : loading ? (
                <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-8 text-center shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                  <div className="text-white/60">Loading...</div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                  <div className="text-red-200">{error}</div>
                </div>
              ) : stats ? (
                <>
                  {/* Player Header */}
                  <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                    <div className="flex items-center gap-4">
                      {stats.user.image ? (
                        <Image
                          src={stats.user.image}
                          alt={stats.user.name}
                          width={64}
                          height={64}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
                          {stats.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {stats.user.name}
                        </h2>
                        <div className="text-sm text-white/60">
                          {stats.overall.totalShots} total shots
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Stats */}
                  <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
                      Overall Performance
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
                        <div className="text-3xl font-black text-emerald-300">
                          {stats.overall.accuracy.toFixed(1)}%
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wider text-white/60">
                          Shot Accuracy
                        </div>
                        <div className="mt-2 text-xs text-white/40">
                          {stats.overall.made} / {stats.overall.totalShots}
                        </div>
                      </div>
                      <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 text-center">
                        <div className="text-3xl font-black text-blue-300">
                          {stats.overall.typeAccuracy.toFixed(1)}%
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wider text-white/60">
                          Type Prediction
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Game Breakdown */}
                  <div className="rounded-xl border border-[#1f364d] bg-[#0b1426] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.65)]">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
                      Game Breakdown
                    </h3>
                    {stats.games.length === 0 ? (
                      <div className="text-sm text-white/40">No games yet</div>
                    ) : (
                      <div className="space-y-3">
                        {stats.games.map((game) => (
                          <div
                            key={game.gameId}
                            className="rounded-lg border border-white/10 bg-black/30 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="font-mono text-sm text-white">
                                {game.gameId}
                              </div>
                              <div className="text-xs text-white/50">
                                {new Date(game.lastPlayed).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div>
                                <div className="text-lg font-bold text-emerald-300">
                                  {game.accuracy.toFixed(1)}%
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-white/50">
                                  Accuracy
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-white">
                                  {game.totalShots}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-white/50">
                                  Shots
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-green-400">
                                  {game.made}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-white/50">
                                  Made
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-purple-300">
                                  {game.totalPoints.toLocaleString()}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-white/50">
                                  Points
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
