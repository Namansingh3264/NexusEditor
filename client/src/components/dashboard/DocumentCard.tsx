"use client"

import Link from "next/link"
import { Eye, MoreVertical, PencilLine, Share2, ShieldCheck, Trash2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PERMISSION_BADGE_VARIANT,
  PERMISSION_LABELS,
  type DocumentSummary,
} from "@/lib/documents"
import { formatRelativeTime, toPlainTextPreview } from "@/lib/format"

const PERMISSION_ICONS = {
  OWNER: ShieldCheck,
  EDITOR: PencilLine,
  VIEWER: Eye,
} as const

export default function DocumentCard({
  document,
  onShare,
  onDelete,
}: {
  document: DocumentSummary
  onShare: (document: DocumentSummary) => void
  onDelete: (document: DocumentSummary) => void
}) {
  const preview = toPlainTextPreview(document.content || "")
  const PermissionIcon = PERMISSION_ICONS[document.permission]

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/40">
      {/* Document preview. The whole area is the primary click target. */}
      <Link
        href={`/documents/${document.id}`}
        className="block flex-1 outline-none"
        aria-label={`Open ${document.title}`}
      >
        <div className="relative h-36 overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4">
          {preview ? (
            <p className="line-clamp-5 text-[13px] leading-relaxed text-slate-500">{preview}</p>
          ) : (
            <p className="text-[13px] text-slate-400 italic">Empty document</p>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="px-5 pt-4">
          <h3 className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-indigo-600">
            {document.title || "Untitled document"}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">
            {document.isOwner
              ? `Edited ${formatRelativeTime(document.updated_at)}`
              : `${document.owner?.name || document.owner?.email || "Someone"} · ${formatRelativeTime(document.updated_at)}`}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-5 pt-3 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant={PERMISSION_BADGE_VARIANT[document.permission]}>
            <PermissionIcon />
            {PERMISSION_LABELS[document.permission]}
          </Badge>

          {document.collaboratorCount > 0 ? (
            <span
              className="flex items-center gap-1 text-xs text-slate-400"
              title={`${document.collaboratorCount} collaborator${document.collaboratorCount === 1 ? "" : "s"}`}
            >
              <Users className="size-3.5" />
              {document.collaboratorCount}
            </span>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${document.title}`}
              className="rounded-md p-1.5 text-slate-400 transition-colors outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/documents/${document.id}`}>
                <PencilLine />
                Open
              </Link>
            </DropdownMenuItem>

            {document.isOwner ? (
              <>
                <DropdownMenuItem onSelect={() => onShare(document)}>
                  <Share2 />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(document)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}
