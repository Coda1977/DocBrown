import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateShortCode } from "./lib/shortCode";
import { getAuthorizedSession } from "./lib/authSession";

export const list = query({
  args: {
    folderId: v.optional(v.id("folders")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let sessions;
    if (args.folderId) {
      sessions = await ctx.db
        .query("sessions")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
        .order("desc")
        .collect();
      // Filter to only this user's sessions
      sessions = sessions.filter((s) => s.userId === userId);
    } else {
      sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    // Filter by status
    if (args.status) {
      sessions = sessions.filter((s) => s.status === args.status);
    } else if (!args.includeArchived) {
      sessions = sessions.filter((s) => s.status !== "archived");
    }

    return sessions;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_short_code", (q) => q.eq("shortCode", args.shortCode))
      .first();
  },
});

export const create = mutation({
  args: {
    question: v.string(),
    participantVisibility: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate unique short code
    let shortCode: string;
    let existing;
    do {
      shortCode = generateShortCode();
      existing = await ctx.db
        .query("sessions")
        .withIndex("by_short_code", (q) => q.eq("shortCode", shortCode))
        .first();
    } while (existing);

    return await ctx.db.insert("sessions", {
      userId,
      folderId: args.folderId,
      question: args.question,
      shortCode,
      phase: "collect",
      participantVisibility: args.participantVisibility ?? true,
      revealMode: "live",
      status: "active",
      timerEnabled: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    question: v.optional(v.string()),
    participantVisibility: v.optional(v.boolean()),
    revealMode: v.optional(v.union(v.literal("live"), v.literal("reveal"))),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    const { sessionId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(sessionId, filtered);
    }
  },
});

export const advancePhase = mutation({
  args: {
    sessionId: v.id("sessions"),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getAuthorizedSession(ctx, args);

    const order: Array<"collect" | "organize" | "vote" | "results"> = [
      "collect",
      "organize",
      "vote",
      "results",
    ];
    const currentIdx = order.indexOf(session.phase);
    if (currentIdx >= order.length - 1) {
      throw new Error("Already at final phase");
    }

    const nextPhase = order[currentIdx + 1];
    await ctx.db.patch(args.sessionId, { phase: nextPhase });
    return nextPhase;
  },
});

export const revertPhase = mutation({
  args: {
    sessionId: v.id("sessions"),
    targetPhase: v.union(
      v.literal("collect"),
      v.literal("organize"),
      v.literal("vote")
    ),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getAuthorizedSession(ctx, args);

    const order = ["collect", "organize", "vote", "results"];
    const currentIdx = order.indexOf(session.phase);
    const targetIdx = order.indexOf(args.targetPhase);
    if (targetIdx >= currentIdx) {
      throw new Error("Can only revert to an earlier phase");
    }

    // If reverting past vote phase, delete all votes and voting rounds
    if (args.targetPhase === "collect" || args.targetPhase === "organize") {
      const rounds = await ctx.db
        .query("votingRounds")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      for (const round of rounds) {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_round", (q) => q.eq("roundId", round._id))
          .collect();
        for (const vote of votes) {
          await ctx.db.delete(vote._id);
        }
        await ctx.db.delete(round._id);
      }
    }

    await ctx.db.patch(args.sessionId, { phase: args.targetPhase });
    return args.targetPhase;
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    await ctx.db.delete(args.sessionId);
  },
});

export const duplicate = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Generate unique short code
    let shortCode: string;
    let existing;
    do {
      shortCode = generateShortCode();
      existing = await ctx.db
        .query("sessions")
        .withIndex("by_short_code", (q) => q.eq("shortCode", shortCode))
        .first();
    } while (existing);

    return await ctx.db.insert("sessions", {
      userId,
      folderId: session.folderId,
      question: session.question,
      shortCode,
      phase: "collect",
      participantVisibility: session.participantVisibility,
      revealMode: session.revealMode,
      status: "active",
      timerEnabled: false,
      createdAt: Date.now(),
    });
  },
});

export const moveToFolder = mutation({
  args: {
    sessionId: v.id("sessions"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { folderId: args.folderId });
  },
});

export const startTimer = mutation({
  args: {
    sessionId: v.id("sessions"),
    seconds: v.number(),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthorizedSession(ctx, args);
    await ctx.db.patch(args.sessionId, {
      timerEnabled: true,
      timerSeconds: args.seconds,
      timerStartedAt: Date.now(),
    });
  },
});

export const stopTimer = mutation({
  args: {
    sessionId: v.id("sessions"),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthorizedSession(ctx, args);
    await ctx.db.patch(args.sessionId, {
      timerEnabled: false,
      timerStartedAt: undefined,
    });
  },
});

export const resetTimer = mutation({
  args: {
    sessionId: v.id("sessions"),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthorizedSession(ctx, args);
    await ctx.db.patch(args.sessionId, {
      timerEnabled: false,
      timerSeconds: undefined,
      timerStartedAt: undefined,
    });
  },
});

export const participantCount = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return participants.length;
  },
});
