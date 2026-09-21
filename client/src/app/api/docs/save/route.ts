import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDocumentAccess, getSessionUser } from "@/lib/permissions"
import { legacySaveSchema } from "@/lib/types"
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

/**
 * Compatibility endpoint for the original save flow.
 *
 * The previous implementation looked the document up with
 * `findFirst({ where: { title } })` across the whole table, so saving a document
 * called "Notes" would silently overwrite a *different user's* document of the
 * same name. Lookups are now scoped to documents the caller can actually write.
 */
export async function POST(req: NextRequest) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const parsed = legacySaveSchema.safeParse(await readJson(req))
    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    const { id, title, content } = parsed.data

    try {
        if (id) {
            const access = await getDocumentAccess(user, id)
            if (!access) {
                return notFound("Document not found")
            }
            if (!access.canEdit) {
                return forbidden("You only have view access to this document")
            }

            const doc = await prisma.document.update({
                where: { id },
                data: {
                    ...(title !== undefined ? { title: title || "Untitled document" } : {}),
                    ...(content !== undefined ? { content } : {}),
                },
                select: { id: true, title: true, content: true, updated_at: true },
            })

            return ok({ message: "Document updated successfully", doc })
        }

        // No id: fall back to the caller's own document with this title.
        const existing = title
            ? await prisma.document.findFirst({
                  where: { title, owner_id: user.id },
                  select: { id: true },
              })
            : null

        if (existing) {
            const doc = await prisma.document.update({
                where: { id: existing.id },
                data: { ...(content !== undefined ? { content } : {}) },
                select: { id: true, title: true, content: true, updated_at: true },
            })

            return ok({ message: "Document updated successfully", doc })
        }

        const doc = await prisma.document.create({
            data: {
                title: title?.trim() || "Untitled document",
                content: content ?? "",
                owner_id: user.id,
                permissions: {
                    create: {
                        // Always OWNER — the old route took this from the request
                        // body, letting a client create a document it did not own.
                        permission_level: "OWNER",
                        email: user.email,
                        user_id: user.id,
                        granted_by: user.id,
                    },
                },
            },
            select: { id: true, title: true, content: true, updated_at: true },
        })

        return ok({ message: "Document saved successfully", doc }, 201)
    } catch (error) {
        return serverError("save document", error)
    }
}
