import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthorizedSession } from "./lib/authSession";
import { resolveParticipant } from "./lib/resolveParticipant";

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
    participantToken: v.optional(v.string()),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    let resolvedParticipantId: Id<"participants"> | undefined;

    if (args.participantToken) {
      // Participant path: resolve token server-side, verify session membership
      const participant = await resolveParticipant(ctx, {
        participantToken: args.participantToken,
        sessionId: args.sessionId,
      });
      resolvedParticipantId = participant._id;
      if (session.phase !== "collect") {
        throw new Error("Session is not in collect phase");
      }
    } else {
      // Admin path: owner or co-admin
      await getAuthorizedSession(ctx, {
        sessionId: args.sessionId,
        coAdminToken: args.coAdminToken,
      });
    }

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
      participantId: resolvedParticipantId,
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
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postIt = await ctx.db.get(args.postItId);
    if (!postIt) throw new Error("Post-it not found");
    await getAuthorizedSession(ctx, {
      sessionId: postIt.sessionId,
      coAdminToken: args.coAdminToken,
    });
    await ctx.db.patch(args.postItId, { text: args.text });
  },
});

export const move = mutation({
  args: {
    postItId: v.id("postIts"),
    positionX: v.number(),
    positionY: v.number(),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postIt = await ctx.db.get(args.postItId);
    if (!postIt) throw new Error("Post-it not found");
    await getAuthorizedSession(ctx, {
      sessionId: postIt.sessionId,
      coAdminToken: args.coAdminToken,
    });
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
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postIt = await ctx.db.get(args.postItId);
    if (!postIt) throw new Error("Post-it not found");
    await getAuthorizedSession(ctx, {
      sessionId: postIt.sessionId,
      coAdminToken: args.coAdminToken,
    });
    await ctx.db.patch(args.postItId, { clusterId: args.clusterId });
  },
});

export const remove = mutation({
  args: {
    postItId: v.id("postIts"),
    coAdminToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postIt = await ctx.db.get(args.postItId);
    if (!postIt) throw new Error("Post-it not found");
    await getAuthorizedSession(ctx, {
      sessionId: postIt.sessionId,
      coAdminToken: args.coAdminToken,
    });
    await ctx.db.delete(args.postItId);
  },
});
