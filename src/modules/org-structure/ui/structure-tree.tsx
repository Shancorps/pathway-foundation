"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2, UserMinus, UserPlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  unassignPost,
} from "../actions"
import { type OrgContainer, type OrgContainerLevel } from "../schema"

interface SerializablePost {
  id: string
  organizationId: string
  title: string
  description: string | null
  vfp: string | null
  parentContainerId: string | null
  userId: string | null
  isSenior: boolean
  isAreaManager: boolean
  position: number
  createdAt: string
  deletedAt: string | null
  assignedUser: {
    id: string
    name: string
    email: string
    image: string | null
  } | null
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setShowAddDivision(true)
          }}
        >
          <Plus className="size-4" />
          Add Division
        </Button>
      </div>

      {topContainers.length === 0 && floatingPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No org structure yet. Start by adding a division.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topContainers.map((container) => (
            <ContainerNode
              key={container.id}
              container={container}
              containersByParent={containersByParent}
              postsByContainer={postsByContainer}
              members={members}
            />
          ))}
          {floatingPosts.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-xs tracking-wide text-[var(--color-muted-foreground)] uppercase">
                Floating posts (no container)
              </p>
              <div className="mt-3 space-y-2">
                {floatingPosts.map((post) => (
                  <PostNode key={post.id} post={post} members={members} />
                ))}
              </div>
            </div>
          )}
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
}: {
  container: OrgContainer
  containersByParent: Map<string | null, OrgContainer[]>
  postsByContainer: Map<string | null, SerializablePost[]>
  members: Member[]
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
    <div
      className="rounded-lg border border-[var(--color-border)] p-4"
      style={container.color ? { borderColor: container.color, borderWidth: 2 } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="tracking-wide uppercase">
              {container.level}
            </Badge>
            <p className="text-base font-semibold">{container.name}</p>
          </div>
          {container.description && (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {container.description}
            </p>
          )}
          {container.vfp && (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              <span className="font-medium">VFP:</span> {container.vfp}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {nextChildLevel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddChild(true)
              }}
            >
              <Plus className="size-3" /> {nextChildLevel}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAddPost(true)
            }}
          >
            <Plus className="size-3" /> Post
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {(children.length > 0 || localPosts.length > 0) && (
        <div className="mt-3 space-y-2 border-l-2 border-[var(--color-border)] pl-4">
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
    </div>
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

  async function handleUnassign() {
    const result = await unassignPost({ id: post.id })
    if (result.serverError) alert(result.serverError)
    else router.refresh()
  }

  const displayName = post.assignedUser
    ? post.assignedUser.name || post.assignedUser.email
    : "Vacant"

  return (
    <div className="flex items-center justify-between rounded-md bg-[var(--color-muted)]/30 p-3">
      <div className="flex items-center gap-2">
        {post.isAreaManager && <Star className="size-3 fill-amber-400 text-amber-400" />}
        <div>
          <p className="text-sm font-medium">{post.title}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{displayName}</p>
        </div>
      </div>
      <div className="flex gap-1">
        {post.userId ? (
          <Button size="sm" variant="ghost" onClick={handleUnassign}>
            <UserMinus className="size-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowAssign(true)
            }}
          >
            <UserPlus2 className="size-3" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleDelete}>
          <Trash2 className="size-3" />
        </Button>
      </div>
      <AssignPostDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        postId={post.id}
        members={members}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name}>
              {submitting ? "Creating..." : "Create"}
            </Button>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title}>
              {submitting ? "Creating..." : "Create"}
            </Button>
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
          <DialogTitle>Assign employee</DialogTitle>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !userId}>
            {submitting ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
