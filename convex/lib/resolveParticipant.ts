import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Resolve a participant token to a participant document,
 * validating that the participant belongs to the given session.
 * Throws if the token is invalid or the participant is in a different session.
 */
export async function resolveParticipant(
  ctx: QueryCtx | MutationCtx,
  args: { participantToken: string; sessionId: Id<"sessions"> }
) {
  const participant = await ctx.db
    .query("participants")
    .withIndex("by_token", (q) => q.eq("displayToken", args.participantToken))
    .first();

  if (!participant || participant.sessionId !== args.sessionId) {
    throw new Error("Participant not found or not in this session");
  }

  return participant;
}
