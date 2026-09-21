import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDocumentAccess, getSessionUser } from "@/lib/permissions"
import { shareDocumentSchema } from "@/lib/types"
import {
    badRequest,
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

/** Everyone the document is shared with. Owner-only: it exposes addresses. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
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
        if (!access.canShare) {
            return forbidden("Only the owner can view collaborators")
        }

        const rows = await prisma.document_Permissions.findMany({
            where: { document_id: id },
            select: {
                id: true,
                email: true,
                permission_level: true,
                created_at: true,
                user: { select: { name: true, email: true } },
            },
            orderBy: { created_at: "asc" },
        })

        const collaborators = rows.map((row) => ({
            id: row.id,
            email: row.user?.email ?? row.email ?? "",
            name: row.user?.name ?? null,
            permission: row.permission_level,
            pending: !row.user,
            created_at: row.created_at,
        }))

        return ok({ collaborators })
    } catch (error) {
        return serverError("list collaborators", error)
    }
}

/** Grant or update access for an email address. Owner-only. */
export async function POST(req: NextRequest, { params }: RouteContext) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const { id } = await params
    const parsed = shareDocumentSchema.safeParse(await readJson(req))
    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    const { email, permission } = parsed.data

    try {
        const access = await getDocumentAccess(user, id)
        if (!access) {
            return notFound("Document not found")
        }
        if (!access.canShare) {
            return forbidden("Only the owner can share this document")
        }
        if (email === user.email.toLowerCase()) {
            return badRequest("You already own this document")
        }

        const invitee = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        })

        // Re-sharing with the same person must update the role rather than hit
        // the (document_id, email) unique constraint and fail.
        const existing = await prisma.document_Permissions.findFirst({
            where: {
                document_id: id,
                OR: [{ email }, ...(invitee ? [{ user_id: invitee.id }] : [])],
            },
            select: { id: true, permission_level: true },
        })

        if (existing) {
            if (existing.permission_level === "OWNER") {
                return badRequest("That person already owns this document")
            }

            await prisma.document_Permissions.update({
                where: { id: existing.id },
                data: { permission_level: permission, user_id: invitee?.id ?? null, email },
            })

            return ok({ message: `Access updated to ${permission.toLowerCase()}` })
        }

        await prisma.document_Permissions.create({
            data: {
                document_id: id,
                email,
                user_id: invitee?.id ?? null,
                permission_level: permission,
                granted_by: user.id,
            },
        })

        return ok({ message: `Shared with ${email}` }, 201)
    } catch (error) {
        return serverError("share document", error)
    }
}

/** Revoke access. Owner-only, and the owner's own row is protected. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const { id } = await params
    const permissionId = new URL(req.url).searchParams.get("permissionId")

    if (!permissionId) {
        return badRequest("permissionId is required")
    }

    try {
        const access = await getDocumentAccess(user, id)
        if (!access) {
            return notFound("Document not found")
        }
        if (!access.canShare) {
            return forbidden("Only the owner can manage access")
        }

        const row = await prisma.document_Permissions.findFirst({
            where: { id: permissionId, document_id: id },
            select: { id: true, permission_level: true },
        })

        if (!row) {
            return notFound("Collaborator not found")
        }
        if (row.permission_level === "OWNER") {
            return badRequest("The owner's access cannot be revoked")
        }

        await prisma.document_Permissions.delete({ where: { id: row.id } })

        return ok({ message: "Access revoked" })
    } catch (error) {
        return serverError("revoke access", error)
    }
}
