import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import type { PermissionLevel } from "@/lib/types"

export type SessionUser = {
    id: string
    email: string
    name: string | null
}

/**
 * Returns the signed-in user, or null. Every document route must go through
 * this — reading `session.user` straight off a possibly-null session was
 * turning unauthenticated requests into 500s.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
        return null
    }

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
    }
}

/**
 * A permission row can be matched either by the linked user id or by the email
 * it was shared with (for accounts that did not exist at share time). Both must
 * be checked or legitimately-shared documents become invisible.
 */
export function permissionMatcher(user: SessionUser) {
    return {
        OR: [{ user_id: user.id }, { email: user.email }],
    }
}

export type DocumentAccess = {
    documentId: string
    level: PermissionLevel
    canEdit: boolean
    canShare: boolean
    canDelete: boolean
}

/**
 * Resolves what `user` is allowed to do with `documentId`, or null when they
 * have no access at all. Ownership falls back to `documents.owner_id` so that a
 * document whose permission row is missing is never orphaned from its owner.
 */
export async function getDocumentAccess(
    user: SessionUser,
    documentId: string,
): Promise<DocumentAccess | null> {
    const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            owner_id: true,
            permissions: {
                where: permissionMatcher(user),
                select: { permission_level: true },
            },
        },
    })

    if (!document) {
        return null
    }

    const isOwner =
        document.owner_id === user.id ||
        document.permissions.some((entry) => entry.permission_level === "OWNER")

    let level: PermissionLevel
    if (isOwner) {
        level = "OWNER"
    } else if (document.permissions.some((entry) => entry.permission_level === "EDITOR")) {
        level = "EDITOR"
    } else if (document.permissions.some((entry) => entry.permission_level === "VIEWER")) {
        level = "VIEWER"
    } else {
        return null
    }

    return {
        documentId: document.id,
        level,
        canEdit: level === "OWNER" || level === "EDITOR",
        canShare: level === "OWNER",
        canDelete: level === "OWNER",
    }
}
