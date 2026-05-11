"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { deleteManifestFolder, moveManifestToFolder, updateManifestFolder } from "../actions"
import type { Manifest, ManifestFolder } from "../schema"
import { CreateManifestFolderModal } from "./create-manifest-folder-modal"
import { CreateManifestModal } from "./create-manifest-modal"

interface Props {
  manifests: Manifest[]
  folders: ManifestFolder[]
}

export function ManifestList({ manifests, folders }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const moveAction = useAction(moveManifestToFolder, {
    onSuccess: () => {
      router.refresh()
    },
  })
  const updateFolderAction = useAction(updateManifestFolder, {
    onSuccess: () => {
      router.refresh()
    },
  })
  const deleteFolderAction = useAction(deleteManifestFolder, {
    onSuccess: () => {
      router.refresh()
    },
  })

  const filtered = manifests.filter((m) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || (m.description?.toLowerCase().includes(q) ?? false)
  })

  // Bucket by folder. When a search query is active, ignore folder boundaries
  // and show all matches in a single flat list (per spec).
  const isSearching = query.trim().length > 0
  const rootManifests = filtered.filter((m) => m.folderId === null)
  const byFolder = new Map<string, Manifest[]>()
  for (const f of folders) byFolder.set(f.id, [])
  for (const m of filtered) {
    if (m.folderId !== null) {
      const arr = byFolder.get(m.folderId)
      if (arr) arr.push(m)
      // If folder doesn't exist (orphan), the manifest is hidden — shouldn't
      // happen because ON DELETE SET NULL, but defensive.
    }
  }

  function toggleCollapsed(folderId: string) {
    setCollapsed((curr) => {
      const next = new Set(curr)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  function handleRenameFolder(folder: ManifestFolder) {
    const next = window.prompt("Folder name", folder.name)
    if (next === null) return
    const trimmed = next.trim()
    if (trimmed === "" || trimmed === folder.name) return
    updateFolderAction.execute({ id: folder.id, name: trimmed })
  }

  function handleDeleteFolder(folder: ManifestFolder) {
    const ok = window.confirm(
      `Delete folder "${folder.name}"? Manifests inside will move back to the root list.`,
    )
    if (!ok) return
    deleteFolderAction.execute({ id: folder.id })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Search manifests"
          placeholder="Search manifests..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          className="max-w-md"
        />
        <div className="ml-auto flex items-center gap-2">
          <BlueprintButton
            variant="outline"
            onClick={() => {
              setNewFolderOpen(true)
            }}
          >
            New Folder
          </BlueprintButton>
          <BlueprintButton
            variant="primary"
            particle
            onClick={() => {
              setCreateOpen(true)
            }}
          >
            New Manifest
          </BlueprintButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="py-12 text-center"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--bp-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {manifests.length === 0
            ? "No manifests yet — create your first manifest template to start collecting data on your rails."
            : "No manifests match your search."}
        </div>
      ) : isSearching ? (
        // Search mode: flat list, ignore folders.
        <ManifestGrid
          manifests={filtered}
          folders={folders}
          onMove={(manifestId, folderId) => {
            moveAction.execute({ manifestId, folderId })
          }}
        />
      ) : (
        <>
          {rootManifests.length > 0 && (
            <ManifestGrid
              manifests={rootManifests}
              folders={folders}
              onMove={(manifestId, folderId) => {
                moveAction.execute({ manifestId, folderId })
              }}
            />
          )}

          {folders.map((folder) => {
            const folderManifests = byFolder.get(folder.id) ?? []
            const isCollapsed = collapsed.has(folder.id)
            return (
              <section key={folder.id}>
                <div
                  className="mb-3 flex items-center gap-2 border-b pb-2"
                  style={{ borderColor: "var(--bp-border-default)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      toggleCollapsed(folder.id)
                    }}
                    aria-label={isCollapsed ? "Expand folder" : "Collapse folder"}
                    className="grid place-items-center p-1 hover:bg-[var(--bp-surface-card-active)]"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-4" strokeWidth={1.75} />
                    ) : (
                      <ChevronDown className="size-4" strokeWidth={1.75} />
                    )}
                  </button>
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--bp-text-primary)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {folder.name}
                  </h3>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--bp-text-muted)",
                    }}
                  >
                    {folderManifests.length} manifest{folderManifests.length === 1 ? "" : "s"}
                  </span>
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Folder ${folder.name} actions`}
                          className="grid place-items-center p-1 hover:bg-[var(--bp-surface-card-active)]"
                        >
                          <MoreHorizontal className="size-4" strokeWidth={1.75} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            handleRenameFolder(folder)
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            handleDeleteFolder(folder)
                          }}
                        >
                          Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {!isCollapsed &&
                  (folderManifests.length === 0 ? (
                    <p
                      className="py-3 text-center"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--bp-text-muted)",
                      }}
                    >
                      Empty folder. Use a manifest&rsquo;s menu to move it here.
                    </p>
                  ) : (
                    <ManifestGrid
                      manifests={folderManifests}
                      folders={folders}
                      onMove={(manifestId, folderId) => {
                        moveAction.execute({ manifestId, folderId })
                      }}
                    />
                  ))}
              </section>
            )
          })}
        </>
      )}

      <CreateManifestModal open={createOpen} onOpenChange={setCreateOpen} />
      <CreateManifestFolderModal open={newFolderOpen} onOpenChange={setNewFolderOpen} />
    </div>
  )
}

/** Grid of manifest tiles. Each tile has a "..." menu with a "Move to folder" submenu. */
function ManifestGrid({
  manifests,
  folders,
  onMove,
}: {
  manifests: Manifest[]
  folders: ManifestFolder[]
  onMove: (manifestId: string, folderId: string | null) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {manifests.map((m) => (
        <div
          key={m.id}
          className="relative rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-accent)]"
        >
          <Link
            href={`/admin/manifest-management/${m.id}`}
            className="absolute inset-0"
            aria-label={`Open ${m.name}`}
          />
          <div className="relative flex items-start justify-between gap-2">
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--bp-text-primary)",
                lineHeight: 1.25,
              }}
            >
              {m.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className="rounded px-2 py-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--bp-text-muted)",
                  backgroundColor: "var(--color-muted)",
                }}
              >
                Template
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${m.name} actions`}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    className="relative grid place-items-center p-1 hover:bg-[var(--bp-surface-card-active)]"
                  >
                    <MoreHorizontal className="size-4" strokeWidth={1.75} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Move to folder</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={m.folderId === null}
                    onClick={() => {
                      onMove(m.id, null)
                    }}
                  >
                    (No folder)
                  </DropdownMenuItem>
                  {folders.length > 0 && <DropdownMenuSeparator />}
                  {folders.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      disabled={m.folderId === f.id}
                      onClick={() => {
                        onMove(m.id, f.id)
                      }}
                    >
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                  {folders.length === 0 && (
                    <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {m.description && (
            <p
              className="relative mt-1 line-clamp-1"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                color: "var(--bp-text-secondary)",
                lineHeight: 1.4,
              }}
            >
              {m.description}
            </p>
          )}
          <p
            className="relative mt-3"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--bp-accent-steel-soft)",
            }}
          >
            {m.fields.length} field{m.fields.length === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  )
}
