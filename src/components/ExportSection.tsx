"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ExportButtons } from "./ExportButtons";

interface ActiveRound {
  _id: Id<"votingRounds">;
  mode: string;
  config: Record<string, unknown>;
  isRevealed: boolean;
}

interface PostItData {
  _id: Id<"postIts">;
  text: string;
  color?: string;
  clusterId?: Id<"clusters">;
}

interface ClusterInfo {
  _id: Id<"clusters">;
  label: string;
}

export function ExportSection({
  activeRound,
  postIts,
  clusters,
  sessionMeta,
}: {
  activeRound: ActiveRound;
  postIts: PostItData[];
  clusters: ClusterInfo[];
  sessionMeta: { question: string; shortCode: string; createdAt: number };
}) {
  const dotResults = useQuery(
    api.votes.aggregateDotVotes,
    activeRound.mode === "dot_voting"
      ? { roundId: activeRound._id }
      : "skip"
  );
  const stockResults = useQuery(
    api.votes.aggregateStockRankVotes,
    activeRound.mode === "stock_rank"
      ? { roundId: activeRound._id }
      : "skip"
  );
  const matrixResults = useQuery(
    api.votes.aggregateMatrixVotes,
    activeRound.mode === "matrix_2x2"
      ? { roundId: activeRound._id }
      : "skip"
  );

  const postItData = postIts.map((p) => ({
    _id: p._id as string,
    text: p.text,
    clusterId: p.clusterId as string | undefined,
  }));

  const clusterData = clusters.map((c) => ({
    _id: c._id as string,
    label: c.label,
  }));

  let data;
  if (activeRound.mode === "dot_voting" && dotResults) {
    data = {
      mode: "dot_voting" as const,
      results: dotResults,
    };
  } else if (activeRound.mode === "stock_rank" && stockResults) {
    data = {
      mode: "stock_rank" as const,
      results: stockResults,
    };
  } else if (activeRound.mode === "matrix_2x2" && matrixResults) {
    const config = activeRound.config as {
      xAxisLabel?: string;
      yAxisLabel?: string;
    };
    data = {
      mode: "matrix_2x2" as const,
      results: matrixResults,
      config,
    };
  }

  if (!data) return null;

  return (
    <div className="pt-4 border-t border-border">
      <ExportButtons
        data={data}
        postIts={postItData}
        clusters={clusterData}
        sessionMeta={sessionMeta}
      />
    </div>
  );
}
