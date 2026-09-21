"use client"

import * as React from "react"
import { Check, Copy, Loader2, Mail, Trash2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { api, getErrorMessage } from "@/lib/apiClient"
import { colorFromString, getInitials } from "@/lib/format"
import { PERMISSION_LABELS, type Collaborator } from "@/lib/documents"

type InviteRole = "EDITOR" | "VIEWER"

/**
 * The previous share modal reused the *current user's* permission state as the
 * role to grant, and its `onValueChange` wrote straight back to that state — so
 * picking "Viewer" in the dialog silently downgraded your own editor to
 * read-only. Invite role is now local state, entirely separate from the
 * viewer's own access level.
 */
export default function ShareDialog({
  documentId,
  documentTitle,
  open,
  onOpenChange,
}: {
  documentId: string
  documentTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const toast = useToast()
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<InviteRole>("EDITOR")
  const [collaborators, setCollaborators] = React.useState<Collaborator[]>([])
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const loadCollaborators = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ collaborators: Collaborator[] }>(
        `/docs/${documentId}/collaborators`,
      )
      setCollaborators(data.collaborators)
    } catch (error) {
      toast({ title: "Could not load collaborators", description: getErrorMessage(error), variant: "error" })
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  React.useEffect(() => {
    if (open && documentId) {
      void loadCollaborators()
    }
  }, [open, documentId, loadCollaborators])

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = email.trim()
    if (!trimmed) {
      toast({ title: "Enter an email address", variant: "error" })
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post<{ message: string }>(`/docs/${documentId}/collaborators`, {
        email: trimmed,
        permission: role,
      })
      toast({ title: data.message, variant: "success" })
      setEmail("")
      await loadCollaborators()
    } catch (error) {
      toast({ title: "Could not share", description: getErrorMessage(error), variant: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(collaborator: Collaborator) {
    setRevokingId(collaborator.id)
    try {
      await api.delete(`/docs/${documentId}/collaborators`, {
        params: { permissionId: collaborator.id },
      })
      toast({ title: `Removed ${collaborator.email}`, variant: "success" })
      setCollaborators((current) => current.filter((item) => item.id !== collaborator.id))
    } catch (error) {
      toast({ title: "Could not remove access", description: getErrorMessage(error), variant: "error" })
    } finally {
      setRevokingId(null)
    }
  }

  async function handleCopyLink() {
    const link = `${window.location.origin}/documents/${documentId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Could not copy link", description: link, variant: "error" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Share “{documentTitle || "Untitled document"}”</DialogTitle>
          <DialogDescription>
            People you invite can open this document from their own dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="share-email">Invite by email</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="share-email"
                  type="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
                <SelectTrigger className="sm:w-36" aria-label="Access level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">Can edit</SelectItem>
                  <SelectItem value="VIEWER">Can view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
            {submitting ? "Sharing…" : "Share"}
          </Button>
        </form>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-900">People with access</p>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <p className="py-3 text-sm text-slate-500">Nobody else has access yet.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <li
                  key={collaborator.id}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-slate-50"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: colorFromString(collaborator.email) }}
                  >
                    {getInitials(collaborator.name, collaborator.email)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {collaborator.name || collaborator.email}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {collaborator.name ? `${collaborator.email} · ` : ""}
                      {PERMISSION_LABELS[collaborator.permission]}
                      {collaborator.pending ? " · invite pending" : ""}
                    </span>
                  </span>

                  {collaborator.permission === "OWNER" ? (
                    <span className="shrink-0 pr-2 text-xs font-medium text-slate-400">Owner</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevoke(collaborator)}
                      disabled={revokingId === collaborator.id}
                      aria-label={`Remove ${collaborator.email}`}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {revokingId === collaborator.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="text-emerald-600" /> : <Copy />}
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
