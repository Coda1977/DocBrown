import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.*s");

const VALID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

describe("sessions CRUD", () => {
  test("create: phase=collect, status=active, 6-char shortCode", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "What matters?",
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).not.toBeNull();
    expect(session!.phase).toBe("collect");
    expect(session!.status).toBe("active");
    expect(session!.shortCode).toHaveLength(6);
    expect(session!.question).toBe("What matters?");
  });

  test("create: default participantVisibility=true", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test",
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.participantVisibility).toBe(true);
  });

  test("create: accepts optional folderId", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const folderId = await asUser.mutation(api.folders.create, {
      name: "My Folder",
    });
    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test",
      folderId,
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.folderId).toBe(folderId);
  });

  test("create: unauthenticated user throws", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.sessions.create, { question: "Test?" })
    ).rejects.toThrow("Not authenticated");
  });

  test("create: shortCode uses valid charset", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test",
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    for (const char of session!.shortCode!) {
      expect(VALID_CHARS).toContain(char);
    }
  });

  test("duplicate: copies question, visibility, revealMode, folderId", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const folderId = await asUser.mutation(api.folders.create, {
      name: "Folder",
    });
    const originalId = await asUser.mutation(api.sessions.create, {
      question: "Original Q",
      participantVisibility: false,
      folderId,
    });

    const dupId = await asUser.mutation(api.sessions.duplicate, {
      sessionId: originalId,
    });
    const dup = await t.run(async (ctx) => ctx.db.get(dupId));
    const orig = await t.run(async (ctx) => ctx.db.get(originalId));

    expect(dup!.question).toBe(orig!.question);
    expect(dup!.participantVisibility).toBe(orig!.participantVisibility);
    expect(dup!.revealMode).toBe(orig!.revealMode);
    expect(dup!.folderId).toBe(orig!.folderId);
  });

  test("duplicate: generates NEW shortCode", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const originalId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    const dupId = await asUser.mutation(api.sessions.duplicate, {
      sessionId: originalId,
    });

    const orig = await t.run(async (ctx) => ctx.db.get(originalId));
    const dup = await t.run(async (ctx) => ctx.db.get(dupId));
    expect(dup!.shortCode).not.toBe(orig!.shortCode);
  });

  test("duplicate: resets phase to collect, status to active", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const originalId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    // Advance the original past collect
    await asUser.mutation(api.sessions.advancePhase, {
      sessionId: originalId,
    });

    const dupId = await asUser.mutation(api.sessions.duplicate, {
      sessionId: originalId,
    });
    const dup = await t.run(async (ctx) => ctx.db.get(dupId));
    expect(dup!.phase).toBe("collect");
    expect(dup!.status).toBe("active");
  });

  test("duplicate: does NOT copy postIts", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const originalId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.postIts.create, {
      sessionId: originalId,
      text: "Note 1",
    });

    const dupId = await asUser.mutation(api.sessions.duplicate, {
      sessionId: originalId,
    });
    const postIts = await t.query(api.postIts.bySession, {
      sessionId: dupId,
    });
    expect(postIts).toHaveLength(0);
  });

  test("update: owner can update question", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Old Q",
    });
    await asUser.mutation(api.sessions.update, {
      sessionId,
      question: "New Q",
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.question).toBe("New Q");
  });

  test("update: non-owner throws", async () => {
    const t = convexTest(schema, modules);
    const user1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const user2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    const sessionId = await asUser1.mutation(api.sessions.create, {
      question: "Q",
    });
    await expect(
      asUser2.mutation(api.sessions.update, {
        sessionId,
        question: "Hack",
      })
    ).rejects.toThrow("Session not found");
  });

  test("update: undefined fields are not patched", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.sessions.update, {
      sessionId,
      status: "completed",
    });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.question).toBe("Q"); // unchanged
    expect(session!.status).toBe("completed");
  });

  test("list: returns only authenticated user's sessions", async () => {
    const t = convexTest(schema, modules);
    const user1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const user2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    await asUser1.mutation(api.sessions.create, { question: "U1 Session" });
    await asUser2.mutation(api.sessions.create, { question: "U2 Session" });

    const u1Sessions = await asUser1.query(api.sessions.list, {});
    const u2Sessions = await asUser2.query(api.sessions.list, {});
    expect(u1Sessions).toHaveLength(1);
    expect(u2Sessions).toHaveLength(1);
    expect(u1Sessions[0].question).toBe("U1 Session");
    expect(u2Sessions[0].question).toBe("U2 Session");
  });

  test("list: excludes archived by default", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const s1 = await asUser.mutation(api.sessions.create, {
      question: "Active",
    });
    const s2 = await asUser.mutation(api.sessions.create, {
      question: "Archived",
    });
    await asUser.mutation(api.sessions.update, {
      sessionId: s2,
      status: "archived",
    });

    const sessions = await asUser.query(api.sessions.list, {});
    expect(sessions).toHaveLength(1);
    expect(sessions[0].question).toBe("Active");

    // With includeArchived
    const all = await asUser.query(api.sessions.list, {
      includeArchived: true,
    });
    expect(all).toHaveLength(2);
  });

  test("list: filters by status", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.sessions.create, { question: "S1" });
    const s2 = await asUser.mutation(api.sessions.create, { question: "S2" });
    await asUser.mutation(api.sessions.update, {
      sessionId: s2,
      status: "completed",
    });

    const completed = await asUser.query(api.sessions.list, {
      status: "completed",
    });
    expect(completed).toHaveLength(1);
    expect(completed[0].question).toBe("S2");
  });

  test("remove: owner can delete", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Delete me",
    });
    await asUser.mutation(api.sessions.remove, { sessionId });
    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).toBeNull();
  });

  test("remove: non-owner throws", async () => {
    const t = convexTest(schema, modules);
    const user1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const user2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    const sessionId = await asUser1.mutation(api.sessions.create, {
      question: "Q",
    });
    await expect(
      asUser2.mutation(api.sessions.remove, { sessionId })
    ).rejects.toThrow("Session not found");
  });
});

