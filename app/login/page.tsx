"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-28 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="mb-4 text-xl font-bold">Sign in</h1>
      <div className="mb-6 grid gap-2">
        <button
          onClick={() => signIn("google")}
          className="rounded bg-white/10 px-4 py-2 text-sm"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
