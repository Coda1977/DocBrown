"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  Archive,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Inbox,
} from "lucide-react";

export type FolderFilter =
  | { type: "all" }
  | { type: "archived" }
  | { type: "folder"; folderId: Id<"folders"> };

export function FolderSidebar({
  active,
  onSelect,
}: {
  active: FolderFilter;
  onSelect: (filter: FolderFilter) => void;
}) {
  const folders = useQuery(api.folders.list);
  const createFolder = useMutation(api.folders.create);
  const updateFolder = useMutation(api.folders.update);
  const removeFolder = useMutation(api.folders.remove);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<Id<"folders"> | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createFolder({ name: newName.trim() });
    setNewName("");
    setAdding(false);
  }

  async function handleRename() {
    if (!editingId || !editName.trim()) return;
    await updateFolder({ folderId: editingId, name: editName.trim() });
    setEditingId(null);
    setEditName("");
  }

  async function handleDelete(folderId: Id<"folders">) {
    await removeFolder({ folderId });
    if (active.type === "folder" && active.folderId === folderId) {
      onSelect({ type: "all" });
    }
  }

  return (
    <div className="w-[220px] border-r border-border bg-card shrink-0 flex flex-col">
      <div className="p-3 space-y-1">
        <button
          onClick={() => onSelect({ type: "all" })}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            active.type === "all"
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-foreground"
          )}
        >
          <Inbox className="h-4 w-4" />
          All Sessions
        </button>
        <button
          onClick={() => onSelect({ type: "archived" })}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            active.type === "archived"
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          <Archive className="h-4 w-4" />
          Archived
        </button>
      </div>

      <div className="border-t border-border mx-3" />

      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </span>
          <button
            onClick={() => setAdding(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {adding && (
          <div className="flex items-center gap-1 mb-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Folder name"
              className="h-7 text-xs"
              autoFocus
            />
            <button onClick={handleCreate} className="p-1 rounded hover:bg-muted">
              <Check className="h-3.5 w-3.5 text-accent" />
            </button>
            <button onClick={() => setAdding(false)} className="p-1 rounded hover:bg-muted">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {(folders ?? []).map((folder) =>
          editingId === folder._id ? (
            <div key={folder._id} className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 text-xs"
                autoFocus
              />
              <button onClick={handleRename} className="p-1 rounded hover:bg-muted">
                <Check className="h-3.5 w-3.5 text-accent" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div key={folder._id} className="group flex items-center">
              <button
                onClick={() =>
                  onSelect({ type: "folder", folderId: folder._id })
                }
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  active.type === "folder" && active.folderId === folder._id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
              <div className="hidden group-hover:flex items-center">
                <button
                  onClick={() => {
                    setEditingId(folder._id);
                    setEditName(folder.name);
                  }}
                  className="p-1 rounded hover:bg-muted"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(folder._id)}
                  className="p-1 rounded hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
