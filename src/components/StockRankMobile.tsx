"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Plus, X, GripVertical } from "lucide-react";

export function StockRankMobile({
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

  const submitVotes = useMutation(api.votes.submitStockRankVotes);

  const [ranked, setRanked] = useState<Id<"postIts">[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const topN =
    (activeRound?.config as { topN?: number })?.topN ?? 5;

  // Unranked items
  const unranked = useMemo(() => {
    if (!postIts) return [];
    const rankedSet = new Set(ranked as string[]);
    return postIts.filter((p) => !rankedSet.has(p._id as string));
  }, [postIts, ranked]);

  // Cluster labels
  const clusterMap = useMemo(() => {
    if (!clusters) return new Map<string, string>();
    return new Map(clusters.map((c) => [c._id as string, c.label]));
  }, [clusters]);

  type PostIt = NonNullable<typeof postIts>[number];
  const postItMap = useMemo(() => {
    if (!postIts) return new Map<string, PostIt>();
    return new Map(postIts.map((p) => [p._id as string, p]));
  }, [postIts]);

  // Already voted
  if (voteStatus?.hasVoted || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-postit-teal mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">OK</span>
          </div>
          <h2 className="text-lg font-semibold">Rankings submitted!</h2>
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
            <ArrowUpDown className="h-6 w-6 text-purple-500" />
          </div>
          <h2 className="text-lg font-semibold">Ranking is being set up</h2>
          <p className="text-sm text-muted-foreground">
            The facilitator is configuring the vote.
          </p>
        </div>
      </div>
    );
  }

  function addToRanked(id: Id<"postIts">) {
    if (ranked.length >= topN) return;
    setRanked((prev) => [...prev, id]);
  }

  function removeFromRanked(idx: number) {
    setRanked((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveItem(from: number, to: number) {
    setRanked((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function handleSubmit() {
    if (!activeRound || ranked.length === 0) return;
    setSubmitting(true);
    try {
      await submitVotes({
        roundId: activeRound._id,
        sessionId,
        participantToken,
        rankings: ranked.map((id, idx) => ({
          postItId: id,
          rank: idx + 1,
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
          Rank your top {topN}
        </span>
        <span
          className={`text-sm font-bold ${ranked.length >= topN ? "text-accent" : "text-primary"}`}
        >
          {ranked.length}/{topN}
        </span>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-4 pb-24">
        {/* Ranked zone */}
        {ranked.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Your ranking
            </p>
            <div className="space-y-2">
              {ranked.map((id, idx) => {
                const postIt = postItMap.get(id as string);
                if (!postIt) return null;
                return (
                  <div
                    key={id}
                    className="rounded-xl p-3 flex items-center gap-3 postit-shadow"
                    style={{
                      backgroundColor: postIt.color ?? "#fef9c3",
                      opacity: dragIdx === idx ? 0.5 : 1,
                    }}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragIdx !== null && dragIdx !== idx) {
                        moveItem(dragIdx, idx);
                        setDragIdx(idx);
                      }
                    }}
                    onDragEnd={() => setDragIdx(null)}
                  >
                    <span className="w-6 text-center font-bold text-sm text-muted-foreground shrink-0">
                      {idx + 1}
                    </span>
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab" />
                    <p className="flex-1 text-sm">{postIt.text}</p>
                    <button
                      onClick={() => removeFromRanked(idx)}
                      className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unranked items */}
        {unranked.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tap to add ({unranked.length} remaining)
            </p>
            <div className="space-y-2">
              {unranked.map((postIt) => {
                const clusterLabel = postIt.clusterId
                  ? clusterMap.get(postIt.clusterId as string)
                  : null;
                return (
                  <button
                    key={postIt._id}
                    onClick={() => addToRanked(postIt._id)}
                    disabled={ranked.length >= topN}
                    className="w-full rounded-xl p-3 flex items-center gap-3 postit-shadow text-left disabled:opacity-40"
                    style={{ backgroundColor: postIt.color ?? "#fef9c3" }}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{postIt.text}</p>
                      {clusterLabel && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {clusterLabel}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-inset-bottom">
        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={ranked.length === 0 || submitting}
        >
          {submitting
            ? "Submitting..."
            : `Submit Rankings (${ranked.length} items)`}
        </Button>
      </div>
    </div>
  );
}
