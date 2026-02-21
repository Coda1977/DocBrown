"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { UserPlus, Copy, X, Trash2 } from "lucide-react";

function getOrigin() {
  if (typeof window === "undefined") return "";
  const loc = window.location;
  if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
    return `http://${process.env.NEXT_PUBLIC_LOCAL_IP ?? loc.host}`;
  }
  return loc.origin;
}

export function CoAdminInvite({
  sessionId,
}: {
  sessionId: Id<"sessions">;
}) {
  const coAdmin = useQuery(api.coAdmins.getBySession, { sessionId });
  const createInvite = useMutation(api.coAdmins.createInvite);
  const revokeInvite = useMutation(api.coAdmins.revoke);

  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await createInvite({ sessionId });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke() {
    await revokeInvite({ sessionId });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteUrl = coAdmin?.inviteToken
    ? `${getOrigin()}/admin/${coAdmin.inviteToken}`
    : null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPanel(!showPanel)}
        title="Co-Admin"
        className="relative"
      >
        <UserPlus className="h-4 w-4" />
        {coAdmin?.isActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
        )}
      </Button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 p-4 w-72">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Co-Admin</p>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {!coAdmin ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Invite a co-admin to help manage this session. They can
                  advance phases, control timers, and manage voting.
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? "Generating..." : "Generate Invite Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {coAdmin.isActive ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-medium">
                      {coAdmin.displayName}
                    </span>
                    <span className="text-xs text-accent">Active</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Invite created. Waiting for co-admin to join...
                  </p>
                )}

                {inviteUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded flex-1 truncate">
                        {inviteUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleCopy(inviteUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-[10px] text-accent">Copied!</p>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevoke}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Revoke Access
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
