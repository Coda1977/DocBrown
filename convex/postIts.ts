import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const POST_IT_COLORS = [
  "#fef9c3", // yellow
  "#ffe0de", // coral
  "#d2f7ea", // teal
  "#ede5ff", // purple
  "#dbeafe", // blue
  "#fce7f3", // pink
];

function randomColor() {
  return POST_IT_COLORS[Math.floor(Math.random() * POST_IT_COLORS.length)];
}

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postIts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Auto-layout: count existing post-its to compute grid position
    const existing = await ctx.db
      .query("postIts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const cols = 5;
    const cardW = 180;
    const cardH = 140;
    const gap = 20;
    const idx = existing.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const positionX = 40 + col * (cardW + gap);
    const positionY = 40 + row * (cardH + gap);

    return await ctx.db.insert("postIts", {
      sessionId: args.sessionId,
      participantId: args.participantId,
      text: args.text,
      positionX,
      positionY,
      color: randomColor(),
      createdAt: Date.now(),
    });
  },
});

export const updateText = mutation({
  args: {
    postItId: v.id("postIts"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postItId, { text: args.text });
  },
});

export const move = mutation({
  args: {
    postItId: v.id("postIts"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postItId, {
      positionX: args.positionX,
      positionY: args.positionY,
    });
  },
});

export const setCluster = mutation({
  args: {
    postItId: v.id("postIts"),
    clusterId: v.optional(v.id("clusters")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postItId, { clusterId: args.clusterId });
  },
});

export const remove = mutation({
  args: { postItId: v.id("postIts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.postItId);
  },
});
