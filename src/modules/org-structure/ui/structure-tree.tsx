"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Trash2, UserPlus2, X } from "lucide-react"
import { BlueprintButton } from "@/components/ui/blueprint-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RegCard } from "@/components/ui/reg-card"
import { SectionDivider } from "@/components/ui/section-divider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  assignPost,
  createContainer,
  createPost,
  deleteContainer,
  deletePost,
  unassignUserFromPost,
} from "../actions"
import { type OrgContainer, type OrgContainerLevel } from "../schema"

interface AssignedUser {
  id: string
  name: string
  email: string
  image: string | null
}

interface SerializablePost {
  id: string
  organizationId: string
  title: string
  description: string | null
  vfp: string | null
  parentContainerId: string | null
  isSenior: boolean
  isAreaManager: boolean
  position: number
  createdAt: string
  deletedAt: string | null
  assignedUsers: AssignedUser[]
}

interface Member {
  userId: string
  name: string
  email: string
  image: string | null
}

const NEXT_CHILD_LEVEL: Record<OrgContainerLevel, OrgContainerLevel | null> = {
  division: "department",
  department: "section",
  section: "unit",
  unit: null,
}

export function StructureTree({
  containers,
  posts,
  members,
}: {
  containers: OrgContainer[]
  posts: SerializablePost[]
  members: Member[]
}) {
  const containersByParent = useMemo(() => {
    const map = new Map<string | null, OrgContainer[]>()
    for (const c of containers) {
      const key = c.parentId ?? null
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [containers])

  const postsByContainer = useMemo(() => {
    const map = new Map<string | null, SerializablePost[]>()
    for (const p of posts) {
      const key = p.parentContainerId ?? null
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return map
  }, [posts])

  const topContainers = containersByParent.get(null) ?? []
  const floatingPosts = postsByContainer.get(null) ?? []

  const [showAddDivision, setShowAddDivision] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <BlueprintButton
          variant="primary"
          onClick={() => {
            setShowAddDivision(true)
          }}
          particle
        >
          Add Division
        </BlueprintButton>
      </div>

      {topContainers.length === 0 && floatingPosts.length === 0 ? (
        <div className="space-y-4">
          <SectionDivider label="Fig · 01 / Org Structure" count={0} />
          <RegCard state="new" className="px-10 py-12 text-center">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "var(--bp-text-muted)",
                textTransform: "uppercase",
              }}
            >
              No structure defined
            </p>
            <p
              className="mx-auto mt-3 max-w-[42ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--bp-text-secondary)",
                lineHeight: 1.55,
              }}
            >
              Build the org chart from the top down. Posts on this chart become Terminals — work
              routes through them at runtime.
            </p>
          </RegCard>
        </div>
      ) : (
        <div className="space-y-4">
          <SectionDivider
            label="Fig · 01 / Org Structure"
            count={containers.length + posts.length}
          />

          <div className="space-y-3">
            {topContainers.map((container) => (
              <ContainerNode
                key={container.id}
                container={container}
                containersByParent={containersByParent}
                postsByContainer={postsByContainer}
                members={members}
                depth={0}
              />
            ))}
            {floatingPosts.length > 0 && (
              <RegCard state="new">
                <p
                  className="mb-3"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    color: "var(--bp-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Floating posts (no container)
                </p>
                <div className="space-y-2">
                  {floatingPosts.map((post) => (
                    <PostNode key={post.id} post={post} members={members} />
                  ))}
                </div>
              </RegCard>
            )}
          </div>
        </div>
      )}

      <AddContainerDialog
        open={showAddDivision}
        onOpenChange={setShowAddDivision}
        level="division"
        parentId={null}
      />
    </div>
  )
}

