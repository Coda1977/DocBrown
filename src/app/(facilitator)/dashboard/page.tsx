"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FolderSidebar, type FolderFilter } from "@/components/FolderSidebar";
import { SessionActions } from "@/components/SessionActions";
import { Plus, LogOut, Search } from "lucide-react";

const phaseLabels: Record<string, string> = {
  collect: "Collecting",
  organize: "Organizing",
  vote: "Voting",
  results: "Results",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-teal-100 text-teal-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-muted text-muted-foreground",
};

type StatusTab = "all" | "active" | "completed" | "archived";

export default function DashboardPage() {
  const user = useQuery(api.auth.currentUser);
  const { signOut } = useAuthActions();
  const router = useRouter();

  const [folderFilter, setFolderFilter] = useState<FolderFilter>({ type: "all" });
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const listArgs = useMemo(() => {
    if (folderFilter.type === "archived") {
      return { status: "archived" as const, includeArchived: true };
    }
    if (folderFilter.type === "folder") {
      return { folderId: folderFilter.folderId, includeArchived: true };
    }
    return {};
  }, [folderFilter]);

  const sessions = useQuery(api.sessions.list, listArgs);

  // Client-side filtering for status tabs and search
  const filtered = useMemo(() => {
    if (!sessions) return undefined;
    let result = sessions;

    // Status tab filter (only when not already filtered by folder/archived)
    if (folderFilter.type === "all") {
      if (statusTab === "active") result = result.filter((s) => s.status === "active");
      else if (statusTab === "completed") result = result.filter((s) => s.status === "completed");
      else if (statusTab === "archived") result = result.filter((s) => s.status === "archived");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.question.toLowerCase().includes(q));
    }

    return result;
  }, [sessions, statusTab, searchQuery, folderFilter.type]);

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Doc<span className="text-primary">Brown</span>
          </h1>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.name ?? user.email}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <FolderSidebar active={folderFilter} onSelect={setFolderFilter} />

        <main className="flex-1 px-6 py-6 max-w-5xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              {folderFilter.type === "archived"
                ? "Archived"
                : folderFilter.type === "folder"
                  ? "Folder"
                  : "Sessions"}
            </h2>
            <Button asChild>
              <Link href="/sessions/new">
                <Plus className="h-4 w-4 mr-1" />
                New Session
              </Link>
            </Button>
          </div>

          {/* Search + status tabs */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {folderFilter.type === "all" && (
              <div className="flex gap-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered === undefined ? (
            <p className="text-muted-foreground">Loading sessions...</p>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No sessions match your search."
                    : folderFilter.type === "archived"
                      ? "No archived sessions."
                      : folderFilter.type === "folder"
                        ? "No sessions in this folder."
                        : statusTab === "active"
                          ? "No active sessions."
                          : statusTab === "completed"
                            ? "No completed sessions."
                            : statusTab === "archived"
                              ? "No archived sessions."
                              : "No sessions yet. Create your first workshop session!"}
                </p>
                {!searchQuery && folderFilter.type === "all" && statusTab === "all" && (
                  <Button asChild>
                    <Link href="/sessions/new">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Session
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((session) => (
                <div key={session._id} className="relative">
                  <Link
                    href={`/sessions/${session._id}`}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {session.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}
                            >
                              {session.status}
                            </span>
                            {session.status === "active" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                {phaseLabels[session.phase]}
                              </span>
                            )}
                            {session.shortCode && (
                              <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                {session.shortCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-4 mr-10">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                    <SessionActions
                      sessionId={session._id}
                      status={session.status}
                      onDuplicated={(newId) =>
                        router.push(`/sessions/${newId}`)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
