import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDocumentAccess, getSessionUser } from "@/lib/permissions"
import { legacyShareSchema } from "@/lib/types"
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

/**
 * Compatibility endpoint for the original share flow.
 *
 * Fixes carried over from the rewrite:
 *  - the owner check only matched permission rows stored by email, so an owner
 *    whose row was linked by user_id was told "you are not the owner";
 *  - `permission` was written straight to the database, so any value (including
 *    OWNER, or a string that is not in the enum at all) was accepted;
 *  - re-sharing with the same person hit a unique constraint and 500'd.
 */
export async function POST(req: NextRequest) {
    const user = await getSessionUser()
    if (!user) {
        return unauthorized()
    }

    const parsed = legacyShareSchema.safeParse(await readJson(req))
    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    const { doc_id, email, permission } = parsed.data

    try {
        const access = await getDocumentAccess(user, doc_id)
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

        const existing = await prisma.document_Permissions.findFirst({
            where: {
                document_id: doc_id,
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
                document_id: doc_id,
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
