"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Canvas } from "@/components/Canvas";
import { ResultsPanel } from "@/components/ResultsPanel";
import { TimerDisplay } from "@/components/TimerDisplay";
import { Users } from "lucide-react";

export default function PresentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const session = useQuery(api.sessions.getByShortCode, { shortCode: code });
  const postIts = useQuery(
    api.postIts.bySession,
    session ? { sessionId: session._id } : "skip"
  );
  const clusters = useQuery(
    api.clusters.bySession,
    session ? { sessionId: session._id } : "skip"
  );
  const participantCount = useQuery(
    api.sessions.participantCount,
    session ? { sessionId: session._id } : "skip"
  );
  const activeRound = useQuery(
    api.votingRounds.getActive,
    session ? { sessionId: session._id } : "skip"
  );
  const allRounds = useQuery(
    api.votingRounds.bySession,
    session ? { sessionId: session._id } : "skip"
  );
  const [selectedRoundId, setSelectedRoundId] = useState<Id<"votingRounds"> | null>(null);
  const progress = useQuery(
    api.votes.votingProgress,
    session && activeRound
      ? { roundId: activeRound._id, sessionId: session._id }
      : "skip"
  );

  if (session === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Session not found</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const phaseLabels: Record<string, string> = {
    collect: "Collecting Responses",
    organize: "Organizing Ideas",
    vote: "Voting",
    results: "Results",
  };

  const showResults = session.phase === "results" && activeRound;

  return (
    <div className="h-screen flex flex-col bg-canvas-bg">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">
            Doc<span className="text-primary">Brown</span>
          </h1>
          <span className="text-sm text-muted-foreground truncate max-w-[400px]">
            {session.question}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {session.timerEnabled &&
            session.timerSeconds &&
            session.timerStartedAt && (
              <TimerDisplay
                timerSeconds={session.timerSeconds}
                timerStartedAt={session.timerStartedAt}
              />
            )}
          <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            {phaseLabels[session.phase]}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {participantCount ?? 0}
          </div>
          {session.phase === "vote" && progress && (
            <span className="text-sm text-muted-foreground">
              {progress.voted} of {progress.total} voted
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {showResults ? (
          <div className="h-full overflow-y-auto">
            <ResultsPanel
              sessionId={session._id}
              activeRound={activeRound}
              postIts={postIts ?? []}
              fullWidth
              allRounds={allRounds ?? []}
              selectedRoundId={selectedRoundId ?? activeRound._id}
              onSelectRound={setSelectedRoundId}
            />
          </div>
        ) : (
          <>
            <Canvas
              postIts={postIts ?? []}
              clusters={clusters ?? []}
              editingPostIt={null}
              onStartEdit={() => {}}
              onSaveEdit={() => {}}
              onDelete={() => {}}
              onMove={() => {}}
              activeRound={activeRound ?? undefined}
              readOnly
            />

            {/* Overlay stats */}
            <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur rounded-xl border border-border px-4 py-3 shadow-lg">
              <div className="text-2xl font-bold text-primary">
                {postIts?.length ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">responses</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
