import { describe, test, expect } from "vitest";
import {
  generateDotVotingCsv,
  generateStockRankCsv,
  generateMatrixCsv,
} from "./exportCsv";

// Helper to build maps from plain objects
function postItMap(
  entries: Record<string, { text: string; clusterId?: string }>
) {
  return new Map(Object.entries(entries));
}

function clusterMap(entries: Record<string, { _id: string; label: string }>) {
  return new Map(Object.entries(entries));
}

describe("escapeCsv (tested via generateDotVotingCsv output)", () => {
  const clusters = clusterMap({});

  test("plain text passes through unchanged", () => {
    const postIts = postItMap({ p1: { text: "Hello world" } });
    const csv = generateDotVotingCsv([{ postItId: "p1", total: 5 }], postIts, clusters);
    expect(csv).toContain("Hello world");
    // Should NOT be quoted
    expect(csv).not.toContain('"Hello world"');
  });

  test("text with commas gets quoted", () => {
    const postIts = postItMap({ p1: { text: "hello, world" } });
    const csv = generateDotVotingCsv([{ postItId: "p1", total: 5 }], postIts, clusters);
    expect(csv).toContain('"hello, world"');
  });

  test("text with double quotes gets escaped", () => {
    const postIts = postItMap({ p1: { text: 'say "hi"' } });
    const csv = generateDotVotingCsv([{ postItId: "p1", total: 5 }], postIts, clusters);
    expect(csv).toContain('"say ""hi"""');
  });

  test("text with newlines gets quoted", () => {
    const postIts = postItMap({ p1: { text: "line1\nline2" } });
    const csv = generateDotVotingCsv([{ postItId: "p1", total: 5 }], postIts, clusters);
    expect(csv).toContain('"line1\nline2"');
  });

  test("text with comma + quote + newline handles correctly", () => {
    const postIts = postItMap({ p1: { text: 'a, "b"\nc' } });
    const csv = generateDotVotingCsv([{ postItId: "p1", total: 5 }], postIts, clusters);
    expect(csv).toContain('"a, ""b""\nc"');
  });
});

describe("generateDotVotingCsv", () => {
  test("header row is Rank,Text,Cluster,Points", () => {
    const csv = generateDotVotingCsv([], new Map(), new Map());
    expect(csv).toBe("Rank,Text,Cluster,Points");
  });

  test("rows sorted by rank (1, 2, 3...)", () => {
    const postIts = postItMap({
      p1: { text: "Alpha" },
      p2: { text: "Beta" },
    });
    const results = [
      { postItId: "p1", total: 10 },
      { postItId: "p2", total: 5 },
    ];
    const csv = generateDotVotingCsv(results, postIts, new Map());
    const lines = csv.split("\n");
    expect(lines[1]).toMatch(/^1,Alpha,,10$/);
    expect(lines[2]).toMatch(/^2,Beta,,5$/);
  });

  test("missing cluster shows empty string", () => {
    const postIts = postItMap({ p1: { text: "No cluster" } });
    const csv = generateDotVotingCsv(
      [{ postItId: "p1", total: 3 }],
      postIts,
      new Map()
    );
    const lines = csv.split("\n");
    expect(lines[1]).toBe("1,No cluster,,3");
  });

  test("missing postIt shows Unknown", () => {
    const csv = generateDotVotingCsv(
      [{ postItId: "missing", total: 7 }],
      new Map(),
      new Map()
    );
    const lines = csv.split("\n");
    expect(lines[1]).toBe("1,Unknown,,7");
  });

  test("empty results array returns header only", () => {
    const csv = generateDotVotingCsv([], new Map(), new Map());
    expect(csv).toBe("Rank,Text,Cluster,Points");
  });
});

describe("generateStockRankCsv", () => {
  test("header row is Rank,Text,Cluster,Avg Rank,Times Ranked", () => {
    const csv = generateStockRankCsv([], new Map(), new Map());
    expect(csv).toBe("Rank,Text,Cluster,Avg Rank,Times Ranked");
  });

  test("avg rank rounded to 1 decimal", () => {
    const postIts = postItMap({ p1: { text: "Item" } });
    const csv = generateStockRankCsv(
      [{ postItId: "p1", avgRank: 2.666, timesRanked: 3 }],
      postIts,
      new Map()
    );
    const lines = csv.split("\n");
    // 2.666 rounded to 1 decimal = 2.7
    expect(lines[1]).toBe("1,Item,,2.7,3");
  });

  test("empty results returns header only", () => {
    const csv = generateStockRankCsv([], new Map(), new Map());
    expect(csv).toBe("Rank,Text,Cluster,Avg Rank,Times Ranked");
  });
});

describe("generateMatrixCsv", () => {
  test("header row includes dynamic axis labels", () => {
    const csv = generateMatrixCsv([], new Map(), new Map(), "Impact", "Effort");
    expect(csv).toBe("Text,Cluster,Avg Impact,Avg Effort,Responses");
  });

  test("avg X and avg Y rounded to 1 decimal", () => {
    const postIts = postItMap({ p1: { text: "Item" } });
    const csv = generateMatrixCsv(
      [{ postItId: "p1", avgX: 3.456, avgY: 1.234, count: 5 }],
      postIts,
      new Map(),
      "X-Axis",
      "Y-Axis"
    );
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Item,,3.5,1.2,5");
  });

  test("empty results returns header only", () => {
    const csv = generateMatrixCsv(
      [],
      new Map(),
      new Map(),
      "Feasibility",
      "Desirability"
    );
    expect(csv).toBe("Text,Cluster,Avg Feasibility,Avg Desirability,Responses");
  });
});
