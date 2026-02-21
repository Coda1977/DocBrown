"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ZAxis,
} from "recharts";
import { ExportSection } from "./ExportSection";
import { cn } from "@/lib/utils";

interface ActiveRound {
  _id: Id<"votingRounds">;
  mode: string;
  config: Record<string, unknown>;
  isRevealed: boolean;
  roundNumber?: number;
}

interface PostItData {
  _id: Id<"postIts">;
  text: string;
  color?: string;
}

interface ClusterInfo {
  _id: Id<"clusters">;
  label: string;
}

export function ResultsPanel({
  sessionId,
  activeRound,
  postIts,
  fullWidth,
  sessionMeta,
  clusters,
  allRounds,
  selectedRoundId,
  onSelectRound,
}: {
  sessionId: Id<"sessions">;
  activeRound: ActiveRound;
  postIts: PostItData[];
  fullWidth?: boolean;
  sessionMeta?: { question: string; shortCode: string; createdAt: number };
  clusters?: ClusterInfo[];
  allRounds?: ActiveRound[];
  selectedRoundId?: Id<"votingRounds">;
  onSelectRound?: (roundId: Id<"votingRounds">) => void;
}) {
  const displayRound =
    allRounds && selectedRoundId
      ? allRounds.find((r) => r._id === selectedRoundId) ?? activeRound
      : activeRound;

  const progress = useQuery(api.votes.votingProgress, {
    roundId: displayRound._id,
    sessionId,
  });

  const modeLabels: Record<string, string> = {
    dot_voting: "Dot",
    stock_rank: "Rank",
    matrix_2x2: "Matrix",
  };

  if (!displayRound.isRevealed) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          Results will appear when revealed by the facilitator.
        </p>
        {progress && (
          <p className="text-sm text-muted-foreground mt-2">
            {progress.voted} of {progress.total} have voted
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-4",
      fullWidth ? "max-w-4xl mx-auto px-8 py-8" : "p-6"
    )}>
      <h3 className={cn("font-semibold", fullWidth ? "text-2xl" : "text-lg")}>Results</h3>

      {/* Round tabs */}
      {allRounds && allRounds.length > 1 && onSelectRound && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {allRounds
            .filter((r) => r.isRevealed)
            .map((round) => (
              <button
                key={round._id}
                onClick={() => onSelectRound(round._id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  (selectedRoundId ?? activeRound._id) === round._id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Round {round.roundNumber ?? "?"} ({modeLabels[round.mode] ?? round.mode})
              </button>
            ))}
        </div>
      )}

      {progress && (
        <p className="text-sm text-muted-foreground">
          {progress.voted} of {progress.total} participants voted
        </p>
      )}

      {displayRound.mode === "dot_voting" && (
        <DotVotingResults
          activeRound={displayRound}
          postIts={postIts}
          fullWidth={fullWidth}
        />
      )}

      {displayRound.mode === "stock_rank" && (
        <StockRankResults
          activeRound={displayRound}
          postIts={postIts}
          fullWidth={fullWidth}
        />
      )}

      {displayRound.mode === "matrix_2x2" && (
        <MatrixResults
          activeRound={displayRound}
          postIts={postIts}
          fullWidth={fullWidth}
        />
      )}

      {sessionMeta && (
        <ExportSection
          activeRound={displayRound}
          postIts={postIts}
          clusters={clusters ?? []}
          sessionMeta={sessionMeta}
        />
      )}
    </div>
  );
}

