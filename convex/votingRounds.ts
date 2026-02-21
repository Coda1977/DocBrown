import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votingRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getActive = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const rounds = await ctx.db
      .query("votingRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
    return rounds[0] ?? null;
  },
});

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    mode: v.union(
      v.literal("dot_voting"),
      v.literal("stock_rank"),
      v.literal("matrix_2x2")
    ),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Not authorized");
    }

    const existing = await ctx.db
      .query("votingRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return await ctx.db.insert("votingRounds", {
      sessionId: args.sessionId,
      roundNumber: existing.length + 1,
      mode: args.mode,
      config: args.config,
      isRevealed: false,
      createdAt: Date.now(),
    });
  },
});

export const reveal = mutation({
  args: {
    roundId: v.id("votingRounds"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");

    const session = await ctx.db.get(round.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.roundId, { isRevealed: true });
  },
});
