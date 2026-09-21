import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser, permissionMatcher } from "@/lib/permissions"
import { createDocumentSchema } from "@/lib/types"
import { fromZodError, ok, readJson, serverError, unauthorized } from "@/lib/apiResponse"

export const dynamic = "force-dynamic"

/** Every document the signed-in user owns or has been given access to. */
export async function GET() {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    try {
        const entries = await prisma.document_Permissions.findMany({
            where: permissionMatcher(user),
            select: {
                permission_level: true,
                document: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        owner_id: true,
                        created_at: true,
                        updated_at: true,
                        owner: { select: { name: true, email: true } },
                        _count: { select: { permissions: true } },
                    },
                },
            },
            orderBy: { document: { updated_at: "desc" } },
        })

        // A document can match on both the user_id and the email row; keep the
        // strongest permission for each so the UI never under-reports access.
        const rank = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const
        const byId = new Map<string, (typeof entries)[number]>()

        for (const entry of entries) {
            if (!entry.document) continue
            const existing = byId.get(entry.document.id)
            if (!existing || rank[entry.permission_level] > rank[existing.permission_level]) {
                byId.set(entry.document.id, entry)
            }
        }

        const list = [...byId.values()].map((entry) => ({
            id: entry.document.id,
            title: entry.document.title,
            content: entry.document.content,
            created_at: entry.document.created_at,
            updated_at: entry.document.updated_at,
            permission:
                entry.document.owner_id === user.id ? "OWNER" : entry.permission_level,
            owner: entry.document.owner,
            isOwner: entry.document.owner_id === user.id,
            collaboratorCount: Math.max(entry.document._count.permissions - 1, 0),
        }))

        list.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())

        return ok({ list })
    } catch (error) {
        return serverError("list documents", error)
    }
}

/** Create a blank document owned by the caller. */
export async function POST(req: NextRequest) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const parsed = createDocumentSchema.safeParse((await readJson(req)) ?? {})
    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    try {
        const document = await prisma.document.create({
            data: {
                title: parsed.data.title?.trim() || "Untitled document",
                content: parsed.data.content ?? "",
                owner_id: user.id,
                permissions: {
                    create: {
                        // Ownership is derived from the session, never from the
                        // request body.
                        permission_level: "OWNER",
                        email: user.email,
                        user_id: user.id,
                        granted_by: user.id,
                    },
                },
            },
            select: { id: true, title: true, content: true, created_at: true, updated_at: true },
        })

        return ok({ message: "Document created", document }, 201)
    } catch (error) {
        return serverError("create document", error)
    }
}
