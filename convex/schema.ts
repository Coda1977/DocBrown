import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Folders for organizing sessions
  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Workshop sessions (one question per session)
  sessions: defineTable({
    userId: v.id("users"),
    folderId: v.optional(v.id("folders")),
    question: v.string(),
    shortCode: v.optional(v.string()),
    phase: v.union(
      v.literal("collect"),
      v.literal("organize"),
      v.literal("vote"),
      v.literal("results")
    ),
    participantVisibility: v.boolean(),
    revealMode: v.union(v.literal("live"), v.literal("reveal")),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    timerEnabled: v.boolean(),
    timerSeconds: v.optional(v.number()),
    timerStartedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_short_code", ["shortCode"])
    .index("by_folder", ["folderId"])
    .index("by_status", ["status"]),

  // Anonymous participants (no auth, just a session token)
  participants: defineTable({
    sessionId: v.id("sessions"),
    displayToken: v.string(),
    joinedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_token", ["displayToken"]),

  // Co-admin (1 per session, optional)
  coAdmins: defineTable({
    sessionId: v.id("sessions"),
    displayName: v.string(),
    inviteToken: v.string(),
    isActive: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_invite_token", ["inviteToken"]),

  // Post-it answers
  postIts: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.optional(v.id("participants")),
    text: v.string(),
    clusterId: v.optional(v.id("clusters")),
    positionX: v.number(),
    positionY: v.number(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Named clusters/groups on the canvas
  clusters: defineTable({
    sessionId: v.id("sessions"),
    label: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    color: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Voting configuration per round
  votingRounds: defineTable({
    sessionId: v.id("sessions"),
    roundNumber: v.number(),
    mode: v.union(
      v.literal("dot_voting"),
      v.literal("stock_rank"),
      v.literal("matrix_2x2")
    ),
    config: v.any(),
    isRevealed: v.boolean(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Individual votes
  votes: defineTable({
    roundId: v.id("votingRounds"),
    sessionId: v.id("sessions"),
    participantId: v.id("participants"),
    postItId: v.id("postIts"),
    value: v.any(),
  })
    .index("by_round", ["roundId"])
    .index("by_participant_round", ["participantId", "roundId"])
    .index("by_session", ["sessionId"]),

  // AI-generated content
  aiResults: defineTable({
    sessionId: v.id("sessions"),
    type: v.union(v.literal("clustering"), v.literal("summary")),
    content: v.any(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