function DotVotingResults({
  activeRound,
  postIts,
  fullWidth,
}: {
  activeRound: ActiveRound;
  postIts: PostItData[];
  fullWidth?: boolean;
}) {
  const aggregated = useQuery(api.votes.aggregateDotVotes, {
    roundId: activeRound._id,
  });

  const postItMap = new Map(postIts.map((p) => [p._id, p]));

  const chartData = (aggregated ?? [])
    .map((item) => {
      const postIt = postItMap.get(item.postItId as Id<"postIts">);
      return {
        name: postIt
          ? postIt.text.length > 30
            ? postIt.text.slice(0, 30) + "..."
            : postIt.text
          : "Unknown",
        points: item.total,
        fullText: postIt?.text ?? "",
      };
    })
    .slice(0, 15);

  return (
    <>
      {chartData.length > 0 ? (
        <div className={fullWidth ? "h-[500px]" : "h-[400px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={fullWidth ? 200 : 150}
                tick={{ fontSize: fullWidth ? 13 : 11 }}
              />
              <Tooltip
                formatter={(value) => [`${value} points`, "Score"]}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload as
                    | { fullText?: string }
                    | undefined;
                  return item?.fullText ?? String(_label);
                }}
              />
              <Bar
                dataKey="points"
                fill="var(--primary)"
                radius={[0, 6, 6, 0]}
                stroke="var(--foreground)"
                strokeWidth={0.5}
                strokeOpacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
      )}

      {/* Ranked list */}
      <div className={cn("space-y-2", fullWidth && "grid grid-cols-2 gap-x-8 gap-y-2 space-y-0")}>
        {(aggregated ?? []).map((item, idx) => {
          const postIt = postItMap.get(item.postItId as Id<"postIts">);
          return (
            <div key={item.postItId} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-6 text-right font-mono">
                {idx + 1}.
              </span>
              <span className="flex-1 truncate">{postIt?.text ?? "Unknown"}</span>
              <span className="font-semibold text-primary">{item.total} pts</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StockRankResults({
  activeRound,
  postIts,
  fullWidth,
}: {
  activeRound: ActiveRound;
  postIts: PostItData[];
  fullWidth?: boolean;
}) {
  const aggregated = useQuery(api.votes.aggregateStockRankVotes, {
    roundId: activeRound._id,
  });

  const postItMap = new Map(postIts.map((p) => [p._id, p]));

  const chartData = (aggregated ?? [])
    .map((item) => {
      const postIt = postItMap.get(item.postItId as Id<"postIts">);
      return {
        name: postIt
          ? postIt.text.length > 30
            ? postIt.text.slice(0, 30) + "..."
            : postIt.text
          : "Unknown",
        avgRank: Math.round(item.avgRank * 10) / 10,
        timesRanked: item.timesRanked,
        fullText: postIt?.text ?? "",
      };
    })
    .slice(0, 15);

  return (
    <>
      {chartData.length > 0 ? (
        <div className={fullWidth ? "h-[500px]" : "h-[400px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                label={{ value: "Avg Rank (lower is better)", position: "insideBottom", offset: -5, fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={fullWidth ? 200 : 150}
                tick={{ fontSize: fullWidth ? 13 : 11 }}
              />
              <Tooltip
                formatter={(value, _name, props) => {
                  const item = props?.payload as { timesRanked?: number } | undefined;
                  return [
                    `Avg rank: ${value} (ranked ${item?.timesRanked ?? 0} times)`,
                    "Score",
                  ];
                }}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload as
                    | { fullText?: string }
                    | undefined;
                  return item?.fullText ?? String(_label);
                }}
              />
              <Bar
                dataKey="avgRank"
                fill="var(--primary)"
                radius={[0, 6, 6, 0]}
                stroke="var(--foreground)"
                strokeWidth={0.5}
                strokeOpacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
      )}

      {/* Ranked list */}
      <div className={cn("space-y-2", fullWidth && "grid grid-cols-2 gap-x-8 gap-y-2 space-y-0")}>
        {(aggregated ?? []).map((item, idx) => {
          const postIt = postItMap.get(item.postItId as Id<"postIts">);
          return (
            <div key={item.postItId} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-6 text-right font-mono">
                {idx + 1}.
              </span>
              <span className="flex-1 truncate">{postIt?.text ?? "Unknown"}</span>
              <span className="font-semibold text-primary">
                avg {Math.round(item.avgRank * 10) / 10}
              </span>
              <span className="text-xs text-muted-foreground">
                ({item.timesRanked}x)
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MatrixResults({
  activeRound,
  postIts,
  fullWidth,
}: {
  activeRound: ActiveRound;
  postIts: PostItData[];
  fullWidth?: boolean;
}) {
  const aggregated = useQuery(api.votes.aggregateMatrixVotes, {
    roundId: activeRound._id,
  });

  const config = activeRound.config as {
    xAxisLabel?: string;
    yAxisLabel?: string;
  };
  const xLabel = config?.xAxisLabel ?? "X Axis";
  const yLabel = config?.yAxisLabel ?? "Y Axis";

  const postItMap = new Map(postIts.map((p) => [p._id, p]));

  const chartData = (aggregated ?? []).map((item) => {
    const postIt = postItMap.get(item.postItId as Id<"postIts">);
    return {
      x: Math.round(item.avgX * 10) / 10,
      y: Math.round(item.avgY * 10) / 10,
      name: postIt?.text ?? "Unknown",
      color: postIt?.color ?? "#fef9c3",
      count: item.count,
    };
  });

  return (
    <>
      {chartData.length > 0 ? (
        <div className={fullWidth ? "h-[500px]" : "h-[400px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0.5, 5.5]}
                tick={{ fontSize: 11 }}
                label={{ value: xLabel, position: "insideBottom", offset: -10, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0.5, 5.5]}
                tick={{ fontSize: 11 }}
                label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 0, fontSize: 12 }}
              />
              <ZAxis dataKey="count" range={[120, 300]} />
              <Tooltip
                formatter={(_value, name) => {
                  if (name === "x") return [_value, xLabel];
                  if (name === "y") return [_value, yLabel];
                  return [_value, name];
                }}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload as
                    | { name?: string }
                    | undefined;
                  return item?.name ?? "";
                }}
              />
              <ReferenceLine x={3} stroke="var(--border)" strokeDasharray="3 3" />
              <ReferenceLine y={3} stroke="var(--border)" strokeDasharray="3 3" />
              <Scatter data={chartData} fill="var(--primary)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
      )}

      {/* Listed results */}
      <div className={cn("space-y-2", fullWidth && "grid grid-cols-2 gap-x-8 gap-y-2 space-y-0")}>
        {(aggregated ?? []).map((item) => {
          const postIt = postItMap.get(item.postItId as Id<"postIts">);
          return (
            <div key={item.postItId} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate">{postIt?.text ?? "Unknown"}</span>
              <span className="text-xs text-muted-foreground">
                {xLabel}: {Math.round(item.avgX * 10) / 10}
              </span>
              <span className="text-xs text-muted-foreground">
                {yLabel}: {Math.round(item.avgY * 10) / 10}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
