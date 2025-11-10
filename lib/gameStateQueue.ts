import type { MutableRefObject } from "react";
import type { ParsedGameState } from "@/components/types";
import type { StateQueueItem } from "@/lib/gameClock";

const DEFAULT_QUEUE_LIMIT = 500;

export function pushStateToQueue(
  queueRef: MutableRefObject<StateQueueItem[]>,
  state: ParsedGameState,
  timestamp: number,
  limit: number = DEFAULT_QUEUE_LIMIT
) {
  queueRef.current = [...queueRef.current, { state, timestamp }];
  if (queueRef.current.length > limit) {
    queueRef.current = queueRef.current.slice(-limit);
  }
}

export function resetQueue(
  queueRef: MutableRefObject<StateQueueItem[]>,
  items: StateQueueItem[]
) {
  queueRef.current = items;
}
