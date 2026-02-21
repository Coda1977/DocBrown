"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

export function TimerDisplay({
  timerSeconds,
  timerStartedAt,
  onExpire,
}: {
  timerSeconds: number;
  timerStartedAt: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - timerStartedAt) / 1000;
    return Math.max(0, timerSeconds - elapsed);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - timerStartedAt) / 1000;
      const left = Math.max(0, timerSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timerSeconds, timerStartedAt, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const isLow = remaining <= 10 && remaining > 0;
  const isExpired = remaining <= 0;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-bold transition-colors ${
        isExpired
          ? "bg-destructive/10 text-destructive"
          : isLow
            ? "bg-postit-coral/20 text-red-600 animate-pulse"
            : "bg-postit-teal/20 text-teal-700"
      }`}
    >
      <Timer className="h-4 w-4" />
      {isExpired ? "Time's up!" : display}
    </div>
  );
}
