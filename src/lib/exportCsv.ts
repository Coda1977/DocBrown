interface PostItData {
  text: string;
  clusterId?: string;
}

interface ClusterData {
  _id: string;
  label: string;
}

interface DotVoteResult {
  postItId: string;
  total: number;
}

interface StockRankResult {
  postItId: string;
  avgRank: number;
  timesRanked: number;
}

interface MatrixResult {
  postItId: string;
  avgX: number;
  avgY: number;
  count: number;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateDotVotingCsv(
  results: DotVoteResult[],
  postIts: Map<string, PostItData>,
  clusters: Map<string, ClusterData>
): string {
  const rows = [["Rank", "Text", "Cluster", "Points"].join(",")];
  results.forEach((item, idx) => {
    const postIt = postIts.get(item.postItId);
    const cluster = postIt?.clusterId ? clusters.get(postIt.clusterId) : null;
    rows.push(
      [
        String(idx + 1),
        escapeCsv(postIt?.text ?? "Unknown"),
        escapeCsv(cluster?.label ?? ""),
        String(item.total),
      ].join(",")
    );
  });
  return rows.join("\n");
}

export function generateStockRankCsv(
  results: StockRankResult[],
  postIts: Map<string, PostItData>,
  clusters: Map<string, ClusterData>
): string {
  const rows = [
    ["Rank", "Text", "Cluster", "Avg Rank", "Times Ranked"].join(","),
  ];
  results.forEach((item, idx) => {
    const postIt = postIts.get(item.postItId);
    const cluster = postIt?.clusterId ? clusters.get(postIt.clusterId) : null;
    rows.push(
      [
        String(idx + 1),
        escapeCsv(postIt?.text ?? "Unknown"),
        escapeCsv(cluster?.label ?? ""),
        String(Math.round(item.avgRank * 10) / 10),
        String(item.timesRanked),
      ].join(",")
    );
  });
  return rows.join("\n");
}

export function generateMatrixCsv(
  results: MatrixResult[],
  postIts: Map<string, PostItData>,
  clusters: Map<string, ClusterData>,
  xLabel: string,
  yLabel: string
): string {
  const rows = [
    ["Text", "Cluster", `Avg ${xLabel}`, `Avg ${yLabel}`, "Responses"].join(
      ","
    ),
  ];
  results.forEach((item) => {
    const postIt = postIts.get(item.postItId);
    const cluster = postIt?.clusterId ? clusters.get(postIt.clusterId) : null;
    rows.push(
      [
        escapeCsv(postIt?.text ?? "Unknown"),
        escapeCsv(cluster?.label ?? ""),
        String(Math.round(item.avgX * 10) / 10),
        String(Math.round(item.avgY * 10) / 10),
        String(item.count),
      ].join(",")
    );
  });
  return rows.join("\n");
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