function ContainerNode({
  container,
  containersByParent,
  postsByContainer,
  members,
  depth,
}: {
  container: OrgContainer
  containersByParent: Map<string | null, OrgContainer[]>
  postsByContainer: Map<string | null, SerializablePost[]>
  members: Member[]
  depth: number
}) {
  const router = useRouter()
  const children = containersByParent.get(container.id) ?? []
  const localPosts = postsByContainer.get(container.id) ?? []
  const nextChildLevel = NEXT_CHILD_LEVEL[container.level]
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAddPost, setShowAddPost] = useState(false)

  async function handleDelete() {
    const reparentMsg = container.parentId
      ? `Children will move up one level.`
      : `Children will become floating (top-level).`
    if (!confirm(`Delete ${container.name}? ${reparentMsg}`)) return
    const result = await deleteContainer({ id: container.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  return (
    <RegCard state={depth === 0 ? "active" : "queued"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: depth === 0 ? "var(--bp-accent-orange)" : "var(--bp-accent-steel-soft)",
                border: `1px solid ${depth === 0 ? "var(--bp-accent-orange)" : "var(--bp-accent-steel-soft)"}`,
                textTransform: "uppercase",
              }}
            >
              {container.level}
            </span>
            <h3
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--bp-text-primary)",
                lineHeight: 1.25,
              }}
            >
              {container.name}
            </h3>
          </div>
          {container.description && (
            <p
              className="mt-2 max-w-[60ch]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--bp-text-secondary)",
                lineHeight: 1.4,
              }}
            >
              {container.description}
            </p>
          )}
          {container.vfp && (
            <p
              className="mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--bp-accent-steel-soft)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              VFP · {container.vfp}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          {nextChildLevel && (
            <BlueprintButton
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddChild(true)
              }}
            >
              + {nextChildLevel}
            </BlueprintButton>
          )}
          <BlueprintButton
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddPost(true)
            }}
          >
            + Post
          </BlueprintButton>
          <button
            type="button"
            onClick={handleDelete}
            className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] hover:bg-white"
            aria-label="Delete container"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {(children.length > 0 || localPosts.length > 0) && (
        <div className="mt-4 space-y-3 border-l border-[#E4E4E4] pl-5">
          {localPosts.map((post) => (
            <PostNode key={post.id} post={post} members={members} />
          ))}
          {children.map((child) => (
            <ContainerNode
              key={child.id}
              container={child}
              containersByParent={containersByParent}
              postsByContainer={postsByContainer}
              members={members}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {nextChildLevel && (
        <AddContainerDialog
          open={showAddChild}
          onOpenChange={setShowAddChild}
          level={nextChildLevel}
          parentId={container.id}
        />
      )}
      <AddPostDialog
        open={showAddPost}
        onOpenChange={setShowAddPost}
        parentContainerId={container.id}
      />
    </RegCard>
  )
}

function PostNode({ post, members }: { post: SerializablePost; members: Member[] }) {
  const router = useRouter()
  const [showAssign, setShowAssign] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete post "${post.title}"?`)) return
    const result = await deletePost({ id: post.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  async function handleUnassign(userId: string) {
    const result = await unassignUserFromPost({ postId: post.id, userId })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  const assignedIds = new Set(post.assignedUsers.map((u) => u.id))
  const availableMembers = members.filter((m) => !assignedIds.has(m.userId))
  const isVacant = post.assignedUsers.length === 0

  return (
    <div className="bg-white p-3" style={{ border: "1px solid #E4E4E4" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {post.isAreaManager && (
              <Star className="size-3 fill-[#E8711A] text-[#E8711A]" strokeWidth={1.5} />
            )}
            <span
              className="px-1.5 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.2em",
                color: "var(--bp-accent-steel-soft)",
                border: "1px solid #5A7A92",
                textTransform: "uppercase",
              }}
            >
              Post
            </span>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--bp-text-primary)",
              }}
            >
              {post.title}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isVacant ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  color: "var(--bp-text-disabled)",
                  textTransform: "uppercase",
                }}
              >
                Vacant
              </span>
            ) : (
              post.assignedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    color: "var(--bp-text-primary)",
                    backgroundColor: "var(--bp-surface-card-queued)",
                    border: "1px solid #E4E4E4",
                  }}
                >
                  {u.name || u.email}
                  <button
                    type="button"
                    onClick={() => void handleUnassign(u.id)}
                    className="text-[#888] hover:text-[#E8711A]"
                    aria-label={`Remove ${u.name || u.email}`}
                  >
                    <X className="size-3" strokeWidth={2} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              setShowAssign(true)
            }}
            disabled={availableMembers.length === 0}
            className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4] disabled:opacity-30"
            title={
              availableMembers.length === 0
                ? "Every team member is already assigned"
                : "Assign a team member"
            }
          >
            <UserPlus2 className="size-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="grid place-items-center border border-transparent p-1.5 hover:border-[#E4E4E4]"
            aria-label="Delete post"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <AssignPostDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        postId={post.id}
        members={availableMembers}
      />
    </div>
  )
}

function AddContainerDialog({
  open,
  onOpenChange,
  level,
  parentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  level: OrgContainerLevel
  parentId: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [vfp, setVfp] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await createContainer({
      level,
      name,
      description: description || undefined,
      vfp: vfp || undefined,
      parentId,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setName("")
    setDescription("")
    setVfp("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">New {level}</DialogTitle>
          <DialogDescription>Create a new {level} in the org structure.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div>
            <Label htmlFor="vfp">Valuable Final Product (optional)</Label>
            <Input
              id="vfp"
              value={vfp}
              onChange={(e) => {
                setVfp(e.target.value)
              }}
            />
          </div>
          <DialogFooter>
            <BlueprintButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </BlueprintButton>
            <BlueprintButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !name}
            >
              {submitting ? "Creating..." : "Create"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddPostDialog({
  open,
  onOpenChange,
  parentContainerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentContainerId: string | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await createPost({
      title,
      description: description || undefined,
      parentContainerId,
    })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setTitle("")
    setDescription("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
          <DialogDescription>
            A position that can be held by an employee. Work routes through Posts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="post-description">Description (optional)</Label>
            <Input
              id="post-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <DialogFooter>
            <BlueprintButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </BlueprintButton>
            <BlueprintButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !title}
            >
              {submitting ? "Creating..." : "Create"}
            </BlueprintButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssignPostDialog({
  open,
  onOpenChange,
  postId,
  members,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  members: Member[]
}) {
  const router = useRouter()
  const [userId, setUserId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!userId) return
    setSubmitting(true)
    const result = await assignPost({ id: postId, userId })
    setSubmitting(false)
    if (result.serverError) {
      alert(result.serverError)
      return
    }
    setUserId("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Employee</DialogTitle>
          <DialogDescription>
            Pick a team member to hold this post. They&rsquo;ll receive cycles routed to it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a team member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <BlueprintButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </BlueprintButton>
          <BlueprintButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !userId}
          >
            {submitting ? "Assigning..." : "Assign"}
          </BlueprintButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
