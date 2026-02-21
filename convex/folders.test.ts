import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.*s");

describe("folders", () => {
  test("remove unassigns sessions (sets folderId=undefined)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const folderId = await asUser.mutation(api.folders.create, {
      name: "Workshop",
    });
    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
      folderId,
    });

    await asUser.mutation(api.folders.remove, { folderId });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.folderId).toBeUndefined();
  });

  test("remove does NOT delete the sessions themselves", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const folderId = await asUser.mutation(api.folders.create, {
      name: "Workshop",
    });
    const sessionId = await asUser.mutation(api.sessions.create, {
      question: "Q",
      folderId,
    });

    await asUser.mutation(api.folders.remove, { folderId });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).not.toBeNull();
    expect(session!.question).toBe("Q");
  });

  test("sessions in other folders are unaffected", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });

    const folder1 = await asUser.mutation(api.folders.create, {
      name: "Folder 1",
    });
    const folder2 = await asUser.mutation(api.folders.create, {
      name: "Folder 2",
    });
    await asUser.mutation(api.sessions.create, {
      question: "In F1",
      folderId: folder1,
    });
    const s2 = await asUser.mutation(api.sessions.create, {
      question: "In F2",
      folderId: folder2,
    });

    await asUser.mutation(api.folders.remove, { folderId: folder1 });

    const session2 = await t.run(async (ctx) => ctx.db.get(s2));
    expect(session2!.folderId).toBe(folder2);
  });

  test("non-owner cannot remove folder", async () => {
    const t = convexTest(schema, modules);
    const user1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const user2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    const folderId = await asUser1.mutation(api.folders.create, {
      name: "Private",
    });
    await expect(
      asUser2.mutation(api.folders.remove, { folderId })
    ).rejects.toThrow("Folder not found");
  });

  test("non-owner cannot update folder", async () => {
    const t = convexTest(schema, modules);
    const user1 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const user2 = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asUser1 = t.withIdentity({ subject: user1 });
    const asUser2 = t.withIdentity({ subject: user2 });

    const folderId = await asUser1.mutation(api.folders.create, {
      name: "Mine",
    });
    await expect(
      asUser2.mutation(api.folders.update, { folderId, name: "Hacked" })
    ).rejects.toThrow("Folder not found");
  });

  test("unauthenticated user cannot create/update/remove", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.folders.create, { name: "Fail" })
    ).rejects.toThrow("Not authenticated");
  });
});
