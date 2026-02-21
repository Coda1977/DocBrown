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

describe("participants", () => {
  test("join creates a participant with displayToken and sessionId", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const participantId = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-abc",
    });
    const participant = await t.run(async (ctx) =>
      ctx.db.get(participantId)
    );
    expect(participant).not.toBeNull();
    expect(participant!.displayToken).toBe("token-abc");
    expect(participant!.sessionId).toBe(sessionId);
  });

  test("join is idempotent: same token + same session returns same ID", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id1 = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-abc",
    });
    const id2 = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-abc",
    });
    expect(id1).toBe(id2);
  });

  test("join with different token creates a new participant", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id1 = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-1",
    });
    const id2 = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-2",
    });
    expect(id1).not.toBe(id2);
  });

  test("join to inactive session throws", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await asUser.mutation(api.sessions.update, {
      sessionId,
      status: "archived",
    });

    await expect(
      t.mutation(api.participants.join, {
        sessionId,
        displayToken: "token-abc",
      })
    ).rejects.toThrow("Session not found or not active");
  });

  test("reconnect finds existing participant by token + sessionId", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const participantId = await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-abc",
    });

    const found = await t.query(api.participants.reconnect, {
      displayToken: "token-abc",
      sessionId,
    });
    expect(found).not.toBeNull();
    expect(found!._id).toBe(participantId);
  });

  test("reconnect returns null if token exists but for different session", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "token-abc",
    });

    const session2 = await asUser.mutation(api.sessions.create, {
      question: "Other",
    });

    const found = await t.query(api.participants.reconnect, {
      displayToken: "token-abc",
      sessionId: session2,
    });
    expect(found).toBeNull();
  });

  test("reconnect returns null if token does not exist", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const found = await t.query(api.participants.reconnect, {
      displayToken: "nonexistent",
      sessionId,
    });
    expect(found).toBeNull();
  });

  test("bySession returns all participants for a session", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "tok-1",
    });
    await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "tok-2",
    });
    await t.mutation(api.participants.join, {
      sessionId,
      displayToken: "tok-3",
    });

    const all = await t.query(api.participants.bySession, { sessionId });
    expect(all).toHaveLength(3);
  });
});
