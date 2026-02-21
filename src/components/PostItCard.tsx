"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export interface PostItData {
  _id: Id<"postIts">;
  text: string;
  positionX: number;
  positionY: number;
  color?: string;
  clusterId?: Id<"clusters">;
  voteCount?: number;
  maxVotes?: number;
}

export function PostItCard({
  postIt,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onDelete,
  style,
  className,
  draggable,
}: {
  postIt: PostItData;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onSaveEdit?: (text: string) => void;
  onDelete?: () => void;
  style?: React.CSSProperties;
  className?: string;
  draggable?: boolean;
}) {
  const [editText, setEditText] = useState(postIt.text);

  // Heatmap glow for voting results
  const heatOpacity =
    postIt.voteCount && postIt.maxVotes
      ? Math.max(0.1, postIt.voteCount / postIt.maxVotes)
      : 0;

  return (
    <div
      className={cn(
        "w-[160px] min-h-[100px] rounded-xl p-3 postit-shadow transition-all relative",
        "hover:postit-shadow-hover hover:scale-[1.02]",
        draggable && "cursor-grab active:cursor-grabbing",
        className
      )}
      style={{
        backgroundColor: postIt.color ?? "#fef9c3",
        boxShadow:
          heatOpacity > 0
            ? `0 0 ${12 + heatOpacity * 16}px rgba(20, 168, 138, ${heatOpacity}), 2px 3px 6px rgba(0,0,0,0.08)`
            : undefined,
        ...style,
      }}
      onDoubleClick={onStartEdit}
    >
      {/* Folded corner effect */}
      <div
        className="absolute top-0 right-0 w-4 h-4 rounded-bl-lg"
        style={{
          background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.04) 50%)`,
        }}
      />

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none text-sm leading-snug"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveEdit?.(editText);
              }
              if (e.key === "Escape") {
                setEditText(postIt.text);
                onSaveEdit?.(postIt.text);
              }
            }}
          />
          <div className="flex gap-1">
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onSaveEdit?.(editText)}
            >
              Save
            </button>
            {onDelete && (
              <button
                className="text-[10px] text-destructive hover:text-destructive/80 ml-auto"
                onClick={onDelete}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[13px] leading-snug break-words">{postIt.text}</p>
      )}

      {postIt.voteCount !== undefined && postIt.voteCount > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full bg-accent"
            style={{ opacity: Math.max(0.4, heatOpacity) }}
          />
          <span className="text-[10px] font-bold text-accent">
            {postIt.voteCount} pts
          </span>
        </div>
      )}
    </div>
  );
}
