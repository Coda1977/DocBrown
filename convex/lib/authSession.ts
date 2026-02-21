import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Check if the caller is the session owner (authenticated user)
 * or an active co-admin (via coAdminToken arg).
 * Returns the session if authorized, throws otherwise.
 */
export async function getAuthorizedSession(
  ctx: QueryCtx | MutationCtx,
  args: { sessionId: Id<"sessions">; coAdminToken?: string }
) {
  const session = await ctx.db.get(args.sessionId);
  if (!session) throw new Error("Session not found");

  // Check if authenticated owner
  const userId = await getAuthUserId(ctx);
  if (userId && session.userId === userId) {
    return session;
  }

  // Check if co-admin
  if (args.coAdminToken) {
    const coAdmin = await ctx.db
      .query("coAdmins")
      .withIndex("by_invite_token", (q) =>
        q.eq("inviteToken", args.coAdminToken!)
      )
      .first();
    if (coAdmin && coAdmin.sessionId === args.sessionId && coAdmin.isActive) {
      return session;
    }
  }

  throw new Error("Not authorized");
}
