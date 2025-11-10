"use client";

import { createContext, useContext, type ReactNode } from "react";

const GameExperienceContext = createContext<unknown>(null);

type ProviderProps<T> = {
  value: T;
  children: ReactNode;
};

export function GameExperienceProvider<T>({
  value,
  children,
}: ProviderProps<T>) {
  return (
    <GameExperienceContext.Provider value={value}>
      {children}
    </GameExperienceContext.Provider>
  );
}

export function useGameExperienceContext<T>() {
  const ctx = useContext(GameExperienceContext);
  if (ctx === null) {
    throw new Error(
      "useGameExperienceContext must be used within GameExperienceProvider"
    );
  }
  return ctx as T;
}
