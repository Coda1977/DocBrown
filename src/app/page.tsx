"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Layers, BarChart3 } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative post-its in background */}
      <div className="absolute top-12 left-[8%] w-28 h-24 rounded-2xl bg-postit-yellow/40 postit-shadow rotate-[-8deg] hidden sm:block" />
      <div className="absolute top-24 right-[10%] w-24 h-20 rounded-2xl bg-postit-coral/40 postit-shadow rotate-[6deg] hidden sm:block" />
      <div className="absolute bottom-20 left-[12%] w-20 h-20 rounded-2xl bg-postit-teal/40 postit-shadow rotate-[4deg] hidden sm:block" />
      <div className="absolute bottom-32 right-[8%] w-26 h-22 rounded-2xl bg-postit-purple/40 postit-shadow rotate-[-5deg] hidden sm:block" />

      <div className="text-center space-y-8 max-w-xl relative z-10">
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
            Doc<span className="text-primary">Brown</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Real-time brainstorming canvas with structured voting.
            Built for facilitators, loved by participants.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoading ? (
            <Button size="lg" disabled>
              Loading...
            </Button>
          ) : isAuthenticated ? (
            <Button size="lg" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="rounded-2xl bg-postit-yellow p-4 postit-shadow rotate-[-1deg] space-y-2">
            <MessageSquarePlus className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-medium text-foreground leading-snug">Collect ideas in real-time</p>
          </div>
          <div className="rounded-2xl bg-postit-coral p-4 postit-shadow rotate-[1deg] space-y-2">
            <Layers className="h-5 w-5 text-coral-500" style={{ color: "var(--coral-500)" }} />
            <p className="text-sm font-medium text-foreground leading-snug">Organize into themes</p>
          </div>
          <div className="rounded-2xl bg-postit-teal p-4 postit-shadow rotate-[-0.5deg] space-y-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            <p className="text-sm font-medium text-foreground leading-snug">Vote and see results</p>
          </div>
        </div>
      </div>
    </div>
  );
}
