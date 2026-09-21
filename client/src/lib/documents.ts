import type { PermissionLevel } from "@/lib/types"

export type DocumentSummary = {
    id: string
    title: string
    content: string
    created_at: string
    updated_at: string
    permission: PermissionLevel
    isOwner: boolean
    collaboratorCount: number
    owner: { name: string | null; email: string } | null
}

export type Collaborator = {
    id: string
    email: string
    name: string | null
    permission: PermissionLevel
    pending: boolean
    created_at: string
}

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
    OWNER: "Owner",
    EDITOR: "Can edit",
    VIEWER: "Can view",
}

export const PERMISSION_BADGE_VARIANT = {
    OWNER: "owner",
    EDITOR: "editor",
    VIEWER: "viewer",
} as const
