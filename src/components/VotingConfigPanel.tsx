"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CircleDot, ArrowUpDown, Grid2x2 } from "lucide-react";

type VotingMode = "dot_voting" | "stock_rank" | "matrix_2x2";

const VOTING_MODES: {
  key: VotingMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}[] = [
  {
    key: "dot_voting",
    label: "Dot Voting",
    description: "Each participant distributes points across items",
    icon: <CircleDot className="h-5 w-5" />,
    available: true,
  },
  {
    key: "stock_rank",
    label: "Stock Rank",
    description: "Drag to rank items in order of preference",
    icon: <ArrowUpDown className="h-5 w-5" />,
    available: true,
  },
  {
    key: "matrix_2x2",
    label: "2x2 Matrix",
    description: "Rate items on two axes (e.g. impact vs effort)",
    icon: <Grid2x2 className="h-5 w-5" />,
    available: true,
  },
];

interface ActiveRound {
  _id: Id<"votingRounds">;
  mode: string;
  config: Record<string, unknown>;
  isRevealed: boolean;
}

export function VotingConfigPanel({
  sessionId,
  activeRound,
  coAdminToken,
}: {
  sessionId: Id<"sessions">;
  activeRound: ActiveRound | null;
  coAdminToken?: string;
}) {
  const createRound = useMutation(api.votingRounds.create);
  const revealResults = useMutation(api.votingRounds.reveal);
  const advancePhase = useMutation(api.sessions.advancePhase);
  const progress = useQuery(
    api.votes.votingProgress,
    activeRound ? { roundId: activeRound._id, sessionId } : "skip"
  );

  const [selectedMode, setSelectedMode] = useState<VotingMode>("dot_voting");
  const [totalPoints, setTotalPoints] = useState(10);
  const [topN, setTopN] = useState(5);
  const [xAxisLabel, setXAxisLabel] = useState("Impact");
  const [yAxisLabel, setYAxisLabel] = useState("Effort");
  const [creating, setCreating] = useState(false);
  const [showNewRound, setShowNewRound] = useState(false);

  async function handleCreateRound() {
    setCreating(true);
    try {
      let config: Record<string, unknown>;
      switch (selectedMode) {
        case "dot_voting":
          config = { totalPoints };
          break;
        case "stock_rank":
          config = { topN };
          break;
        case "matrix_2x2":
          config = { xAxisLabel, yAxisLabel };
          break;
      }
      await createRound({ sessionId, mode: selectedMode, config, coAdminToken });
    } finally {
      setCreating(false);
    }
  }

  // Setup view - no active round yet
  if (!activeRound) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Voting Setup</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a voting method and configure it.
          </p>
        </div>

        {/* Voting mode selection */}
        <div className="space-y-2">
          <Label>Voting Method</Label>
          <div className="space-y-2">
            {VOTING_MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => mode.available && setSelectedMode(mode.key)}
                disabled={!mode.available}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                  selectedMode === mode.key
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40",
                  !mode.available && "opacity-40 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5",
                    selectedMode === mode.key
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {mode.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {mode.label}
                    {!mode.available && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Coming soon
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode-specific config */}
        {selectedMode === "dot_voting" && (
          <div className="space-y-2">
            <Label>Points per participant</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={totalPoints}
              onChange={(e) => setTotalPoints(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Each participant can distribute this many points across all items.
            </p>
          </div>
        )}

        {selectedMode === "stock_rank" && (
          <div className="space-y-2">
            <Label>Number of items to rank</Label>
            <Input
              type="number"
              min={3}
              max={20}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Each participant will rank their top N items in order of
              preference.
            </p>
          </div>
        )}

        {selectedMode === "matrix_2x2" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>X-Axis Label</Label>
              <Input
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                placeholder="e.g. Impact"
              />
            </div>
            <div className="space-y-2">
              <Label>Y-Axis Label</Label>
              <Input
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                placeholder="e.g. Effort"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Participants rate each item from 1-5 on both axes.
            </p>
          </div>
        )}

        <Button
          onClick={handleCreateRound}
          disabled={creating}
          className="w-full"
          size="lg"
        >
          {creating ? "Starting..." : "Start Voting"}
        </Button>
      </div>
    );
  }

  // Active round view
  const modeLabel =
    VOTING_MODES.find((m) => m.key === activeRound.mode)?.label ??
    activeRound.mode;

  const configDisplay = () => {
    switch (activeRound.mode) {
      case "dot_voting":
        return (
          <p className="text-sm text-muted-foreground">
            Points:{" "}
            <span className="font-medium text-foreground">
              {(activeRound.config as { totalPoints?: number })?.totalPoints ?? 10}
            </span>
          </p>
        );
      case "stock_rank":
        return (
          <p className="text-sm text-muted-foreground">
            Top N:{" "}
            <span className="font-medium text-foreground">
              {(activeRound.config as { topN?: number })?.topN ?? 5}
            </span>
          </p>
        );
      case "matrix_2x2":
        return (
          <>
            <p className="text-sm text-muted-foreground">
              X:{" "}
              <span className="font-medium text-foreground">
                {(activeRound.config as { xAxisLabel?: string })?.xAxisLabel ?? "X"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Y:{" "}
              <span className="font-medium text-foreground">
                {(activeRound.config as { yAxisLabel?: string })?.yAxisLabel ?? "Y"}
              </span>
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Voting in Progress</h3>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Mode:{" "}
          <span className="font-medium text-foreground">{modeLabel}</span>
        </p>
        {configDisplay()}
      </div>

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress.voted} of {progress.total} voted
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{
                width: `${progress.total > 0 ? (progress.voted / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {!activeRound.isRevealed ? (
        <div className="space-y-2">
          <Button
            onClick={() => revealResults({ roundId: activeRound._id, coAdminToken })}
            className="w-full"
          >
            Reveal to Participants
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await revealResults({ roundId: activeRound._id, coAdminToken });
              await advancePhase({ sessionId, coAdminToken });
            }}
            className="w-full"
          >
            End Voting
          </Button>
        </div>
      ) : !showNewRound ? (
        <div className="space-y-2">
          <p className="text-sm text-accent font-medium">
            Results are visible to all
          </p>
          <Button
            variant="outline"
            onClick={() => advancePhase({ sessionId, coAdminToken })}
            className="w-full"
          >
            Go to Results Phase
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowNewRound(true)}
            className="w-full"
          >
            Start Another Round
          </Button>
        </div>
      ) : (
        <NewRoundSetup
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          totalPoints={totalPoints}
          setTotalPoints={setTotalPoints}
          topN={topN}
          setTopN={setTopN}
          xAxisLabel={xAxisLabel}
          setXAxisLabel={setXAxisLabel}
          yAxisLabel={yAxisLabel}
          setYAxisLabel={setYAxisLabel}
          creating={creating}
          onCancel={() => setShowNewRound(false)}
          onCreate={handleCreateRound}
        />
      )}
    </div>
  );
}

function NewRoundSetup({
  selectedMode,
  setSelectedMode,
  totalPoints,
  setTotalPoints,
  topN,
  setTopN,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,
  creating,
  onCancel,
  onCreate,
}: {
  selectedMode: VotingMode;
  setSelectedMode: (m: VotingMode) => void;
  totalPoints: number;
  setTotalPoints: (n: number) => void;
  topN: number;
  setTopN: (n: number) => void;
  xAxisLabel: string;
  setXAxisLabel: (s: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (s: string) => void;
  creating: boolean;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">New Round</h4>
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2">
        <Label>Voting Method</Label>
        <div className="space-y-1.5">
          {VOTING_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => mode.available && setSelectedMode(mode.key)}
              disabled={!mode.available}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                selectedMode === mode.key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
                !mode.available && "opacity-40 cursor-not-allowed"
              )}
            >
              <div
                className={
                  selectedMode === mode.key
                    ? "text-primary"
                    : "text-muted-foreground"
                }
              >
                {mode.icon}
              </div>
              <span className="font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedMode === "dot_voting" && (
        <div className="space-y-1">
          <Label className="text-xs">Points per participant</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={totalPoints}
            onChange={(e) => setTotalPoints(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      )}

      {selectedMode === "stock_rank" && (
        <div className="space-y-1">
          <Label className="text-xs">Items to rank</Label>
          <Input
            type="number"
            min={3}
            max={20}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      )}

      {selectedMode === "matrix_2x2" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">X-Axis</Label>
            <Input
              value={xAxisLabel}
              onChange={(e) => setXAxisLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y-Axis</Label>
            <Input
              value={yAxisLabel}
              onChange={(e) => setYAxisLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      <Button onClick={onCreate} disabled={creating} className="w-full" size="sm">
        {creating ? "Starting..." : "Start New Round"}
      </Button>
    </div>
  );
}
