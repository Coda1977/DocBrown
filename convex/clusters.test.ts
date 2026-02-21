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

describe("clusters remove cascade", () => {
  test("remove unassigns postIts (sets clusterId=undefined)", async () => {
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
    await t.mutation(api.postIts.setCluster, { postItId, clusterId });

    // Remove cluster
    await t.mutation(api.clusters.remove, { clusterId });

    const postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt!.clusterId).toBeUndefined();
  });

  test("remove does NOT delete the postIts themselves", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const clusterId = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Group",
      positionX: 0,
      positionY: 0,
    });
    const postItId = await t.mutation(api.postIts.create, {
      sessionId,
      text: "Survivor",
    });
    await t.mutation(api.postIts.setCluster, { postItId, clusterId });

    await t.mutation(api.clusters.remove, { clusterId });

    const postIt = await t.run(async (ctx) => ctx.db.get(postItId));
    expect(postIt).not.toBeNull();
    expect(postIt!.text).toBe("Survivor");
  });

  test("postIts in other clusters are unaffected", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const cluster1 = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Group 1",
      positionX: 0,
      positionY: 0,
    });
    const cluster2 = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Group 2",
      positionX: 400,
      positionY: 0,
    });
    const postIt1 = await t.mutation(api.postIts.create, {
      sessionId,
      text: "In Group 1",
    });
    const postIt2 = await t.mutation(api.postIts.create, {
      sessionId,
      text: "In Group 2",
    });
    await t.mutation(api.postIts.setCluster, {
      postItId: postIt1,
      clusterId: cluster1,
    });
    await t.mutation(api.postIts.setCluster, {
      postItId: postIt2,
      clusterId: cluster2,
    });

    // Remove cluster1
    await t.mutation(api.clusters.remove, { clusterId: cluster1 });

    // postIt2 should still be in cluster2
    const p2 = await t.run(async (ctx) => ctx.db.get(postIt2));
    expect(p2!.clusterId).toBe(cluster2);
  });

  test("orphan postIts (no cluster) are unaffected", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const clusterId = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Group",
      positionX: 0,
      positionY: 0,
    });
    const orphanId = await t.mutation(api.postIts.create, {
      sessionId,
      text: "No cluster",
    });

    await t.mutation(api.clusters.remove, { clusterId });

    const orphan = await t.run(async (ctx) => ctx.db.get(orphanId));
    expect(orphan!.clusterId).toBeUndefined();
    expect(orphan!.text).toBe("No cluster");
  });

  test("non-existent cluster ID is a no-op (no throw)", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const clusterId = await t.mutation(api.clusters.create, {
      sessionId,
      label: "Temp",
      positionX: 0,
      positionY: 0,
    });
    await t.mutation(api.clusters.remove, { clusterId });

    // Removing already-deleted cluster should not throw
    await expect(
      t.mutation(api.clusters.remove, { clusterId })
    ).resolves.not.toThrow();
  });
});
