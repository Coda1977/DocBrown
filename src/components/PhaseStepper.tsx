"use client";

import { cn } from "@/lib/utils";

const phases = [
  { key: "collect", label: "Collect" },
  { key: "organize", label: "Organize" },
  { key: "vote", label: "Vote" },
  { key: "results", label: "Results" },
] as const;

const phaseColors: Record<string, string> = {
  collect: "bg-yellow-400",
  organize: "bg-teal-400",
  vote: "bg-purple-400",
  results: "bg-blue-400",
};

export function PhaseStepper({
  currentPhase,
  onAdvance,
  onRevert,
}: {
  currentPhase: string;
  onAdvance?: () => void;
  onRevert?: (phase: string) => void;
}) {
  const currentIdx = phases.findIndex((p) => p.key === currentPhase);

  return (
    <div className="flex items-center gap-0">
      {phases.map((phase, idx) => {
        const isActive = phase.key === currentPhase;
        const isPast = idx < currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={phase.key} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  "w-4 h-0.5 mx-0.5",
                  idx <= currentIdx ? "bg-muted-foreground/30" : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => {
                if (isPast && onRevert) onRevert(phase.key);
                if (idx === currentIdx + 1 && onAdvance) onAdvance();
              }}
              disabled={isFuture && idx !== currentIdx + 1}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                isActive && `${phaseColors[phase.key]} text-white shadow-sm`,
                isPast &&
                  "bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer",
                isFuture && idx === currentIdx + 1 &&
                  "bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer border border-dashed border-border",
                isFuture && idx !== currentIdx + 1 &&
                  "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {phase.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
