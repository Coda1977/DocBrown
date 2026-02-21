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
  // Advance to vote phase
  await asUser.mutation(api.sessions.advancePhase, { sessionId });
  await asUser.mutation(api.sessions.advancePhase, { sessionId });
  return { userId, asUser, sessionId };
}

describe("votingRounds", () => {
  test("create sets roundNumber=1 for first round", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const roundId = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: { pointsPerParticipant: 5 },
    });
    const round = await t.run(async (ctx) => ctx.db.get(roundId));
    expect(round!.roundNumber).toBe(1);
  });

  test("create sets roundNumber=2 for second round (auto-increments)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: { pointsPerParticipant: 5 },
    });
    const round2Id = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "stock_rank",
      config: { topN: 3 },
    });
    const round2 = await t.run(async (ctx) => ctx.db.get(round2Id));
    expect(round2!.roundNumber).toBe(2);
  });

  test("create sets isRevealed=false", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const roundId = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: {},
    });
    const round = await t.run(async (ctx) => ctx.db.get(roundId));
    expect(round!.isRevealed).toBe(false);
  });

  test("create requires auth (owner or co-admin)", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    // Unauthenticated call
    await expect(
      t.mutation(api.votingRounds.create, {
        sessionId,
        mode: "dot_voting",
        config: {},
      })
    ).rejects.toThrow("Not authorized");
  });

  test("getActive returns the most recently created round", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: {},
    });
    const round2Id = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "stock_rank",
      config: {},
    });

    const active = await t.query(api.votingRounds.getActive, { sessionId });
    expect(active).not.toBeNull();
    expect(active!._id).toBe(round2Id);
    expect(active!.mode).toBe("stock_rank");
  });

  test("getActive returns null when no rounds exist", async () => {
    const t = convexTest(schema, modules);
    const { sessionId } = await setupSession(t);

    const active = await t.query(api.votingRounds.getActive, { sessionId });
    expect(active).toBeNull();
  });

  test("bySession returns all rounds for a session", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: {},
    });
    await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "stock_rank",
      config: {},
    });

    const rounds = await t.query(api.votingRounds.bySession, { sessionId });
    expect(rounds).toHaveLength(2);
  });

  test("reveal sets isRevealed=true", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const roundId = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: {},
    });
    await asUser.mutation(api.votingRounds.reveal, { roundId });

    const round = await t.run(async (ctx) => ctx.db.get(roundId));
    expect(round!.isRevealed).toBe(true);
  });

  test("reveal requires auth (owner or co-admin)", async () => {
    const t = convexTest(schema, modules);
    const { asUser, sessionId } = await setupSession(t);

    const roundId = await asUser.mutation(api.votingRounds.create, {
      sessionId,
      mode: "dot_voting",
      config: {},
    });

    // Unauthenticated reveal
    await expect(
      t.mutation(api.votingRounds.reveal, { roundId })
    ).rejects.toThrow("Not authorized");
  });
});
