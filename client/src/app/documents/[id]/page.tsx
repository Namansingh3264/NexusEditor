import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import DocumentEditor from "@/components/editor/DocumentEditor"
import { prisma } from "@/lib/prisma"
import { getDocumentAccess, getSessionUser } from "@/lib/permissions"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ id: string }> }

type LoadResult =
    | { status: "unauthenticated" }
    | { status: "not-found" }
    | {
          status: "ok"
          document: { id: string; title: string; content: string; updated_at: Date; owner: { name: string; email: string } | null }
          access: NonNullable<Awaited<ReturnType<typeof getDocumentAccess>>>
          hasCollaborationState: boolean
      }

async function loadDocument(id: string): Promise<LoadResult> {
    const user = await getSessionUser()
    if (!user) return { status: "unauthenticated" }

    const access = await getDocumentAccess(user, id)
    if (!access) return { status: "not-found" }

    const document = await prisma.document.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            content: true,
            updated_at: true,
            owner: { select: { name: true, email: true } },
        },
    })

    if (!document) return { status: "not-found" }

    /*
     * Only whether a Yjs blob exists — never the blob itself, which can be
     * large and is not needed to render the page.
     */
    const [state] = await prisma.$queryRaw<{ has_state: boolean }[]>`
        SELECT yjs_state IS NOT NULL AS has_state FROM documents WHERE id = ${id}
    `

    return {
        status: "ok",
        document,
        access,
        hasCollaborationState: Boolean(state?.has_state),
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const result = await loadDocument(id)

    if (result.status !== "ok") {
        return { title: "Document" }
    }

    return { title: result.document.title || "Untitled document" }
}

export default async function DocumentPage({ params }: PageProps) {
    const { id } = await params
    const result = await loadDocument(id)

    if (result.status === "unauthenticated") {
        redirect(`/signin?callbackUrl=/documents/${id}`)
    }

    if (result.status === "not-found") {
        notFound()
    }

    const { document, access, hasCollaborationState } = result

    return (
        <DocumentEditor
            documentId={document.id}
            initialTitle={document.title}
            initialContent={document.content}
            permission={access.level}
            canEdit={access.canEdit}
            canShare={access.canShare}
            ownerName={document.owner?.name ?? null}
            ownerEmail={document.owner?.email ?? ""}
            updatedAt={document.updated_at.toISOString()}
            hasCollaborationState={hasCollaborationState}
        />
    )
}
