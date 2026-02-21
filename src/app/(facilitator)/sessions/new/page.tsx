"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSessionPage() {
  const createSession = useMutation(api.sessions.create);
  const folders = useQuery(api.folders.list);
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const sessionId = await createSession({
        question: question.trim(),
        participantVisibility: visibility,
        folderId: selectedFolder
          ? (selectedFolder as Id<"folders">)
          : undefined,
      });
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">
            Doc<span className="text-primary">Brown</span>
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>New Session</CardTitle>
            <CardDescription>
              Create a brainstorming session with one question for your
              participants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question">Brainstorm Question</Label>
                <Input
                  id="question"
                  placeholder="e.g. What are the biggest barriers to adopting AI in our team?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is the question participants will answer.
                </p>
              </div>

              {folders && folders.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="folder">Folder (optional)</Label>
                  <select
                    id="folder"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setVisibility(!visibility)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative ${visibility ? "bg-accent" : "bg-muted"}`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${visibility ? "translate-x-[18px]" : "translate-x-0.5"}`}
                  />
                </div>
                <span className="text-sm">
                  Participants can see each other&apos;s answers
                </span>
              </button>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
