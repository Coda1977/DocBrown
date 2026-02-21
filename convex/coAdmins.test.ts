import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.*s");

async function setupSession(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const asUser = t.withIdentity({ subject: userId });
  const sessionId = await asUser.mutation(api.sessions.create, {
    question: "Test?",
  });
  return { userId, asUser, sessionId };
}

describe("coAdmins", () => {
  test("createInvite returns a token starting with ca_", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    expect(token).toMatch(/^ca_/);
  });

  test("createInvite is idempotent: calling twice returns same token", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token1 = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    const token2 = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    expect(token1).toBe(token2);
  });

  test("createInvite by non-owner throws", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);
    const otherUser = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherUser });

    await expect(
      asOther.mutation(api.coAdmins.createInvite, { sessionId })
    ).rejects.toThrow("Session not found");
  });

  test("join sets isActive=true and displayName", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Alice",
    });

    const coAdmin = await t.query(api.coAdmins.getByToken, {
      inviteToken: token,
    });
    expect(coAdmin).not.toBeNull();
    expect(coAdmin!.isActive).toBe(true);
    expect(coAdmin!.displayName).toBe("Alice");
  });

  test("join with invalid token throws", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.coAdmins.join, {
        inviteToken: "invalid_token",
        displayName: "Alice",
      })
    ).rejects.toThrow("Invalid invite link");
  });

  test("join returns sessionId", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    const returnedSessionId = await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Bob",
    });
    expect(returnedSessionId).toBe(sessionId);
  });

  test("revoke deletes the coAdmin record", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Alice",
    });

    await asUser.mutation(api.coAdmins.revoke, { sessionId });

    const coAdmin = await t.query(api.coAdmins.getBySession, { sessionId });
    expect(coAdmin).toBeNull();
  });

  test("revoke by non-owner throws", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);
    const otherUser = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asOther = t.withIdentity({ subject: otherUser });

    await asUser.mutation(api.coAdmins.createInvite, { sessionId });

    await expect(
      asOther.mutation(api.coAdmins.revoke, { sessionId })
    ).rejects.toThrow("Session not found");
  });

  test("getBySession returns the coAdmin for a session", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });
    await t.mutation(api.coAdmins.join, {
      inviteToken: token,
      displayName: "Alice",
    });

    const coAdmin = await t.query(api.coAdmins.getBySession, { sessionId });
    expect(coAdmin).not.toBeNull();
    expect(coAdmin!.sessionId).toBe(sessionId);
  });

  test("getByToken returns the coAdmin by invite token", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const token = await asUser.mutation(api.coAdmins.createInvite, {
      sessionId,
    });

    const coAdmin = await t.query(api.coAdmins.getByToken, {
      inviteToken: token,
    });
    expect(coAdmin).not.toBeNull();
    expect(coAdmin!.inviteToken).toBe(token);
  });
});
