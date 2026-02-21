import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const join = mutation({
  args: {
    sessionId: v.id("sessions"),
    displayToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") {
      throw new Error("Session not found or not active");
    }

    // Check if participant already exists with this token
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_token", (q) => q.eq("displayToken", args.displayToken))
      .first();

    if (existing && existing.sessionId === args.sessionId) {
      return existing._id;
    }

    return await ctx.db.insert("participants", {
      sessionId: args.sessionId,
      displayToken: args.displayToken,
      joinedAt: Date.now(),
    });
  },
});

export const reconnect = query({
  args: {
    displayToken: v.string(),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_token", (q) => q.eq("displayToken", args.displayToken))
      .first();

    if (participant && participant.sessionId === args.sessionId) {
      return participant;
    }
    return null;
  },
});

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
