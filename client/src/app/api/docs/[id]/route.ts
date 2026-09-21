import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDocumentAccess, getSessionUser } from "@/lib/permissions"
import { updateDocumentSchema } from "@/lib/types"
import {
    forbidden,
    fromZodError,
    notFound,
    ok,
    readJson,
    serverError,
    unauthorized,
} from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const { id } = await params

    try {
        const access = await getDocumentAccess(user, id)
        if (!access) {
            // Deliberately a 404 rather than a 403: don't confirm that a
            // document exists to someone with no access to it.
            return notFound("Document not found")
        }

        const document = await prisma.document.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                content: true,
                created_at: true,
                updated_at: true,
                owner: { select: { name: true, email: true } },
            },
        })

        if (!document) {
            return notFound("Document not found")
        }

        return ok({ document: { ...document, permission: access.level, canEdit: access.canEdit, canShare: access.canShare } })
    } catch (error) {
        return serverError("read document", error)
    }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const { id } = await params
    const parsed = updateDocumentSchema.safeParse(await readJson(req))
    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    try {
        const access = await getDocumentAccess(user, id)
        if (!access) {
            return notFound("Document not found")
        }
        if (!access.canEdit) {
            return forbidden("You only have view access to this document")
        }

        const { title, content } = parsed.data

        const document = await prisma.document.update({
            where: { id },
            data: {
                ...(title !== undefined ? { title: title || "Untitled document" } : {}),
                ...(content !== undefined ? { content } : {}),
            },
            select: { id: true, title: true, content: true, updated_at: true },
        })

        return ok({ message: "Document saved", document })
    } catch (error) {
        return serverError("update document", error)
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const { id } = await params

    try {
        const access = await getDocumentAccess(user, id)
        if (!access) {
            return notFound("Document not found")
        }
        if (!access.canDelete) {
            return forbidden("Only the owner can delete this document")
        }

        // Permission rows cascade with the document.
        await prisma.document.delete({ where: { id } })

        return ok({ message: "Document deleted" })
    } catch (error) {
        return serverError("delete document", error)
    }
}
