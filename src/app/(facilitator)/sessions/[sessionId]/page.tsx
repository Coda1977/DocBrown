"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhaseStepper } from "@/components/PhaseStepper";
import { QRCodeOverlay } from "@/components/QRCodeOverlay";
import { Canvas } from "@/components/Canvas";
import { VotingConfigPanel } from "@/components/VotingConfigPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TimerControls } from "@/components/TimerControls";
import { CoAdminInvite } from "@/components/CoAdminInvite";
import {
  ArrowLeft,
  QrCode,
  Users,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

export default function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const session = useQuery(api.sessions.get, {
    sessionId: sessionId as Id<"sessions">,
  });
  const postIts = useQuery(api.postIts.bySession, {
    sessionId: sessionId as Id<"sessions">,
  });
  const clusters = useQuery(api.clusters.bySession, {
    sessionId: sessionId as Id<"sessions">,
  });
  const participantCount = useQuery(api.sessions.participantCount, {
    sessionId: sessionId as Id<"sessions">,
  });
  const activeRound = useQuery(api.votingRounds.getActive, {
    sessionId: sessionId as Id<"sessions">,
  });
  const allRounds = useQuery(api.votingRounds.bySession, {
    sessionId: sessionId as Id<"sessions">,
  });

  const advancePhase = useMutation(api.sessions.advancePhase);
  const revertPhase = useMutation(api.sessions.revertPhase);
  const updateSession = useMutation(api.sessions.update);
  const createPostIt = useMutation(api.postIts.create);
  const updatePostItText = useMutation(api.postIts.updateText);
  const movePostIt = useMutation(api.postIts.move);
  const removePostIt = useMutation(api.postIts.remove);

  const [showQR, setShowQR] = useState(false);
  const [editingPostIt, setEditingPostIt] = useState<Id<"postIts"> | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newPostItText, setNewPostItText] = useState("");
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<Id<"votingRounds"> | null>(null);

  const handleAdvance = useCallback(async () => {
    await advancePhase({ sessionId: sessionId as Id<"sessions"> });
  }, [advancePhase, sessionId]);

  const handleRevert = useCallback(
    (phase: string) => {
      setRevertConfirm(phase);
    },
    []
  );

  const confirmRevert = useCallback(async () => {
    if (!revertConfirm) return;
    await revertPhase({
      sessionId: sessionId as Id<"sessions">,
      targetPhase: revertConfirm as "collect" | "organize" | "vote",
    });
    setRevertConfirm(null);
  }, [revertPhase, sessionId, revertConfirm]);

  const handleAddPostIt = useCallback(async () => {
    if (!newPostItText.trim()) return;
    await createPostIt({
      sessionId: sessionId as Id<"sessions">,
      text: newPostItText.trim(),
    });
    setNewPostItText("");
    // Keep input open for rapid entry
  }, [createPostIt, sessionId, newPostItText]);

  const handleMovePostIt = useCallback(
    async (postItId: Id<"postIts">, x: number, y: number) => {
      await movePostIt({ postItId, positionX: x, positionY: y });
    },
    [movePostIt]
  );

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[300px]">
              {session.question}
            </p>
          </div>
        </div>

        <PhaseStepper
          currentPhase={session.phase}
          onAdvance={handleAdvance}
          onRevert={handleRevert}
        />

        <div className="flex items-center gap-2">
          {session.timerEnabled &&
            session.timerSeconds &&
            session.timerStartedAt && (
              <TimerDisplay
                timerSeconds={session.timerSeconds}
                timerStartedAt={session.timerStartedAt}
              />
            )}
          <TimerControls
            sessionId={sessionId as Id<"sessions">}
            timerEnabled={session.timerEnabled}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateSession({
                sessionId: sessionId as Id<"sessions">,
                participantVisibility: !session.participantVisibility,
              })
            }
          >
            {session.participantVisibility ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {participantCount ?? 0}
          </div>
          <CoAdminInvite sessionId={sessionId as Id<"sessions">} />
          <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
            <QrCode className="h-4 w-4 mr-1" />
            Share
          </Button>
          {(session.phase === "collect" || session.phase === "organize") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddInput(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Post-it
            </Button>
          )}
        </div>
      </header>

      {/* Add post-it input */}
      {showAddInput && (
        <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-2">
          <Input
            placeholder="Type a post-it..."
            value={newPostItText}
            onChange={(e) => setNewPostItText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPostIt();
              if (e.key === "Escape") setShowAddInput(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleAddPostIt}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddInput(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {session.phase === "results" ? (
          activeRound ? (
            <div className="h-full overflow-y-auto">
              <ResultsPanel
                sessionId={sessionId as Id<"sessions">}
                activeRound={activeRound}
                postIts={postIts ?? []}
                clusters={clusters ?? []}
                fullWidth
                sessionMeta={{
                  question: session.question,
                  shortCode: session.shortCode ?? "",
                  createdAt: session.createdAt,
                }}
                allRounds={allRounds ?? []}
                selectedRoundId={selectedRoundId ?? activeRound._id}
                onSelectRound={setSelectedRoundId}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No voting round was created. Go back to the Vote phase to set one up.
            </div>
          )
        ) : session.phase === "vote" ? (
          <div className="flex h-full">
            <div className="flex-1 overflow-auto">
              <Canvas
                postIts={postIts ?? []}
                clusters={clusters ?? []}
                editingPostIt={editingPostIt}
                onStartEdit={setEditingPostIt}
                onSaveEdit={async (id, text) => {
                  await updatePostItText({ postItId: id, text });
                  setEditingPostIt(null);
                }}
                onDelete={async (id) => {
                  await removePostIt({ postItId: id });
                  setEditingPostIt(null);
                }}
                onMove={handleMovePostIt}
                activeRound={activeRound ?? undefined}
                readOnly={false}
              />
            </div>
            <div className="w-[380px] border-l border-border bg-card overflow-y-auto">
              <VotingConfigPanel
                sessionId={sessionId as Id<"sessions">}
                activeRound={activeRound ?? null}
              />
            </div>
          </div>
        ) : (
          <Canvas
            postIts={postIts ?? []}
            clusters={clusters ?? []}
            editingPostIt={editingPostIt}
            onStartEdit={setEditingPostIt}
            onSaveEdit={async (id, text) => {
              await updatePostItText({ postItId: id, text });
              setEditingPostIt(null);
            }}
            onDelete={async (id) => {
              await removePostIt({ postItId: id });
              setEditingPostIt(null);
            }}
            onMove={handleMovePostIt}
            readOnly={false}
          />
        )}

        {/* Empty state */}
        {postIts && postIts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-3">
              <div className="flex justify-center gap-3 mb-2">
                <div className="w-16 h-14 rounded-xl bg-postit-yellow/60 postit-shadow rotate-[-3deg]" />
                <div className="w-16 h-14 rounded-xl bg-postit-coral/60 postit-shadow rotate-[2deg] translate-y-1" />
                <div className="w-16 h-14 rounded-xl bg-postit-teal/60 postit-shadow rotate-[-1deg]" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Waiting for responses...
              </p>
              <p className="text-sm text-muted-foreground">
                {participantCount ?? 0} {(participantCount ?? 0) === 1 ? "person has" : "people have"} joined
              </p>
            </div>
          </div>
        )}
      </div>

      {/* QR Overlay */}
      {showQR && session.shortCode && (
        <QRCodeOverlay
          shortCode={session.shortCode}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Revert confirmation */}
      {revertConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Go back to {revertConfirm.charAt(0).toUpperCase() + revertConfirm.slice(1)}?</h3>
            <p className="text-sm text-muted-foreground">
              {revertConfirm === "collect"
                ? "This will delete all votes and voting rounds, and reopen submissions."
                : revertConfirm === "organize"
                  ? "This will delete all votes and voting rounds."
                  : "This will reset the current voting round's progress."}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRevertConfirm(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRevert}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
