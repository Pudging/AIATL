"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";

export default function JoinPage() {
  const router = useRouter();
  const { status } = useSession();
  const [code, setCode] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedSlot, setJoinedSlot] = useState<number | null>(null);
  const [joinedGameId, setJoinedGameId] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [code]);

  const submitJoin = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setJoinedSlot(null);
    setJoinedGameId(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(
          data?.error ?? "Failed to join. Check the code and try again."
        );
        setSubmitting(false);
        return null;
      }
      const slot: number | undefined = data.assignment?.slot;
      const gameId: string | undefined = data.gameId;
      const gameSessionId: string | undefined = data.gameSessionId;
      if (typeof slot !== "number" || !gameId) {
        setError("Unexpected response from server.");
        setSubmitting(false);
        return null;
      }
      setJoinedSlot(slot);
      setJoinedGameId(gameId);
      setSubmitting(false);
      return { slot, gameId, gameSessionId };
    } catch (e) {
      setError("Network error. Please try again.");
      setSubmitting(false);
      return null;
    }
  }, [code]);

  const onJoinInPerson = useCallback(async () => {
    const result = await submitJoin();
    if (!result) return;
    // Do not navigate; host display will update. Show success UI locally.
  }, [submitJoin]);

  const onJoinRemotely = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Resolve code to gameId without adding as player
      const res = await fetch(
        `/api/join/resolve?code=${encodeURIComponent(code)}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.gameId) {
        setError(data?.error ?? "Could not resolve code. Check and try again.");
        setSubmitting(false);
        return;
      }
      // Navigate without sessionId so this device becomes its own host
      router.push(`/game/${data.gameId}`);
    } catch (e) {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }, [code, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-6 pt-24 text-center text-white">
        <div className="text-sm opacity-70">Loading…</div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-md px-6 pt-24 text-center text-white">
        <div className="mb-4 text-lg font-semibold">Sign in to Join</div>
        <button
          onClick={() => signIn("google")}
          className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 opacity-55">
        <div className="absolute -left-24 top-8 h-96 w-96 rotate-6 rounded-full bg-gradient-to-br from-emerald-300/40 via-emerald-500/20 to-transparent blur-[140px]" />
        <div className="absolute right-[-8%] bottom-0 h-96 w-96 -rotate-6 rounded-full bg-gradient-to-br from-purple-500/30 via-emerald-400/20 to-transparent blur-[150px]" />
      </div>
      <div className="relative mx-auto w-full max-w-lg px-6 pt-28 pb-16 sm:px-6">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={64}
            height={64}
            className="object-contain"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/45 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
          <div className="mb-4 text-center text-lg font-semibold">
            Join a Game
          </div>
          <label className="mb-2 block text-xs uppercase tracking-[0.35em] text-white/70">
            Join Code
          </label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mb-4 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
          />
          {error && (
            <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          {joinedSlot !== null && (
            <div className="mb-4 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              Joined slot {joinedSlot + 1}. Ask the host to verify your name.
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              disabled={!code || submitting}
              onClick={onJoinInPerson}
              className="flex-1 rounded bg-emerald-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-inset ring-emerald-400/40 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Join In Person
            </button>
            <button
              disabled={!code || submitting}
              onClick={onJoinRemotely}
              className="flex-1 rounded bg-purple-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-purple-200 ring-1 ring-inset ring-purple-400/40 hover:bg-purple-500/30 disabled:opacity-50"
            >
              Join Remotely
            </button>
          </div>
          <div className="mt-4 text-center text-[10px] uppercase tracking-[0.35em] text-white/50">
            Joining requires Google sign-in
          </div>
        </div>
      </div>
    </div>
  );
}
