import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
const modules = import.meta.glob("../**/*.*s");

describe("getAuthorizedSession (tested via advancePhase)", () => {
  test("owner (authenticated user who created session) gets access", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test?",
    });
    // Owner should be able to advance phase (calls getAuthorizedSession internally)
    const next = await asUser.mutation(api.sessions.advancePhase, {
      sessionId,
    });
    expect(next).toBe("organize");
  });

  test("active co-admin with valid token gets access", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test?",
    });
    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    // Join as co-admin (activates the token)
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Co-Admin",
    });

    // Co-admin should be able to advance phase via token
    const next = await t.mutation(api.sessions.advancePhase, {
      sessionId,
      coAdminToken: token,
    });
    expect(next).toBe("organize");
  });

  test("inactive co-admin (isActive=false) is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test?",
    });
    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    // Do NOT join - token is inactive

    await expect(
      t.mutation(api.sessions.advancePhase, {
        sessionId,
        coAdminToken: token,
      })
    ).rejects.toThrow("Not authorized");
  });

  test("co-admin token for a different session is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const session1 = await asUser.mutation(api.sessions.create, {
      question: "Session 1",
    });
    const session2 = await asUser.mutation(api.sessions.create, {
      question: "Session 2",
    });

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId: session1,
    });
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Co-Admin",
    });

    // Try using session1's co-admin token on session2
    await expect(
      t.mutation(api.sessions.advancePhase, {
        sessionId: session2,
        coAdminToken: token,
      })
    ).rejects.toThrow("Not authorized");
  });

  test("no auth (no userId, no coAdminToken) throws Not authorized", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test?",
    });

    // Call without auth context
    await expect(
      t.mutation(api.sessions.advancePhase, { sessionId })
    ).rejects.toThrow("Not authorized");
  });

  test("non-existent session throws Session not found", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    // Create a session to get a valid-format ID, then delete it
    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Test?",
    });
    await asUser.mutation(api.sessions.remove, { sessionId });

    await expect(
      asUser.mutation(api.sessions.advancePhase, { sessionId })
    ).rejects.toThrow("Session not found");
  });
});
