"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DotVotingMobile } from "./DotVotingMobile";
import { StockRankMobile } from "./StockRankMobile";
import { MatrixVotingMobile } from "./MatrixVotingMobile";
import { CircleDot } from "lucide-react";

export function VotingRouter({
  sessionId,
  participantId,
  question,
}: {
  sessionId: Id<"sessions">;
  participantId: Id<"participants">;
  question: string;
}) {
  const activeRound = useQuery(api.votingRounds.getActive, { sessionId });

  if (!activeRound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-postit-purple mx-auto flex items-center justify-center animate-pulse">
            <CircleDot className="h-6 w-6 text-purple-500" />
          </div>
          <h2 className="text-lg font-semibold">Voting is being set up</h2>
          <p className="text-sm text-muted-foreground">
            The facilitator is configuring the vote. You&apos;ll be able to vote
            once it starts.
          </p>
        </div>
      </div>
    );
  }

  switch (activeRound.mode) {
    case "dot_voting":
      return (
        <DotVotingMobile
          sessionId={sessionId}
          participantId={participantId}
          question={question}
        />
      );
    case "stock_rank":
      return (
        <StockRankMobile
          sessionId={sessionId}
          participantId={participantId}
          question={question}
        />
      );
    case "matrix_2x2":
      return (
        <MatrixVotingMobile
          sessionId={sessionId}
          participantId={participantId}
          question={question}
        />
      );
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Unknown voting mode</p>
        </div>
      );
  }
}
