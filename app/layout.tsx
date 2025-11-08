import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AuthProvider from "@/components/AuthProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignInOut } from "@/components/SignInOut";

export const metadata: Metadata = {
  title: "NBA Gesture Predictor",
  description: "Live NBA + Shooting Gesture Predictions",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <header className="fixed inset-x-0 top-0 z-30 mt-2 bg-transparent backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 sm:px-6 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.35em] text-emerald-200 uppercase transition hover:border-emerald-300/60"
            >
              <Image
                src="/the_logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="object-contain"
              />
              <span className="hidden sm:inline">NBA Gesture Predictor</span>
            </Link>
            <nav className="flex items-center gap-5 text-[0.6rem] font-semibold tracking-[0.35em] text-emerald-100/80 uppercase">
              <Link
                href="/join"
                className="text-emerald-300 hover:text-emerald-200"
              >
                Join
              </Link>
              <SignInOut session={session} />
            </nav>
          </div>
        </header>
        <AuthProvider>
          <main className="mx-auto">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
