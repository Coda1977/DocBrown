import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.*s");

const FIGJAM_COLORS = [
  "#fef9c3",
  "#ffe0de",
  "#d2f7ea",
  "#ede5ff",
  "#dbeafe",
  "#fce7f3",
];

async function setupSession(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const asUser = t.withIdentity({ subject: userId });
  const sessionId = await asUser.mutation(api.sessions.create, {
    question: "Test?",
  });
  return { userId, asUser, sessionId };
}

describe("postIts auto-grid", () => {
  test("first postIt at position (40, 40)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "First",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(40);
    expect(postIt!.positionY).toBe(40);
  });

  test("second postIt at (240, 40) -- col 1", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await asUser.mutation(api.postIts.create, { sessionId, text: "1st" });
    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "2nd",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(240); // 40 + 1*(180+20)
    expect(postIt!.positionY).toBe(40);
  });

  test("5th postIt at (840, 40) -- col 4", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    for (let i = 0; i < 4; i++) {
      await asUser.mutation(api.postIts.create, { sessionId, text: `Note ${i}` });
    }
    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "5th",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(840); // 40 + 4*(180+20)
    expect(postIt!.positionY).toBe(40);
  });

  test("6th postIt wraps to row 1: (40, 200)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    for (let i = 0; i < 5; i++) {
      await asUser.mutation(api.postIts.create, { sessionId, text: `Note ${i}` });
    }
    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "6th",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(40); // col 0
    expect(postIt!.positionY).toBe(200); // 40 + 1*(140+20)
  });

  test("color is one of the 6 FigJam palette colors", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Colorful",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(FIGJAM_COLORS).toContain(postIt!.color);
  });

  test("non-existent session throws", async () => {
    const t = convexTest(schema, modules);
    const { sessionId, asUser } = await setupSession(t);
    await asUser.mutation(api.sessions.remove, { sessionId });

    await expect(
      asUser.mutation(api.postIts.create, { sessionId, text: "Orphan" })
    ).rejects.toThrow("Session not found");
  });
});

describe("postIts CRUD", () => {
  test("updateText patches text (owner auth)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Old",
    });
    await asUser.mutation(api.postIts.updateText, { postItId: id, text: "New" });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.text).toBe("New");
  });

  test("move patches positionX and positionY (owner auth)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Moveable",
    });
    await asUser.mutation(api.postIts.move, {
      postItId: id,
      positionX: 500,
      positionY: 300,
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(500);
    expect(postIt!.positionY).toBe(300);
  });

  test("setCluster patches clusterId (and can set to undefined)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const clusterId = await t.run(async (ctx) =>
      ctx.db.insert("clusters", {
        sessionId,
        label: "Group A",
        positionX: 0,
        positionY: 0,
        createdAt: Date.now(),
      })
    );
    const postItId = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Note",
    });

    // Assign to cluster
    await asUser.mutation(api.postIts.setCluster, { postItId, clusterId });
    let postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt!.clusterId).toBe(clusterId);

    // Unassign
    await asUser.mutation(api.postIts.setCluster, {
      postItId,
      clusterId: undefined,
    });
    postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt!.clusterId).toBeUndefined();
  });

  test("remove deletes the postIt (owner auth)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Gone",
    });
    await asUser.mutation(api.postIts.remove, { postItId: id });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt).toBeNull();
  });
});

describe("postIts auth", () => {
  test("unauthenticated updateText throws", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Test",
    });

    await expect(
      t.mutation(api.postIts.updateText, { postItId: id, text: "Hacked" })
    ).rejects.toThrow("Not authorized");
  });

  test("unauthenticated move throws", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Test",
    });

    await expect(
      t.mutation(api.postIts.move, { postItId: id, positionX: 0, positionY: 0 })
    ).rejects.toThrow("Not authorized");
  });

  test("unauthenticated remove throws", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Test",
    });

    await expect(
      t.mutation(api.postIts.remove, { postItId: id })
    ).rejects.toThrow("Not authorized");
  });

  test("unauthenticated create (no participant, no auth) throws", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    await expect(
      t.mutation(api.postIts.create, { sessionId, text: "Hacked" })
    ).rejects.toThrow("Not authorized");
  });

  test("participant create works in collect phase", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    // Create a participant
    const participantId = await t.run(async (ctx) =>
      ctx.db.insert("participants", {
        sessionId,
        displayToken: "token-abc",
        joinedAt: Date.now(),
      })
    );

    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Participant note",
      participantToken: "token-abc",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.text).toBe("Participant note");
    expect(postIt!.participantId).toBe(participantId);
  });

  test("participant create throws when session not in collect phase", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    // Advance to organize phase
    await asUser.mutation(api.sessions.advancePhase, { sessionId });

    await t.run(async (ctx) =>
      ctx.db.insert("participants", {
        sessionId,
        displayToken: "token-xyz",
        joinedAt: Date.now(),
      })
    );

    await expect(
      t.mutation(api.postIts.create, {
        sessionId,
        text: "Late note",
        participantToken: "token-xyz",
      })
    ).rejects.toThrow("Session is not in collect phase");
  });

  test("participant from different session cannot create post-it", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    // Create another session
    const otherSessionId = await asUser.mutation(api.sessions.create, {
      question: "Other?",
    });

    // Create participant in the other session
    await t.run(async (ctx) =>
      ctx.db.insert("participants", {
        sessionId: otherSessionId,
        displayToken: "token-other",
        joinedAt: Date.now(),
      })
    );

    // Try to create post-it in first session with other session's participant token
    await expect(
      t.mutation(api.postIts.create, {
        sessionId,
        text: "Cross-session",
        participantToken: "token-other",
      })
    ).rejects.toThrow("Participant not found or not in this session");
  });

  test("co-admin can updateText with coAdminToken", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const id = await asUser.mutation(api.postIts.create, {
      sessionId,
      text: "Original",
    });

    // Create a co-admin
    await t.run(async (ctx) =>
      ctx.db.insert("coAdmins", {
        sessionId,
        displayName: "Co-Admin",
        inviteToken: "coadmin-token-456",
        isActive: true,
        joinedAt: Date.now(),
      })
    );

    await t.mutation(api.postIts.updateText, {
      postItId: id,
      text: "Co-admin edit",
      coAdminToken: "coadmin-token-456",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.text).toBe("Co-admin edit");
  });
});
