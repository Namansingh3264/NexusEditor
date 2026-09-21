"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"
import {
  ArrowLeft,
  Check,
  CloudOff,
  Eye,
  Loader2,
  Share2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"

import ShareDialog from "@/components/ShareDialog"
import EditorToolbar from "@/components/editor/EditorToolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { api, getErrorMessage } from "@/lib/apiClient"
import { WEBSOCKET_URL } from "@/lib/config"
import { colorFromString, formatRelativeTime } from "@/lib/format"
import type { PermissionLevel } from "@/lib/types"
import { cn } from "@/lib/utils"

type ConnectionStatus = "disconnected" | "connecting" | "connected"
type SaveState = "idle" | "saving" | "saved" | "error"

const AUTOSAVE_DELAY_MS = 1200

export type DocumentEditorProps = {
  documentId: string
  initialTitle: string
  initialContent: string
  permission: PermissionLevel
  canEdit: boolean
  canShare: boolean
  ownerName: string | null
  ownerEmail: string
  updatedAt: string
  /** True when a Yjs state blob is already persisted for this document. */
  hasCollaborationState: boolean
}

export default function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  permission,
  canEdit,
  canShare,
  ownerName,
  ownerEmail,
  updatedAt,
  hasCollaborationState,
}: DocumentEditorProps) {
  const toast = useToast()
  const { data: session } = useSession()

  const [title, setTitle] = React.useState(initialTitle)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [lastSavedAt, setLastSavedAt] = React.useState<string>(updatedAt)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [wordCount, setWordCount] = React.useState(0)

  const [ydoc, setYdoc] = React.useState<Y.Doc | null>(null)
  const [provider, setProvider] = React.useState<SocketIOProvider | null>(null)
  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("disconnected")
  const [peerCount, setPeerCount] = React.useState(0)

  const isCollaborating = Boolean(ydoc && provider)

  // Kept in refs so unmount cleanup and debounced saves always see live values
  // instead of the values captured when the effect first ran.
  const ydocRef = React.useRef<Y.Doc | null>(null)
  const providerRef = React.useRef<SocketIOProvider | null>(null)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = React.useRef({ title: initialTitle, content: initialContent })
  const editorRef = React.useRef<ReturnType<typeof useEditor>>(null)
  /** HTML captured when a session starts, used to seed the shared document. */
  const seedContentRef = React.useRef("")
  /**
   * False between opening a session and the shared document being ready. A
   * freshly built collaborative editor is momentarily empty, and autosaving
   * that emptiness overwrote the real document with `<p></p>`.
   */
  const collabReadyRef = React.useRef(true)

  const userColor = React.useMemo(
    () => colorFromString(session?.user?.email || "anonymous"),
    [session?.user?.email],
  )

  const persist = React.useCallback(
    async (payload: { title?: string; content?: string }) => {
      if (!canEdit) return

      setSaveState("saving")
      try {
        const { data } = await api.patch<{ document: { updated_at: string } }>(
          `/docs/${documentId}`,
          payload,
        )
        setLastSavedAt(data.document.updated_at)
        setSaveState("saved")
      } catch (error) {
        setSaveState("error")
        toast({ title: "Could not save", description: getErrorMessage(error), variant: "error" })
      }
    },
    [canEdit, documentId, toast],
  )

  const scheduleSave = React.useCallback(() => {
    if (!canEdit) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void persist({ title: latestRef.current.title, content: latestRef.current.content })
    }, AUTOSAVE_DELAY_MS)
  }, [canEdit, persist])

  const editor = useEditor(
    {
      // Without this Tiptap throws during server rendering in the App Router.
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({
          // Collaboration ships its own Yjs-aware history; running both at once
          // corrupts the undo stack.
          history: isCollaborating ? false : undefined,
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight,
        Placeholder.configure({
          placeholder: canEdit ? "Start writing…" : "This document is empty.",
        }),
        ...(ydoc && provider
          ? [
              Collaboration.configure({ document: ydoc }),
              CollaborationCursor.configure({
                provider,
                user: {
                  name: session?.user?.name || session?.user?.email || "Anonymous",
                  color: userColor,
                },
              }),
            ]
          : []),
      ],
      // In collaborative mode the content comes from the Yjs document, so
      // passing HTML here would duplicate it on every reconnect.
      content: ydoc ? undefined : latestRef.current.content,
      editorProps: {
        attributes: {
          class: "editor-content min-h-[60vh] px-6 py-8 sm:px-12 sm:py-12",
        },
      },
      onUpdate: ({ editor: instance }) => {
        if (!collabReadyRef.current) return
        latestRef.current.content = instance.getHTML()
        scheduleSave()
      },
    },
    [ydoc, provider],
  )

  React.useEffect(() => {
    editor?.setEditable(canEdit)
  }, [editor, canEdit])

  /**
   * Bridge the saved HTML into the shared Yjs document when a session opens.
   *
   * Seeding only happens for a document that has never been collaborated on
   * (`hasCollaborationState` false) and whose shared fragment is still empty,
   * so a later joiner can never duplicate the content. Once the document is
   * settled, autosave is re-enabled.
   *
   * This lives in an effect rather than the provider's own "sync" handler
   * because that event can fire before React has built the collaborative
   * editor instance.
   */
  React.useEffect(() => {
    if (!editor || !provider || !ydoc) return

    let cancelled = false

    const settle = () => {
      if (cancelled) return

      if (!hasCollaborationState && seedContentRef.current) {
        const fragment = ydoc.getXmlFragment("default")
        if (fragment.length === 0) {
          editor.commands.setContent(seedContentRef.current)
        }
      }

      latestRef.current.content = editor.getHTML()
      collabReadyRef.current = true
    }

    const onSync = (synced: boolean) => {
      if (synced) settle()
    }

    // If the server is unreachable there will be no sync; fall back to the
    // local copy so the session is still usable and still saves.
    const onError = () => settle()

    if (provider.synced) {
      settle()
    } else {
      provider.on("sync", onSync)
      provider.on("connection-error", onError)
    }

    return () => {
      cancelled = true
      provider.off("sync", onSync)
      provider.off("connection-error", onError)
    }
  }, [editor, provider, ydoc, hasCollaborationState])

  function startCollaboration() {
    if (providerRef.current || !canEdit) return

    const email = session?.user?.email
    if (!email) {
      toast({ title: "Sign in again to collaborate", variant: "error" })
      return
    }

    // Capture before any state update rebuilds the editor.
    seedContentRef.current = editorRef.current?.getHTML() || latestRef.current.content
    collabReadyRef.current = false
    setConnectionStatus("connecting")

    const doc = new Y.Doc()
    const socketProvider = new SocketIOProvider(
      WEBSOCKET_URL,
      documentId,
      doc,
      { autoConnect: true },
      { query: { doc_id: documentId, email } },
    )

    socketProvider.on("status", ({ status }: { status: ConnectionStatus }) => {
      setConnectionStatus(status)
    })

    socketProvider.on("connection-error", (error: unknown) => {
      console.error("[collab] connection error:", error)
      setConnectionStatus("disconnected")
      toast({
        title: "Collaboration server unreachable",
        description: "Check that the collaboration server is running.",
        variant: "error",
      })
    })

    socketProvider.awareness.on("change", () => {
      setPeerCount(Math.max(socketProvider.awareness.getStates().size - 1, 0))
    })

    ydocRef.current = doc
    providerRef.current = socketProvider
    setYdoc(doc)
    setProvider(socketProvider)
  }

  const teardownCollaboration = React.useCallback(() => {
    providerRef.current?.destroy()
    ydocRef.current?.destroy()
    providerRef.current = null
    ydocRef.current = null
  }, [])

  function stopCollaboration() {
    if (!providerRef.current) return

    const html = editorRef.current?.getHTML()
    if (html && canEdit) {
      // Must happen before the state updates below: rebuilding the editor
      // seeds it from latestRef.
      latestRef.current.content = html
    }

    collabReadyRef.current = true
    teardownCollaboration()
    setProvider(null)
    setYdoc(null)
    setConnectionStatus("disconnected")
    setPeerCount(0)

    if (html && canEdit) {
      void persist({ content: html })
    }
  }

  // `editor` changes identity whenever collaboration toggles; the ref keeps the
  // socket callbacks pointed at the current instance.
  React.useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Flush pending work exactly once, on unmount. The original cleanup captured
  // `provider`/`ydoc` from the first render, so they were always null and the
  // socket was never closed.
  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      teardownCollaboration()
    }
  }, [teardownCollaboration])

  function handleTitleChange(value: string) {
    setTitle(value)
    latestRef.current.title = value
    scheduleSave()
  }

  React.useEffect(() => {
    if (!editor) return

    const update = () => {
      const text = editor.getText().trim()
      setWordCount(text ? text.split(/\s+/).length : 0)
    }

    update()
    editor.on("update", update)
    return () => {
      editor.off("update", update)
    }
  }, [editor])

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Document bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <Button variant="ghost" size="icon" asChild aria-label="Back to dashboard">
            <Link href="/dashboard">
              <ArrowLeft />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <Input
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              readOnly={!canEdit}
              aria-label="Document title"
              placeholder="Untitled document"
              className="h-9 truncate border-transparent bg-transparent px-2 text-[15px] font-semibold shadow-none hover:border-slate-200 focus-visible:border-slate-300 focus-visible:ring-0 sm:text-base"
            />
            <div className="flex items-center gap-2 px-2">
              <SaveStatus state={saveState} lastSavedAt={lastSavedAt} canEdit={canEdit} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isCollaborating ? (
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:flex",
                  connectionStatus === "connected"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
              >
                {connectionStatus === "connected" ? (
                  <Wifi className="size-3.5" />
                ) : (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                {connectionStatus === "connected" ? "Live" : "Connecting…"}
                {peerCount > 0 ? (
                  <span className="flex items-center gap-1 border-l border-emerald-200 pl-1.5">
                    <Users className="size-3" />
                    {peerCount}
                  </span>
                ) : null}
              </span>
            ) : null}

            {canShare ? (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 />
                <span className="hidden sm:inline">Share</span>
              </Button>
            ) : null}

            {canEdit ? (
              <Button
                size="sm"
                variant={isCollaborating ? "destructive" : "default"}
                onClick={isCollaborating ? stopCollaboration : startCollaboration}
              >
                {isCollaborating ? <WifiOff /> : <Wifi />}
                <span className="hidden sm:inline">
                  {isCollaborating ? "Stop session" : "Collaborate"}
                </span>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <EditorToolbar editor={editor} disabled={!canEdit} />

      {!canEdit ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 text-sm text-amber-800">
            <Eye className="size-4 shrink-0" />
            <span>
              You have view-only access to this document
              {ownerEmail ? ` shared by ${ownerName || ownerEmail}` : ""}.
            </span>
          </div>
        </div>
      ) : null}

      {/* Page */}
      <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <EditorContent editor={editor} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <Badge variant={permission === "OWNER" ? "owner" : permission === "EDITOR" ? "editor" : "viewer"}>
            {permission === "OWNER" ? "Owner" : permission === "EDITOR" ? "Can edit" : "Can view"}
          </Badge>
        </div>
      </main>

      {canShare ? (
        <ShareDialog
          documentId={documentId}
          documentTitle={title}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}
    </div>
  )
}

function SaveStatus({
  state,
  lastSavedAt,
  canEdit,
}: {
  state: SaveState
  lastSavedAt: string
  canEdit: boolean
}) {
  if (!canEdit) {
    return <span className="text-xs text-slate-500">Read only</span>
  }

  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }

  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600">
        <CloudOff className="size-3" />
        Not saved
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <Check className="size-3 text-emerald-600" />
      Saved {formatRelativeTime(lastSavedAt)}
    </span>
  )
}
