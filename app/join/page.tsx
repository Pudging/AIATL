"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [code]);

  if (status === "loading") {
    return <div className="mt-28 text-center">Loading…</div>;
  }

  if (!session?.user) {
    return (
      <div className="mx-auto mt-28 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="mb-4">Please sign in to join a game.</p>
        <button
          onClick={() => signIn(undefined, { callbackUrl: "/join" })}
          className="rounded bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-emerald-950"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-28 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={64}
          height={64}
          className="object-contain"
        />
      </div>
      <h1 className="mb-4 text-xl font-bold">Join a Game</h1>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setJoining(true);
          setMessage(null);
          try {
            const res = await fetch("/api/join", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.error || "Failed to join");
            }
            setMessage(
              `Joined! You're in slot ${data.assignment?.slot + 1}. Game: ${
                data.gameId
              }`
            );
          } catch (err: any) {
            setMessage(err.message || "Failed to join");
          } finally {
            setJoining(false);
          }
        }}
      >
        <input
          inputMode="text"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter join code (e.g. ABC123)"
          className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
          required
          maxLength={6}
        />
        <button
          type="submit"
          disabled={joining}
          className="rounded bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50"
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </form>
      {message && <div className="mt-3 text-sm opacity-80">{message}</div>}
    </div>
  );
}
