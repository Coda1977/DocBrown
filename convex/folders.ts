import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("folders", {
      userId,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { folderId: v.id("folders"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) throw new Error("Folder not found");
    await ctx.db.patch(args.folderId, { name: args.name });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) throw new Error("Folder not found");

    // Unassign sessions from this folder
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    for (const session of sessions) {
      await ctx.db.patch(session._id, { folderId: undefined });
    }

    await ctx.db.delete(args.folderId);
  },
});
