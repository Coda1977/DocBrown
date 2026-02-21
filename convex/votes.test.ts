import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.*s");

async function setupVotingContext(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const asUser = t.withIdentity({ subject: userId });
  const sessionId = await asUser.mutation(api.sessions.create, {
    question: "Vote test",
  });

  // Create post-its
  const postIt1 = await t.mutation(api.postIts.create, {
    sessionId,
    text: "Item A",
  });
  const postIt2 = await t.mutation(api.postIts.create, {
    sessionId,
    text: "Item B",
  });

  // Advance to vote phase
  await asUser.mutation(api.sessions.advancePhase, { sessionId });
  await asUser.mutation(api.sessions.advancePhase, { sessionId });

  // Create voting round
  const roundId = await asUser.mutation(api.votingRounds.create, {
    sessionId,
    mode: "dot_voting",
    config: { pointsPerParticipant: 5 },
  });

  // Create participant
  const participantId = await t.mutation(api.participants.join, {
    sessionId,
    displayToken: "participant-tok-1",
  });

  return {
    userId,
    asUser,
    sessionId,
    roundId,
    postIt1,
    postIt2,
    participantId,
  };
}

describe("dot voting", () => {
  test("submit creates vote records with numeric value", async () => {
    const t = convexTest(schema, modules);
    const { roundId, sessionId, participantId, postIt1, postIt2 } =
      await setupVotingContext(t);

    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantId,
      votes: [
        { postItId: postIt1, points: 3 },
        { postItId: postIt2, points: 2 },
      ],
    });

    const status = await t.query(api.votes.participantVoteStatus, {
      roundId,
      participantId,
    });
    expect(status.hasVoted).toBe(true);
    expect(status.votes).toHaveLength(2);
  });

  test("aggregate returns totals sorted descending", async () => {
    const t = convexTest(schema, modules);
    const { roundId, sessionId, participantId, postIt1, postIt2 } =
      await setupVotingContext(t);

    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantId,
      votes: [
        { postItId: postIt1, points: 2 },
        { postItId: postIt2, points: 5 },
      ],
    });

    const results = await t.query(api.votes.aggregateDotVotes, { roundId });
    expect(results).toHaveLength(2);
    expect(results[0].total).toBeGreaterThanOrEqual(results[1].total);
    expect(results[0].postItId).toBe(postIt2 as string);
    expect(results[0].total).toBe(5);
    expect(results[1].total).toBe(2);
  });

  test("zero-point votes are not inserted", async () => {
    const t = convexTest(schema, modules);
    const { roundId, sessionId, participantId, postIt1, postIt2 } =
      await setupVotingContext(t);

    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantId,
      votes: [
        { postItId: postIt1, points: 3 },
        { postItId: postIt2, points: 0 },
      ],
    });

    const results = await t.query(api.votes.aggregateDotVotes, { roundId });
    expect(results).toHaveLength(1);
    expect(results[0].postItId).toBe(postIt1 as string);
  });

  test("re-submit replaces previous votes", async () => {
    const t = convexTest(schema, modules);
    const { roundId, sessionId, participantId, postIt1, postIt2 } =
      await setupVotingContext(t);

    // First submission
    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantId,
      votes: [{ postItId: postIt1, points: 5 }],
    });

    // Re-submit with different distribution
    await t.mutation(api.votes.submitDotVotes, {
      roundId,
      sessionId,
      participantId,
      votes: [{ postItId: postIt2, points: 4 }],
    });

    const results = await t.query(api.votes.aggregateDotVotes, { roundId });
    expect(results).toHaveLength(1);
    expect(results[0].postItId).toBe(postIt2 as string);
    expect(results[0].total).toBe(4);
  });
});

describe("stock rank voting", () => {
  test("submit creates vote records with {rank}", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    // Create a stock rank round
    const stockRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "stock_rank",
      config: { topN: 3 },
    });

    await t.mutation(api.votes.submitStockRankVotes, {
      roundId: stockRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      rankings: [
        { postItId: ctx.postIt1, rank: 1 },
        { postItId: ctx.postIt2, rank: 2 },
      ],
    });

    const status = await t.query(api.votes.participantVoteStatus, {
      roundId: stockRoundId,
      participantId: ctx.participantId,
    });
    expect(status.hasVoted).toBe(true);
    expect(status.votes).toHaveLength(2);
  });

  test("aggregate returns avgRank and timesRanked sorted ascending", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const stockRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "stock_rank",
      config: { topN: 3 },
    });

    // Participant 1
    await t.mutation(api.votes.submitStockRankVotes, {
      roundId: stockRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      rankings: [
        { postItId: ctx.postIt1, rank: 1 },
        { postItId: ctx.postIt2, rank: 2 },
      ],
    });

    // Participant 2
    const p2 = await t.mutation(api.participants.join, {
      sessionId: ctx.sessionId,
      displayToken: "participant-tok-2",
    });
    await t.mutation(api.votes.submitStockRankVotes, {
      roundId: stockRoundId,
      sessionId: ctx.sessionId,
      participantId: p2,
      rankings: [
        { postItId: ctx.postIt1, rank: 2 },
        { postItId: ctx.postIt2, rank: 1 },
      ],
    });

    const results = await t.query(api.votes.aggregateStockRankVotes, {
      roundId: stockRoundId,
    });
    expect(results).toHaveLength(2);
    // Both should have avgRank = 1.5 (avg of 1 and 2)
    expect(results[0].avgRank).toBe(1.5);
    expect(results[0].timesRanked).toBe(2);
  });

  test("re-submit replaces previous rankings", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const stockRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "stock_rank",
      config: { topN: 3 },
    });

    await t.mutation(api.votes.submitStockRankVotes, {
      roundId: stockRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      rankings: [{ postItId: ctx.postIt1, rank: 1 }],
    });

    // Re-submit with only postIt2
    await t.mutation(api.votes.submitStockRankVotes, {
      roundId: stockRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      rankings: [{ postItId: ctx.postIt2, rank: 1 }],
    });

    const results = await t.query(api.votes.aggregateStockRankVotes, {
      roundId: stockRoundId,
    });
    expect(results).toHaveLength(1);
    expect(results[0].postItId).toBe(ctx.postIt2 as string);
  });
});