describe("sessions phase transitions", () => {
  test("advancePhase: collect -> organize", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    const next = await asUser.mutation(api.sessions.advancePhase, {
      sessionId,
    });
    expect(next).toBe("organize");
  });

  test("advancePhase: organize -> vote", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    const next = await asUser.mutation(api.sessions.advancePhase, {
      sessionId,
    });
    expect(next).toBe("vote");
  });

  test("advancePhase: vote -> results", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    const next = await asUser.mutation(api.sessions.advancePhase, {
      sessionId,
    });
    expect(next).toBe("results");
  });

  test("advancePhase: results -> throws Already at final phase", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });

    await expect(
      asUser.mutation(api.sessions.advancePhase, { sessionId })
    ).rejects.toThrow("Already at final phase");
  });

  test("advancePhase: co-admin with valid token can advance", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Helper",
    });

    const next = await t.mutation(api.sessions.advancePhase, {
      sessionId,
      coAdminToken: token,
    });
    expect(next).toBe("organize");
  });

  test("advancePhase: unauthorized user is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await expect(
      t.mutation(api.sessions.advancePhase, { sessionId })
    ).rejects.toThrow("Not authorized");
  });

  test("revertPhase: deletes all votes and votingRounds", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    // Advance to vote, create a round and some votes
    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });

    const roundId = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: { pointsPerParticipant: 5 },
    });

    // Create a participant and submit votes
    await t.run(async (ctx) =>
      ctx.db.insert("participants", {
        sessionId,
        displayToken: "tok123",
        joinedAt: Date.now(),
      })
    );
    const postItId = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Note",
    });

    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantToken: "tok123",
      votes: [{ postItId, points: 3 }],
    });

    // Revert to organize
    await asUser.mutation(api.sessions.revertPhase, {
      sessionId,
      targetPhase: "organize",
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.phase).toBe("organize");

    // Votes and rounds should be deleted
    const rounds = await t.query(api.votingRounds.bySession, { sessionId });
    expect(rounds).toHaveLength(0);
  });

  test("revertPhase: cannot revert to same or later phase", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.sessions.advancePhase, { sessionId }); // -> organize

    await expect(
      asUser.mutation(api.sessions.revertPhase, {
        sessionId,
        targetPhase: "organize", // same phase
      })
    ).rejects.toThrow("Can only revert to an earlier phase");
  });

  test("revertPhase: post-its are NOT deleted", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
    });
    await asUser.mutation(api.postIts.create, { sessionId, text: "Note 1" });
    await asUser.mutation(api.postIts.create, { sessionId, text: "Note 2" });

    await asUser.mutation(api.sessions.advancePhase, { sessionId });
    await asUser.mutation(api.sessions.advancePhase, { sessionId });

    // Revert to collect
    await asUser.mutation(api.sessions.revertPhase, {
      sessionId,
      targetPhase: "collect",
    });

    const postIts = await t.query(api.postIts.bySession, { sessionId });
    expect(postIts).toHaveLength(2);
  });
});
