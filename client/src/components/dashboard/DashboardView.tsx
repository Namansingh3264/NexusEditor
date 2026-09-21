"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  FilePlus2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
} from "lucide-react"

import ConfirmDialog from "@/components/ConfirmDialog"
import ShareDialog from "@/components/ShareDialog"
import DocumentCard from "@/components/dashboard/DocumentCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/toast"
import { api, getErrorMessage } from "@/lib/apiClient"
import type { DocumentSummary } from "@/lib/documents"
import { cn } from "@/lib/utils"

type Filter = "all" | "owned" | "shared"
type SortKey = "recent" | "created" | "title"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned by me" },
  { value: "shared", label: "Shared with me" },
]

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Last edited",
  created: "Date created",
  title: "Title (A–Z)",
}

export default function DashboardView() {
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useSession()

  const [documents, setDocuments] = React.useState<DocumentSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [sort, setSort] = React.useState<SortKey>("recent")

  const [shareTarget, setShareTarget] = React.useState<DocumentSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentSummary | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadDocuments = React.useCallback(async () => {
    setLoadError(null)
    try {
      const { data } = await api.get<{ list: DocumentSummary[] }>("/docs")
      setDocuments(data.list ?? [])
    } catch (error) {
      setLoadError(getErrorMessage(error, "Could not load your documents"))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  async function handleCreate() {
    setCreating(true)
    try {
      const { data } = await api.post<{ document: { id: string } }>("/docs", {
        title: "Untitled document",
        content: "",
      })
      router.push(`/documents/${data.document.id}`)
    } catch (error) {
      toast({ title: "Could not create document", description: getErrorMessage(error), variant: "error" })
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await api.delete(`/docs/${deleteTarget.id}`)
      setDocuments((current) => current.filter((item) => item.id !== deleteTarget.id))
      toast({ title: `Deleted “${deleteTarget.title}”`, variant: "success" })
      setDeleteTarget(null)
    } catch (error) {
      toast({ title: "Could not delete", description: getErrorMessage(error), variant: "error" })
    } finally {
      setDeleting(false)
    }
  }

  const visibleDocuments = React.useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = documents.filter((document) => {
      if (filter === "owned" && !document.isOwner) return false
      if (filter === "shared" && document.isOwner) return false
      if (!needle) return true
      return document.title.toLowerCase().includes(needle)
    })

    return [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title)
      if (sort === "created")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [documents, filter, query, sort])

  const ownedCount = documents.filter((document) => document.isOwner).length
  const sharedCount = documents.length - ownedCount
  const firstName = session?.user?.name?.split(" ")[0]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {firstName ? `Welcome back, ${firstName}` : "Your documents"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit and collaborate on documents in real time.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={creating} className="sm:w-auto">
          {creating ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
          {creating ? "Creating…" : "New document"}
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={FileText} label="Total documents" value={documents.length} loading={loading} />
        <StatTile icon={Share2} label="Owned by you" value={ownedCount} loading={loading} />
        <StatTile icon={Users} label="Shared with you" value={sharedCount} loading={loading} />
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter documents"
          className="flex w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 lg:w-auto scrollbar-hidden"
        >
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors lg:flex-none",
                filter === item.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-72 lg:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search documents…"
              aria-label="Search documents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-white pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Sort documents" className="bg-white">
                <SlidersHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <DocumentGridSkeleton />
        ) : loadError ? (
          <EmptyState
            icon={RefreshCw}
            title="Could not load your documents"
            description={loadError}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true)
                  void loadDocuments()
                }}
              >
                <RefreshCw />
                Try again
              </Button>
            }
          />
        ) : visibleDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={documents.length === 0 ? "No documents yet" : "No matching documents"}
            description={
              documents.length === 0
                ? "Create your first document and invite people to write it with you."
                : "Try a different search term or filter."
            }
            action={
              documents.length === 0 ? (
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
                  New document
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("")
                    setFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onShare={setShareTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {shareTarget ? (
        <ShareDialog
          documentId={shareTarget.id}
          documentTitle={shareTarget.title}
          open={Boolean(shareTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setShareTarget(null)
              void loadDocuments()
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this document?"
        description={`“${deleteTarget?.title || "Untitled document"}” and everyone's access to it will be permanently removed. This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        pending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-8" />
        ) : (
          <p className="text-lg leading-tight font-semibold text-slate-900">{value}</p>
        )}
      </div>
    </div>
  )
}

function DocumentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="space-y-2 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
