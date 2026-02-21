import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const submitDotVotes = mutation({
  args: {
    roundId: v.id("votingRounds"),
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    votes: v.array(
      v.object({
        postItId: v.id("postIts"),
        points: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing votes for this participant in this round
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_participant_round", (q) =>
        q.eq("participantId", args.participantId).eq("roundId", args.roundId)
      )
      .collect();
    for (const vote of existing) {
      await ctx.db.delete(vote._id);
    }

    // Insert new votes
    for (const vote of args.votes) {
      if (vote.points > 0) {
        await ctx.db.insert("votes", {
          roundId: args.roundId,
          sessionId: args.sessionId,
          participantId: args.participantId,
          postItId: vote.postItId,
          value: vote.points,
        });
      }
    }
  },
});

export const aggregateDotVotes = query({
  args: { roundId: v.id("votingRounds") },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return [];

    // If reveal mode and not yet revealed, return empty
    // (The session's revealMode is checked in the frontend for flexibility)

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const totals: Record<string, number> = {};
    for (const vote of votes) {
      const key = vote.postItId as string;
      totals[key] = (totals[key] ?? 0) + (vote.value as number);
    }

    return Object.entries(totals)
      .map(([postItId, total]) => ({ postItId, total }))
      .sort((a, b) => b.total - a.total);
  },
});

export const participantVoteStatus = query({
  args: {
    roundId: v.id("votingRounds"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_participant_round", (q) =>
        q.eq("participantId", args.participantId).eq("roundId", args.roundId)
      )
      .collect();
    return { hasVoted: votes.length > 0, votes };
  },
});

export const submitStockRankVotes = mutation({
  args: {
    roundId: v.id("votingRounds"),
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    rankings: v.array(
      v.object({
        postItId: v.id("postIts"),
        rank: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing votes
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_participant_round", (q) =>
        q.eq("participantId", args.participantId).eq("roundId", args.roundId)
      )
      .collect();
    for (const vote of existing) {
      await ctx.db.delete(vote._id);
    }

    // Insert ranked votes
    for (const ranking of args.rankings) {
      await ctx.db.insert("votes", {
        roundId: args.roundId,
        sessionId: args.sessionId,
        participantId: args.participantId,
        postItId: ranking.postItId,
        value: { rank: ranking.rank },
      });
    }
  },
});

export const aggregateStockRankVotes = query({
  args: { roundId: v.id("votingRounds") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const stats: Record<string, { totalRank: number; count: number }> = {};
    for (const vote of votes) {
      const key = vote.postItId as string;
      const rank = (vote.value as { rank: number }).rank;
      if (!stats[key]) stats[key] = { totalRank: 0, count: 0 };
      stats[key].totalRank += rank;
      stats[key].count += 1;
    }

    return Object.entries(stats)
      .map(([postItId, { totalRank, count }]) => ({
        postItId,
        avgRank: totalRank / count,
        timesRanked: count,
      }))
      .sort((a, b) => a.avgRank - b.avgRank);
  },
});

export const submitMatrixVotes = mutation({
  args: {
    roundId: v.id("votingRounds"),
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    ratings: v.array(
      v.object({
        postItId: v.id("postIts"),
        x: v.number(),
        y: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing votes
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_participant_round", (q) =>
        q.eq("participantId", args.participantId).eq("roundId", args.roundId)
      )
      .collect();
    for (const vote of existing) {
      await ctx.db.delete(vote._id);
    }

    // Insert matrix votes
    for (const rating of args.ratings) {
      await ctx.db.insert("votes", {
        roundId: args.roundId,
        sessionId: args.sessionId,
        participantId: args.participantId,
        postItId: rating.postItId,
        value: { x: rating.x, y: rating.y },
      });
    }
  },
});

export const aggregateMatrixVotes = query({
  args: { roundId: v.id("votingRounds") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const stats: Record<
      string,
      { totalX: number; totalY: number; count: number }
    > = {};
    for (const vote of votes) {
      const key = vote.postItId as string;
      const val = vote.value as { x: number; y: number };
      if (!stats[key]) stats[key] = { totalX: 0, totalY: 0, count: 0 };
      stats[key].totalX += val.x;
      stats[key].totalY += val.y;
      stats[key].count += 1;
    }

    return Object.entries(stats)
      .map(([postItId, { totalX, totalY, count }]) => ({
        postItId,
        avgX: totalX / count,
        avgY: totalY / count,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  },
});

export const votingProgress = query({
  args: {
    roundId: v.id("votingRounds"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const voterIds = new Set(votes.map((v) => v.participantId as string));

    return {
      total: participants.length,
      voted: voterIds.size,
    };
  },
});
