import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const bySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clusters")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    label: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clusters", {
      sessionId: args.sessionId,
      label: args.label,
      positionX: args.positionX,
      positionY: args.positionY,
      color: args.color ?? "#f5f5f4",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    clusterId: v.id("clusters"),
    label: v.optional(v.string()),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clusterId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(clusterId, filtered);
    }
  },
});

export const remove = mutation({
  args: { clusterId: v.id("clusters") },
  handler: async (ctx, args) => {
    // Unassign post-its from this cluster
    const cluster = await ctx.db.get(args.clusterId);
    if (!cluster) return;

    const postIts = await ctx.db
      .query("postIts")
      .withIndex("by_session", (q) => q.eq("sessionId", cluster.sessionId))
      .collect();

    for (const postIt of postIts) {
      if (postIt.clusterId === args.clusterId) {
        await ctx.db.patch(postIt._id, { clusterId: undefined });
      }
    }

    await ctx.db.delete(args.clusterId);
  },
});
