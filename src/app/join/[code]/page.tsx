"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { VotingRouter } from "@/components/VotingRouter";
import { TimerDisplay } from "@/components/TimerDisplay";
import { ResultsPanel } from "@/components/ResultsPanel";

function getOrCreateToken(code: string): string {
  const key = `docbrown_token_${code}`;
  // Check cookie first
  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp(`${key}=([^;]+)`));
    if (match) return match[1];
  }
  // Check sessionStorage
  const stored =
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  if (stored) return stored;
  // Generate new
  const token = `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  // Store in cookie (24h) and sessionStorage
  if (typeof document !== "undefined") {
    document.cookie = `${key}=${token}; max-age=86400; path=/; SameSite=Lax`;
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, token);
  }
  return token;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const session = useQuery(api.sessions.getByShortCode, { shortCode: code });
  const [participantId, setParticipantId] = useState<Id<"participants"> | null>(
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const joinSession = useMutation(api.participants.join);
  const createPostIt = useMutation(api.postIts.create);

  const postIts = useQuery(
    api.postIts.bySession,
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

  // Generate/retrieve token on mount
  useEffect(() => {
    setToken(getOrCreateToken(code));
  }, [code]);

  // Join the session
  useEffect(() => {
    if (!session || !token || participantId) return;
    joinSession({
      sessionId: session._id,
      displayToken: token,
    }).then(setParticipantId);
  }, [session, token, participantId, joinSession]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !session || !participantId) return;
    setSubmitting(true);
    try {
      await createPostIt({
        sessionId: session._id,
        text: text.trim(),
        participantId,
      });
      setText("");
    } finally {
      setSubmitting(false);
    }
  }, [text, session, participantId, createPostIt]);

  // Session not found
  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Session not found</h1>
          <p className="text-sm text-muted-foreground">
            This session has ended or doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (!session || !participantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Joining session...</p>
      </div>
    );
  }

  // Organize phase - waiting screen
  if (session.phase === "organize") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-postit-teal mx-auto flex items-center justify-center">
            <span className="text-2xl">~</span>
          </div>
          <h2 className="text-lg font-semibold">Organizing responses...</h2>
          <p className="text-sm text-muted-foreground">
            The facilitator is organizing your responses. Sit tight!
          </p>
        </div>
      </div>
    );
  }

  // Vote phase
  if (session.phase === "vote") {
    return (
      <VotingRouter
        sessionId={session._id}
        participantId={participantId}
        question={session.question}
      />
    );
  }

  // Results phase
  if (session.phase === "results") {
    if (activeRound?.isRevealed) {
      return (
        <div className="min-h-screen bg-background overflow-y-auto">
          <header className="bg-card border-b border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Doc<span className="text-primary">Brown</span>
            </p>
            <h1 className="text-lg font-semibold">{session.question}</h1>
          </header>
          <ResultsPanel
            sessionId={session._id}
            activeRound={activeRound}
            postIts={postIts ?? []}
            fullWidth
            allRounds={allRounds?.filter((r) => r.isRevealed) ?? []}
            selectedRoundId={activeRound._id}
            onSelectRound={() => {}}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="text-lg font-semibold">Session Complete</h2>
          <p className="text-sm text-muted-foreground">
            Thanks for participating! The facilitator will share the results.
          </p>
        </div>
      </div>
    );
  }

  // Collect phase - main participant view
  const myPostIts = postIts?.filter(
    (p) => p.participantId === participantId
  );
  const allPostIts = session.participantVisibility ? postIts : myPostIts;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">
            Doc<span className="text-primary">Brown</span>
          </p>
          {session.timerEnabled &&
            session.timerSeconds &&
            session.timerStartedAt && (
              <TimerDisplay
                timerSeconds={session.timerSeconds}
                timerStartedAt={session.timerStartedAt}
              />
            )}
        </div>
        <h1 className="text-lg font-semibold leading-snug">
          {session.question}
        </h1>
      </header>

      {/* Input area */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex gap-2">
          <input
            className="flex-1 h-12 rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Type your answer..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="h-12 px-6"
          >
            {submitting ? "..." : "Submit"}
          </Button>
        </div>
      </div>

      {/* Submissions list */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {!session.participantVisibility && (
          <p className="text-xs text-muted-foreground mb-3">
            Your submissions ({myPostIts?.length ?? 0}) &middot;{" "}
            {postIts?.length ?? 0} total responses
          </p>
        )}
        <div className="space-y-2">
          {(allPostIts ?? []).map((postIt) => (
            <div
              key={postIt._id}
              className="rounded-xl p-3 text-sm postit-shadow"
              style={{ backgroundColor: postIt.color ?? "#fef9c3" }}
            >
              {postIt.text}
              {postIt.participantId === participantId && (
                <span className="text-[10px] text-muted-foreground ml-2">
                  (you)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
