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
    const { sessionId } = await setupSession(t);

    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "First",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(40);
    expect(postIt!.positionY).toBe(40);
  });

  test("second postIt at (240, 40) -- col 1", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    await t.mutation(api.postIts.create, { sessionId, text: "1st" });
    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "2nd",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(240); // 40 + 1*(180+20)
    expect(postIt!.positionY).toBe(40);
  });

  test("5th postIt at (840, 40) -- col 4", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    for (let i = 0; i < 4; i++) {
      await t.mutation(api.postIts.create, { sessionId, text: `Note ${i}` });
    }
    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "5th",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(840); // 40 + 4*(180+20)
    expect(postIt!.positionY).toBe(40);
  });

  test("6th postIt wraps to row 1: (40, 200)", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.postIts.create, { sessionId, text: `Note ${i}` });
    }
    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "6th",
    });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.positionX).toBe(40); // col 0
    expect(postIt!.positionY).toBe(200); // 40 + 1*(140+20)
  });

  test("color is one of the 6 FigJam palette colors", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id = await t.mutation(api.postIts.create, {
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
      t.mutation(api.postIts.create, { sessionId, text: "Orphan" })
    ).rejects.toThrow("Session not found");
  });
});

describe("postIts CRUD", () => {
  test("updateText patches text", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Old",
    });
    await t.mutation(api.postIts.updateText, { postItId: id, text: "New" });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt!.text).toBe("New");
  });

  test("move patches positionX and positionY", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Moveable",
    });
    await t.mutation(api.postIts.move, {
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
    const { sessionId } = await setupSession(t);

    const clusterId = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Group A",
      positionX: 0,
      positionY: 0,
    });
    const postItId = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Note",
    });

    // Assign to cluster
    await t.mutation(api.postIts.setCluster, { postItId, clusterId });
    let postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt!.clusterId).toBe(clusterId);

    // Unassign
    await t.mutation(api.postIts.setCluster, {
      postItId,
      clusterId: undefined,
    });
    postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt!.clusterId).toBeUndefined();
  });

  test("remove deletes the postIt", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const id = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Gone",
    });
    await t.mutation(api.postIts.remove, { postItId: id });
    const postIt = await t.run(async (ctx) => ctx.db.get(id));
    expect(postIt).toBeNull();
  });
});
