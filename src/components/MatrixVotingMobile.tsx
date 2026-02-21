"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Grid2x2 } from "lucide-react";

export function MatrixVotingMobile({
  sessionId,
  participantToken,
  question,
}: {
  sessionId: Id<"sessions">;
  participantToken: string;
  question: string;
}) {
  const activeRound = useQuery(api.votingRounds.getActive, { sessionId });
  const postIts = useQuery(api.postIts.bySession, { sessionId });
  const clusters = useQuery(api.clusters.bySession, { sessionId });
  const voteStatus = useQuery(
    api.votes.participantVoteStatus,
    activeRound && participantToken
      ? { roundId: activeRound._id, sessionId, participantToken }
      : "skip"
  );

  const submitVotes = useMutation(api.votes.submitMatrixVotes);

  const [ratings, setRatings] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const config = activeRound?.config as {
    xAxisLabel?: string;
    yAxisLabel?: string;
  } | null;
  const xLabel = config?.xAxisLabel ?? "X Axis";
  const yLabel = config?.yAxisLabel ?? "Y Axis";

  // Group by cluster
  const grouped = useMemo(() => {
    if (!postIts || !clusters) return [];
    const clusterMap = new Map(clusters.map((c) => [c._id, c]));
    const groups: { label: string; items: typeof postIts }[] = [];
    const unclustered = postIts.filter((p) => !p.clusterId);
    const clustered = new Map<string, typeof postIts>();

    for (const p of postIts) {
      if (p.clusterId) {
        const key = p.clusterId as string;
        if (!clustered.has(key)) clustered.set(key, []);
        clustered.get(key)!.push(p);
      }
    }

    for (const [cId, items] of clustered) {
      const cluster = clusterMap.get(cId as Id<"clusters">);
      groups.push({ label: cluster?.label ?? "Group", items });
    }

    if (unclustered.length > 0) {
      groups.push({ label: "Other", items: unclustered });
    }

    return groups;
  }, [postIts, clusters]);

  const ratedCount = Object.keys(ratings).length;
  const totalItems = postIts?.length ?? 0;

  // Already voted
  if (voteStatus?.hasVoted || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-postit-teal mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">OK</span>
          </div>
          <h2 className="text-lg font-semibold">Ratings submitted!</h2>
          <p className="text-sm text-muted-foreground">
            Waiting for the facilitator to reveal results...
          </p>
        </div>
      </div>
    );
  }

  if (!activeRound || !postIts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-postit-purple mx-auto flex items-center justify-center animate-pulse">
            <Grid2x2 className="h-6 w-6 text-purple-500" />
          </div>
          <h2 className="text-lg font-semibold">Rating is being set up</h2>
          <p className="text-sm text-muted-foreground">
            The facilitator is configuring the vote.
          </p>
        </div>
      </div>
    );
  }

  function setRating(postItId: string, axis: "x" | "y", value: number) {
    setRatings((prev) => ({
      ...prev,
      [postItId]: {
        x: axis === "x" ? value : (prev[postItId]?.x ?? 3),
        y: axis === "y" ? value : (prev[postItId]?.y ?? 3),
      },
    }));
  }

  function skipItem(postItId: string) {
    setRatings((prev) => {
      const next = { ...prev };
      delete next[postItId];
      return next;
    });
  }

  async function handleSubmit() {
    if (!activeRound || ratedCount === 0) return;
    setSubmitting(true);
    try {
      await submitVotes({
        roundId: activeRound._id,
        sessionId,
        participantToken,
        ratings: Object.entries(ratings).map(([postItId, { x, y }]) => ({
          postItId: postItId as Id<"postIts">,
          x,
          y,
        })),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <p className="text-xs text-muted-foreground mb-1">
          Doc<span className="text-primary">Brown</span>
        </p>
        <h1 className="text-lg font-semibold leading-snug">{question}</h1>
      </header>

      {/* Status bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Rate each item on two axes
        </span>
        <span className="text-sm font-bold text-primary">
          {ratedCount}/{totalItems} rated
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-6 pb-24">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="space-y-3">
              {group.items.map((postIt) => {
                const rating = ratings[postIt._id];
                const isRated = !!rating;
                return (
                  <div
                    key={postIt._id}
                    className="rounded-xl p-3 postit-shadow space-y-2"
                    style={{ backgroundColor: postIt.color ?? "#fef9c3" }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm flex-1">{postIt.text}</p>
                      {isRated && (
                        <button
                          onClick={() => skipItem(postIt._id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground ml-2"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                    {/* X axis slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-muted-foreground">
                          {xLabel}
                        </label>
                        <span className="text-[10px] font-bold">
                          {rating?.x ?? "-"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={rating?.x ?? 3}
                        onChange={(e) =>
                          setRating(postIt._id, "x", Number(e.target.value))
                        }
                        className="w-full h-2 accent-primary"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    {/* Y axis slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-muted-foreground">
                          {yLabel}
                        </label>
                        <span className="text-[10px] font-bold">
                          {rating?.y ?? "-"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={rating?.y ?? 3}
                        onChange={(e) =>
                          setRating(postIt._id, "y", Number(e.target.value))
                        }
                        className="w-full h-2 accent-primary"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-inset-bottom">
        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={ratedCount === 0 || submitting}
        >
          {submitting
            ? "Submitting..."
            : `Submit Ratings (${ratedCount}/${totalItems})`}
        </Button>
      </div>
    </div>
  );
}
