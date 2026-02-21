"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhaseStepper } from "@/components/PhaseStepper";
import { Canvas } from "@/components/Canvas";
import { VotingConfigPanel } from "@/components/VotingConfigPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TimerControls } from "@/components/TimerControls";
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

function getOrCreateCoAdminCookie(token: string): boolean {
  const key = `docbrown_coadmin_${token}`;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp(`${key}=([^;]+)`));
    if (match) return match[1] === "joined";
  }
  return false;
}

function setCoAdminCookie(token: string) {
  const key = `docbrown_coadmin_${token}`;
  if (typeof document !== "undefined") {
    document.cookie = `${key}=joined; max-age=86400; path=/; SameSite=Lax`;
  }
}

export default function CoAdminPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const coAdmin = useQuery(api.coAdmins.getByToken, { inviteToken: token });
  const joinCoAdmin = useMutation(api.coAdmins.join);

  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(() => getOrCreateCoAdminCookie(token));

  useEffect(() => {
    if (coAdmin?.isActive && !joined) {
      setJoined(true);
      setCoAdminCookie(token);
    }
  }, [coAdmin, joined, token]);

  async function handleJoin() {
    if (!displayName.trim()) return;
    setJoining(true);
    try {
      await joinCoAdmin({ inviteToken: token, displayName: displayName.trim() });
      setCoAdminCookie(token);
      setJoined(true);
    } finally {
      setJoining(false);
    }
  }

  // Invalid token
  if (coAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Invalid invite</h1>
          <p className="text-sm text-muted-foreground">
            This co-admin invite link is invalid or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (!coAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Join form
  if (!joined || !coAdmin.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div>
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">Join as Co-Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve been invited to co-manage a session. Enter your name
              to get started.
            </p>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <Button
              onClick={handleJoin}
              disabled={joining || !displayName.trim()}
              className="w-full"
            >
              {joining ? "Joining..." : "Join Session"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active co-admin - show session view
  return <CoAdminSessionView sessionId={coAdmin.sessionId} coAdminToken={token} />;
}

function CoAdminSessionView({
  sessionId,
  coAdminToken,
}: {
  sessionId: Id<"sessions">;
  coAdminToken: string;
}) {
  const session = useQuery(api.sessions.get, { sessionId });
  const postIts = useQuery(api.postIts.bySession, { sessionId });
  const clusters = useQuery(api.clusters.bySession, { sessionId });
  const participantCount = useQuery(api.sessions.participantCount, { sessionId });
  const activeRound = useQuery(api.votingRounds.getActive, { sessionId });
  const allRounds = useQuery(api.votingRounds.bySession, { sessionId });

  const advancePhase = useMutation(api.sessions.advancePhase);
  const revertPhase = useMutation(api.sessions.revertPhase);
  const updateSession = useMutation(api.sessions.update);
  const createPostIt = useMutation(api.postIts.create);
  const updatePostItText = useMutation(api.postIts.updateText);
  const movePostIt = useMutation(api.postIts.move);
  const removePostIt = useMutation(api.postIts.remove);

  const [editingPostIt, setEditingPostIt] = useState<Id<"postIts"> | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newPostItText, setNewPostItText] = useState("");
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<Id<"votingRounds"> | null>(null);

  const handleAdvance = useCallback(async () => {
    await advancePhase({ sessionId, coAdminToken });
  }, [advancePhase, sessionId, coAdminToken]);

  const handleRevert = useCallback((phase: string) => {
    setRevertConfirm(phase);
  }, []);

  const confirmRevert = useCallback(async () => {
    if (!revertConfirm) return;
    await revertPhase({
      sessionId,
      targetPhase: revertConfirm as "collect" | "organize" | "vote",
      coAdminToken,
    });
    setRevertConfirm(null);
  }, [revertPhase, sessionId, revertConfirm, coAdminToken]);

  const handleAddPostIt = useCallback(async () => {
    if (!newPostItText.trim()) return;
    await createPostIt({ sessionId, text: newPostItText.trim() });
    setNewPostItText("");
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

  const isVoteOrResults =
    session.phase === "vote" || session.phase === "results";

  return (
    <div className="h-screen flex flex-col bg-canvas-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            Co-Admin
          </div>
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
            sessionId={sessionId}
            timerEnabled={session.timerEnabled}
            coAdminToken={coAdminToken}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateSession({
                sessionId,
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
        {isVoteOrResults ? (
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
                readOnly={session.phase === "results"}
              />
            </div>
            <div className="w-[380px] border-l border-border bg-card overflow-y-auto">
              {session.phase === "vote" ? (
                <VotingConfigPanel
                  sessionId={sessionId}
                  activeRound={activeRound ?? null}
                  coAdminToken={coAdminToken}
                />
              ) : activeRound ? (
                <ResultsPanel
                  sessionId={sessionId}
                  activeRound={activeRound}
                  postIts={postIts ?? []}
                  clusters={clusters ?? []}
                  sessionMeta={{
                    question: session.question,
                    shortCode: session.shortCode ?? "",
                    createdAt: session.createdAt,
                  }}
                  allRounds={allRounds ?? []}
                  selectedRoundId={selectedRoundId ?? activeRound._id}
                  onSelectRound={setSelectedRoundId}
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No voting round was created. Go back to the Vote phase to set
                  one up.
                </div>
              )}
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
      </div>

      {/* Revert confirmation */}
      {revertConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">
              Go back to {revertConfirm}?
            </h3>
            <p className="text-sm text-muted-foreground">
              {revertConfirm === "collect" || revertConfirm === "organize"
                ? "This will delete all votes and voting rounds."
                : "This will reset voting progress."}
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
