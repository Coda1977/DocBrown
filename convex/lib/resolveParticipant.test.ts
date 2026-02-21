import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { resolveParticipant } from "./resolveParticipant";
const modules = import.meta.glob("../**/*.*s");

describe("resolveParticipant", () => {
  test("resolves valid token to participant doc", async () => {
    const t = convexTest(schema, modules);

    const { sessionId, participantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const sessionId = await ctx.db.insert("sessions", {
        userId,
        question: "Test?",
        phase: "collect",
        participantVisibility: true,
        revealMode: "live",
        status: "active",
        timerEnabled: false,
        createdAt: Date.now(),
      });
      const participantId = await ctx.db.insert("participants", {
        sessionId,
        displayToken: "valid-token",
        joinedAt: Date.now(),
      });
      return { sessionId, participantId };
    });

    const result = await t.run(async (ctx) => {
      return resolveParticipant(ctx, {
        participantToken: "valid-token",
        sessionId,
      });
    });

    expect(result._id).toBe(participantId);
    expect(result.sessionId).toBe(sessionId);
  });

  test("throws for non-existent token", async () => {
    const t = convexTest(schema, modules);

    const sessionId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      return ctx.db.insert("sessions", {
        userId,
        question: "Test?",
        phase: "collect",
        participantVisibility: true,
        revealMode: "live",
        status: "active",
        timerEnabled: false,
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        return resolveParticipant(ctx, {
          participantToken: "nonexistent-token",
          sessionId,
        });
      })
    ).rejects.toThrow("Participant not found or not in this session");
  });

  test("throws when token belongs to different session", async () => {
    const t = convexTest(schema, modules);

    const { sessionId1 } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {});
      const sessionId1 = await ctx.db.insert("sessions", {
        userId,
        question: "Session 1?",
        phase: "collect",
        participantVisibility: true,
        revealMode: "live",
        status: "active",
        timerEnabled: false,
        createdAt: Date.now(),
      });
      const sessionId2 = await ctx.db.insert("sessions", {
        userId,
        question: "Session 2?",
        phase: "collect",
        participantVisibility: true,
        revealMode: "live",
        status: "active",
        timerEnabled: false,
        createdAt: Date.now(),
      });
      // Participant belongs to session 2
      await ctx.db.insert("participants", {
        sessionId: sessionId2,
        displayToken: "wrong-session-token",
        joinedAt: Date.now(),
      });
      return { sessionId1, sessionId2 };
    });

    await expect(
      t.run(async (ctx) => {
        return resolveParticipant(ctx, {
          participantToken: "wrong-session-token",
          sessionId: sessionId1,
        });
      })
    ).rejects.toThrow("Participant not found or not in this session");
  });
});
