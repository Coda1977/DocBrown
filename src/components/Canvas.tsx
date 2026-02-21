"use client";

import { useState, useRef, useCallback } from "react";
import { PostItCard, type PostItData } from "./PostItCard";
import type { Id } from "../../convex/_generated/dataModel";

interface ClusterData {
  _id: Id<"clusters">;
  label: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  color?: string;
}

interface ActiveRound {
  _id: Id<"votingRounds">;
  mode: string;
  isRevealed: boolean;
}

export function Canvas({
  postIts,
  clusters,
  editingPostIt,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onMove,
  activeRound,
  readOnly,
}: {
  postIts: PostItData[];
  clusters: ClusterData[];
  editingPostIt: Id<"postIts"> | null;
  onStartEdit: (id: Id<"postIts">) => void;
  onSaveEdit: (id: Id<"postIts">, text: string) => void;
  onDelete: (id: Id<"postIts">) => void;
  onMove: (id: Id<"postIts">, x: number, y: number) => void;
  activeRound?: ActiveRound;
  readOnly?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragId, setDragId] = useState<Id<"postIts"> | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Compute max votes for heatmap
  const maxVotes =
    activeRound && postIts.length > 0
      ? Math.max(...postIts.map((p) => (p as PostItData & { voteCount?: number }).voteCount ?? 0), 1)
      : 0;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(3, Math.max(0.3, z * delta)));
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.preventDefault();
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }
      if (dragId && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
        const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
        // Visual update only - we commit on mouseup
        const el = document.getElementById(`postit-${dragId}`);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      }
    },
    [isPanning, panStart, dragId, dragOffset, pan, zoom]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }
      if (dragId && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
        const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
        onMove(dragId, Math.round(x), Math.round(y));
        setDragId(null);
      }
    },
    [isPanning, dragId, dragOffset, pan, zoom, onMove]
  );

  const handlePostItMouseDown = useCallback(
    (e: React.MouseEvent, postIt: PostItData) => {
      if (readOnly || e.button !== 0 || e.altKey) return;
      e.stopPropagation();
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;
        setDragOffset({
          x: canvasX - postIt.positionX,
          y: canvasY - postIt.positionY,
        });
        setDragId(postIt._id);
      }
    },
    [readOnly, pan, zoom]
  );

  return (
    <div
      ref={canvasRef}
      className="w-full h-full canvas-grid overflow-hidden relative"
      style={{ cursor: isPanning ? "grabbing" : dragId ? "grabbing" : "default" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setDragId(null);
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        {/* Clusters */}
        {clusters.map((cluster) => (
          <div
            key={cluster._id}
            className="absolute rounded-2xl border-2 border-dashed border-border/60"
            style={{
              left: cluster.positionX,
              top: cluster.positionY,
              width: cluster.width ?? 400,
              height: cluster.height ?? 300,
              backgroundColor: cluster.color
                ? `${cluster.color}33`
                : "rgba(245,245,244,0.3)",
            }}
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {cluster.label}
            </div>
          </div>
        ))}

        {/* Post-its */}
        {postIts.map((postIt) => (
          <div
            key={postIt._id}
            id={`postit-${postIt._id}`}
            className="absolute"
            style={{
              left: postIt.positionX,
              top: postIt.positionY,
              zIndex: dragId === postIt._id ? 100 : 1,
            }}
            onMouseDown={(e) => handlePostItMouseDown(e, postIt)}
          >
            <PostItCard
              postIt={{
                ...postIt,
                maxVotes,
              }}
              isEditing={editingPostIt === postIt._id}
              onStartEdit={() => onStartEdit(postIt._id)}
              onSaveEdit={(text) => onSaveEdit(postIt._id, text)}
              onDelete={() => onDelete(postIt._id)}
              draggable={!readOnly}
            />
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card rounded-xl border border-border px-2 py-1 shadow-sm">
        <button
          className="text-xs px-2 py-1 hover:bg-muted rounded"
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.9))}
        >
          -
        </button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="text-xs px-2 py-1 hover:bg-muted rounded"
          onClick={() => setZoom((z) => Math.min(3, z * 1.1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
