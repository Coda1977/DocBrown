"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Minus, Plus, CircleDot } from "lucide-react";

export function DotVotingMobile({
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

  const submitDotVotes = useMutation(api.votes.submitDotVotes);

  const totalPoints =
    (activeRound?.config as { totalPoints?: number })?.totalPoints ?? 10;
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const usedPoints = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + v, 0),
    [allocations]
  );
  const remaining = totalPoints - usedPoints;

  // Group post-its by cluster
  const grouped = useMemo(() => {
    if (!postIts || !clusters) return [];
    const clusterMap = new Map(clusters.map((c) => [c._id, c]));
    const groups: {
      label: string;
      items: typeof postIts;
    }[] = [];

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

  // Already voted
  if (voteStatus?.hasVoted || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-postit-teal mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">OK</span>
          </div>
          <h2 className="text-lg font-semibold">Votes submitted!</h2>
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
            <CircleDot className="h-6 w-6 text-purple-500" />
          </div>
          <h2 className="text-lg font-semibold">Voting is being set up</h2>
          <p className="text-sm text-muted-foreground">
            The facilitator is configuring the vote. You&apos;ll be able to vote once it starts.
          </p>
        </div>
      </div>
    );
  }

  function adjust(postItId: string, delta: number) {
    setAllocations((prev) => {
      const current = prev[postItId] ?? 0;
      const next = Math.max(0, current + delta);
      if (delta > 0 && remaining <= 0) return prev;
      return { ...prev, [postItId]: next };
    });
  }

  async function handleSubmit() {
    if (!activeRound) return;
    setSubmitting(true);
    try {
      await submitDotVotes({
        roundId: activeRound._id,
        sessionId,
        participantToken,
        votes: Object.entries(allocations)
          .filter(([, pts]) => pts > 0)
          .map(([postItId, points]) => ({
            postItId: postItId as Id<"postIts">,
            points,
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

      {/* Remaining points - sticky */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Points remaining</span>
        <span
          className={`text-xl font-bold ${remaining === 0 ? "text-accent" : "text-primary"}`}
        >
          {remaining}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-6 pb-24">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.items.map((postIt) => {
                const pts = allocations[postIt._id] ?? 0;
                return (
                  <div
                    key={postIt._id}
                    className="rounded-xl p-3 flex items-center gap-3 postit-shadow"
                    style={{ backgroundColor: postIt.color ?? "#fef9c3" }}
                  >
                    <p className="flex-1 text-sm">{postIt.text}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center"
                        onClick={() => adjust(postIt._id, -1)}
                        disabled={pts === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">
                        {pts}
                      </span>
                      <button
                        className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center"
                        onClick={() => adjust(postIt._id, 1)}
                        disabled={remaining <= 0}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit - sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-inset-bottom">
        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={usedPoints === 0 || submitting}
        >
          {submitting
            ? "Submitting..."
            : `Submit Votes (${usedPoints}/${totalPoints} used)`}
        </Button>
      </div>
    </div>
  );
}
