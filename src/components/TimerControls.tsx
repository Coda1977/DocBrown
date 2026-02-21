"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timer, Square, RotateCcw } from "lucide-react";

const PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "2m", seconds: 120 },
  { label: "3m", seconds: 180 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
];

export function TimerControls({
  sessionId,
  timerEnabled,
  coAdminToken,
}: {
  sessionId: Id<"sessions">;
  timerEnabled: boolean;
  coAdminToken?: string;
}) {
  const startTimer = useMutation(api.sessions.startTimer);
  const stopTimer = useMutation(api.sessions.stopTimer);
  const resetTimer = useMutation(api.sessions.resetTimer);

  const [showPicker, setShowPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");

  async function handleStart(seconds: number) {
    setShowPicker(false);
    await startTimer({ sessionId, seconds, coAdminToken });
  }

  async function handleStop() {
    await stopTimer({ sessionId, coAdminToken });
  }

  async function handleReset() {
    await resetTimer({ sessionId, coAdminToken });
  }

  if (timerEnabled) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleStop} title="Stop timer">
          <Square className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} title="Reset timer">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        title="Set timer"
      >
        <Timer className="h-4 w-4" />
      </Button>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 p-3 w-52">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Set Timer
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => handleStart(p.seconds)}
                  className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={60}
                placeholder="min"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="h-8 text-sm w-16"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMinutes) {
                    handleStart(Number(customMinutes) * 60);
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!customMinutes}
                onClick={() => handleStart(Number(customMinutes) * 60)}
                className="h-8"
              >
                Start
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
