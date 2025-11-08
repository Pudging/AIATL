import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NBA Gesture Predictor",
  description: "Live NBA + Shooting Gesture Predictions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <header className="fixed inset-x-0 top-0 z-30 mt-2 bg-transparent backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 sm:px-6 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-emerald-200 transition hover:border-emerald-300/60"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              NBA Gesture Predictor
            </Link>
            <nav className="flex items-center gap-5 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-emerald-100/80">
              <span className="hidden sm:inline text-purple-200/90">
                Live Intel
              </span>
              <span className="hidden sm:inline text-orange-200/90">
                Gesture Lab
              </span>
              <span className="text-emerald-200/90">Boards</span>
            </nav>
          </div>
        </header>
        <main className="mx-auto">{children}</main>
      </body>
    </html>
  );
}
