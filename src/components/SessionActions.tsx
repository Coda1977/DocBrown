"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  MoreHorizontal,
  Copy,
  FolderInput,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

export function SessionActions({
  sessionId,
  status,
  onDuplicated,
}: {
  sessionId: Id<"sessions">;
  status: string;
  onDuplicated?: (newId: Id<"sessions">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const duplicateSession = useMutation(api.sessions.duplicate);
  const updateSession = useMutation(api.sessions.update);
  const moveToFolder = useMutation(api.sessions.moveToFolder);
  const removeSession = useMutation(api.sessions.remove);
  const folders = useQuery(api.folders.list);

  async function handleDuplicate() {
    setOpen(false);
    const newId = await duplicateSession({ sessionId });
    onDuplicated?.(newId);
  }

  async function handleMarkComplete() {
    setOpen(false);
    await updateSession({ sessionId, status: "completed" });
  }

  async function handleReopen() {
    setOpen(false);
    await updateSession({ sessionId, status: "active" });
  }

  async function handleArchiveToggle() {
    setOpen(false);
    await updateSession({
      sessionId,
      status: status === "archived" ? "active" : "archived",
    });
  }

  async function handleDelete() {
    setOpen(false);
    setConfirmDelete(false);
    await removeSession({ sessionId });
  }

  async function handleMoveToFolder(folderId?: Id<"folders">) {
    setShowFolderPicker(false);
    setOpen(false);
    await moveToFolder({ sessionId, folderId });
  }

  return (
    <div className="relative">
      <button
        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setShowFolderPicker(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl border border-border shadow-lg z-50 py-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                setShowFolderPicker(!showFolderPicker);
              }}
            >
              <FolderInput className="h-4 w-4" />
              Move to Folder
            </button>
            {showFolderPicker && (
              <div className="border-t border-border mx-2 my-1 pt-1 space-y-0.5">
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded transition-colors text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFolder(undefined);
                  }}
                >
                  No folder
                </button>
                {(folders ?? []).map((folder) => (
                  <button
                    key={folder._id}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToFolder(folder._id);
                    }}
                  >
                    {folder.name}
                  </button>
                ))}
              </div>
            )}
            {status === "active" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkComplete();
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Complete
              </button>
            )}
            {status === "completed" && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReopen();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reopen
              </button>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveToggle();
              }}
            >
              {status === "archived" ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Archive
                </>
              )}
            </button>
            <div className="border-t border-border mx-2 my-1" />
            {!confirmDelete ? (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-destructive/10 text-destructive font-medium text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Confirm Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
