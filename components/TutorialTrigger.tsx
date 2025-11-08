"use client";

import { useState } from "react";
import TutorialOverlay from "@/components/TutorialOverlay";

export default function TutorialTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-emerald-400/50 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:border-emerald-300 hover:text-emerald-50"
      >
        Tutorial
      </button>
      <TutorialOverlay show={open} onClose={() => setOpen(false)} />
    </>
  );
}