describe("matrix voting", () => {
  test("submit creates vote records with {x, y}", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const matrixRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "matrix_2x2",
      config: { xLabel: "Impact", yLabel: "Effort" },
    });

    await t.mutation(api.votes.submitMatrixVotes, {
      roundId: matrixRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      ratings: [
        { postItId: ctx.postIt1, x: 4, y: 2 },
        { postItId: ctx.postIt2, x: 1, y: 5 },
      ],
    });

    const status = await t.query(api.votes.participantVoteStatus, {
      roundId: matrixRoundId,
      participantId: ctx.participantId,
    });
    expect(status.hasVoted).toBe(true);
    expect(status.votes).toHaveLength(2);
  });

  test("aggregate returns avgX, avgY, count sorted desc by count", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const matrixRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "matrix_2x2",
      config: { xLabel: "Impact", yLabel: "Effort" },
    });

    // Participant 1
    await t.mutation(api.votes.submitMatrixVotes, {
      roundId: matrixRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      ratings: [
        { postItId: ctx.postIt1, x: 4, y: 2 },
        { postItId: ctx.postIt2, x: 2, y: 4 },
      ],
    });

    // Participant 2
    const p2 = await t.mutation(api.participants.join, {
      sessionId: ctx.sessionId,
      displayToken: "participant-tok-2",
    });
    await t.mutation(api.votes.submitMatrixVotes, {
      roundId: matrixRoundId,
      sessionId: ctx.sessionId,
      participantId: p2,
      ratings: [{ postItId: ctx.postIt1, x: 2, y: 4 }],
    });

    const results = await t.query(api.votes.aggregateMatrixVotes, {
      roundId: matrixRoundId,
    });

    // postIt1 has 2 votes, postIt2 has 1 -- sorted desc by count
    expect(results[0].postItId).toBe(ctx.postIt1 as string);
    expect(results[0].count).toBe(2);
    expect(results[0].avgX).toBe(3); // (4+2)/2
    expect(results[0].avgY).toBe(3); // (2+4)/2
    expect(results[1].count).toBe(1);
  });

  test("re-submit replaces previous ratings", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const matrixRoundId = await ctx.asUser.mutation(api.votingRounds.create, {
      sessionId: ctx.sessionId,
      mode: "matrix_2x2",
      config: { xLabel: "Impact", yLabel: "Effort" },
    });

    await t.mutation(api.votes.submitMatrixVotes, {
      roundId: matrixRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      ratings: [{ postItId: ctx.postIt1, x: 1, y: 1 }],
    });

    // Re-submit
    await t.mutation(api.votes.submitMatrixVotes, {
      roundId: matrixRoundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      ratings: [{ postItId: ctx.postIt2, x: 5, y: 5 }],
    });

    const results = await t.query(api.votes.aggregateMatrixVotes, {
      roundId: matrixRoundId,
    });
    expect(results).toHaveLength(1);
    expect(results[0].postItId).toBe(ctx.postIt2 as string);
  });
});

describe("votingProgress", () => {
  test("returns total participants and unique voters", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    // Add a second participant
    await t.mutation(api.participants.join, {
      sessionId: ctx.sessionId,
      displayToken: "participant-tok-2",
    });

    // Only participant 1 votes
    await t.mutation(api.votes.submitDotVotes, {
      roundId: ctx.roundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      votes: [
        { postItId: ctx.postIt1, points: 3 },
        { postItId: ctx.postIt2, points: 2 },
      ],
    });

    const progress = await t.query(api.votes.votingProgress, {
      roundId: ctx.roundId,
      sessionId: ctx.sessionId,
    });
    expect(progress.total).toBe(2);
    expect(progress.voted).toBe(1); // 1 participant, even though 2 vote records
  });
});

describe("participantVoteStatus", () => {
  test("hasVoted=false when no votes exist", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    const status = await t.query(api.votes.participantVoteStatus, {
      roundId: ctx.roundId,
      participantId: ctx.participantId,
    });
    expect(status.hasVoted).toBe(false);
    expect(status.votes).toHaveLength(0);
  });

  test("hasVoted=true after submitting, returns votes array", async () => {
    const t = convexTest(schema, modules);
    const ctx = await setupVotingContext(t);

    await t.mutation(api.votes.submitDotVotes, {
      roundId: ctx.roundId,
      sessionId: ctx.sessionId,
      participantId: ctx.participantId,
      votes: [{ postItId: ctx.postIt1, points: 5 }],
    });

    const status = await t.query(api.votes.participantVoteStatus, {
      roundId: ctx.roundId,
      participantId: ctx.participantId,
    });
    expect(status.hasVoted).toBe(true);
    expect(status.votes).toHaveLength(1);
  });
});
