"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import {
  downloadCsv,
  generateDotVotingCsv,
  generateStockRankCsv,
  generateMatrixCsv,
} from "@/lib/exportCsv";
import { downloadPdf } from "@/lib/exportPdf";

interface PostItData {
  _id: string;
  text: string;
  clusterId?: string;
}

interface ClusterData {
  _id: string;
  label: string;
}

interface SessionMeta {
  question: string;
  shortCode: string;
  createdAt: number;
}

interface DotResult {
  postItId: string;
  total: number;
}

interface StockResult {
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

type ExportData =
  | { mode: "dot_voting"; results: DotResult[] }
  | { mode: "stock_rank"; results: StockResult[] }
  | {
      mode: "matrix_2x2";
      results: MatrixResult[];
      config: { xAxisLabel?: string; yAxisLabel?: string };
    };

export function ExportButtons({
  data,
  postIts,
  clusters,
  sessionMeta,
}: {
  data: ExportData;
  postIts: PostItData[];
  clusters: ClusterData[];
  sessionMeta: SessionMeta;
}) {
  const [exporting, setExporting] = useState<string | null>(null);

  const postItMap = new Map(postIts.map((p) => [p._id, p]));
  const clusterMap = new Map(clusters.map((c) => [c._id, c]));

  function handleCsvExport() {
    let csv: string;
    switch (data.mode) {
      case "dot_voting":
        csv = generateDotVotingCsv(data.results, postItMap, clusterMap);
        break;
      case "stock_rank":
        csv = generateStockRankCsv(data.results, postItMap, clusterMap);
        break;
      case "matrix_2x2":
        csv = generateMatrixCsv(
          data.results,
          postItMap,
          clusterMap,
          data.config?.xAxisLabel ?? "X",
          data.config?.yAxisLabel ?? "Y"
        );
        break;
    }
    downloadCsv(csv, `docbrown-${sessionMeta.shortCode}-results.csv`);
  }

  async function handlePdfExport() {
    setExporting("pdf");
    try {
      let rows;
      switch (data.mode) {
        case "dot_voting":
          rows = data.results.map((r) => {
            const p = postItMap.get(r.postItId);
            const c = p?.clusterId ? clusterMap.get(p.clusterId) : null;
            return {
              text: p?.text ?? "Unknown",
              cluster: c?.label ?? "",
              points: r.total,
            };
          });
          break;
        case "stock_rank":
          rows = data.results.map((r) => {
            const p = postItMap.get(r.postItId);
            const c = p?.clusterId ? clusterMap.get(p.clusterId) : null;
            return {
              text: p?.text ?? "Unknown",
              cluster: c?.label ?? "",
              avgRank: r.avgRank,
              timesRanked: r.timesRanked,
            };
          });
          break;
        case "matrix_2x2":
          rows = data.results.map((r) => {
            const p = postItMap.get(r.postItId);
            const c = p?.clusterId ? clusterMap.get(p.clusterId) : null;
            return {
              text: p?.text ?? "Unknown",
              cluster: c?.label ?? "",
              avgX: r.avgX,
              avgY: r.avgY,
              count: r.count,
            };
          });
          break;
      }
      await downloadPdf(
        data.mode,
        sessionMeta,
        rows,
        data.mode === "matrix_2x2" ? data.config : undefined
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleCsvExport}>
        <FileSpreadsheet className="h-4 w-4 mr-1" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePdfExport}
        disabled={exporting === "pdf"}
      >
        <FileDown className="h-4 w-4 mr-1" />
        {exporting === "pdf" ? "..." : "PDF"}
      </Button>
    </div>
  );
}
