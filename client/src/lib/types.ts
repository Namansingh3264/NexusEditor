import { z } from 'zod'

const PERMISSION_LEVELS = ['OWNER', 'EDITOR', 'VIEWER'] as const

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number]

const signinSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const signupSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password is too long"),
})

/**
 * Titles are user facing and end up in the document list, so keep them bounded.
 * Content is trusted only as far as the editor produces it (sanitised HTML).
 */
const createDocumentSchema = z.object({
    title: z.string().trim().max(200, "Title is too long").optional(),
    content: z.string().optional(),
})

const updateDocumentSchema = z
    .object({
        title: z.string().trim().max(200, "Title is too long").optional(),
        content: z.string().optional(),
    })
    .refine((value) => value.title !== undefined || value.content !== undefined, {
        message: "Nothing to update",
    })

/**
 * Only OWNER can share, and ownership is never transferable through this route,
 * so the grantable levels are deliberately narrower than the enum.
 */
const shareDocumentSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    permission: z.enum(['EDITOR', 'VIEWER'], {
        errorMap: () => ({ message: "Permission must be EDITOR or VIEWER" }),
    }),
})

const legacySaveSchema = z.object({
    id: z.string().trim().min(1).optional(),
    title: z.string().trim().max(200).optional(),
    content: z.string().optional(),
})

const legacyShareSchema = shareDocumentSchema.extend({
    doc_id: z.string().trim().min(1, "Document id is required"),
})

export {
    PERMISSION_LEVELS,
    signinSchema,
    signupSchema,
    createDocumentSchema,
    updateDocumentSchema,
    shareDocumentSchema,
    legacySaveSchema,
    legacyShareSchema,
}
