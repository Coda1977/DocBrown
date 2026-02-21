import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coAdmins")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const getByToken = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coAdmins")
      .withIndex("by_invite_token", (q) =>
        q.eq("inviteToken", args.inviteToken)
      )
      .first();
  },
});

export const createInvite = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    // Check if invite already exists
    const existing = await ctx.db
      .query("coAdmins")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) {
      return existing.inviteToken;
    }

    // Generate a unique invite token
    const token = `ca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    await ctx.db.insert("coAdmins", {
      sessionId: args.sessionId,
      displayName: "",
      inviteToken: token,
      isActive: false,
      joinedAt: Date.now(),
    });

    return token;
  },
});

export const join = mutation({
  args: {
    inviteToken: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const coAdmin = await ctx.db
      .query("coAdmins")
      .withIndex("by_invite_token", (q) =>
        q.eq("inviteToken", args.inviteToken)
      )
      .first();

    if (!coAdmin) throw new Error("Invalid invite link");

    await ctx.db.patch(coAdmin._id, {
      displayName: args.displayName,
      isActive: true,
      joinedAt: Date.now(),
    });

    return coAdmin.sessionId;
  },
});

export const revoke = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    const coAdmin = await ctx.db
      .query("coAdmins")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (coAdmin) {
      await ctx.db.delete(coAdmin._id);
    }
  },
});
