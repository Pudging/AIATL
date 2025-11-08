"use client";

import { signIn, signOut } from "next-auth/react";
import Image from "next/image";

type Props = {
  session: any;
};

export function SignInOut({ session }: Props) {
  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-emerald-200 hover:border-emerald-300/60"
      >
        Sign In
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "Avatar"}
          width={18}
          height={18}
          className="rounded-full"
        />
      ) : null}
      <span className="text-xs opacity-80">{session.user.name ?? "You"}</span>
      <button
        onClick={() => signOut()}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-emerald-200 hover:border-emerald-300/60"
      >
        Sign Out
      </button>
    </div>
  );
}
