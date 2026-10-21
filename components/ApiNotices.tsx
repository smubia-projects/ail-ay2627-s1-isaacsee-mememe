"use client";

import { useEffect, useState } from "react";
import { DEMO_PAUSED_EVENT, RATE_LIMIT_EVENT } from "@/lib/api";
import { DemoPausedNotice, RateLimitCTA } from "./RateLimitCTA";

/** Renders the 429 rate-limit CTA and the 503 "demo paused" notice fired by lib/api.ts. */
export function ApiNotices() {
  const [queriesUsed, setQueriesUsed] = useState<number | null>(null);
  const [pausedMessage, setPausedMessage] = useState<string | null>(null);

  useEffect(() => {
    const onRateLimit = (e: Event) => setQueriesUsed((e as CustomEvent<{ queriesUsed: number }>).detail?.queriesUsed ?? 0);
    const onPaused = (e: Event) =>
      setPausedMessage((e as CustomEvent<{ message: string }>).detail?.message || "This demo is temporarily paused. Check back soon.");
    window.addEventListener(RATE_LIMIT_EVENT, onRateLimit);
    window.addEventListener(DEMO_PAUSED_EVENT, onPaused);
    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, onRateLimit);
      window.removeEventListener(DEMO_PAUSED_EVENT, onPaused);
    };
  }, []);

  return (
    <>
      {queriesUsed !== null && <RateLimitCTA queriesMade={queriesUsed} onDismiss={() => setQueriesUsed(null)} />}
      {pausedMessage && <DemoPausedNotice message={pausedMessage} onDismiss={() => setPausedMessage(null)} />}
    </>
  );
}
