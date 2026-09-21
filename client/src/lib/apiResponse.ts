import { NextResponse } from "next/server"
import { ZodError } from "zod"

/**
 * The original routes answered "unauthorized", "forbidden" and "validation
 * failed" all with 411 (Length Required), which made client-side error handling
 * impossible. These helpers keep the status codes honest.
 */
export function ok<T>(data: T, status = 200) {
    return NextResponse.json(data, { status })
}

export function badRequest(message = "Invalid request", details?: unknown) {
    return NextResponse.json({ message, details }, { status: 400 })
}

export function unauthorized(message = "You must be signed in") {
    return NextResponse.json({ message }, { status: 401 })
}

export function forbidden(message = "You do not have permission to do that") {
    return NextResponse.json({ message }, { status: 403 })
}

export function notFound(message = "Not found") {
    return NextResponse.json({ message }, { status: 404 })
}

export function conflict(message = "Already exists") {
    return NextResponse.json({ message }, { status: 409 })
}

/**
 * Never echo the raw error back to the caller — the previous signup route
 * returned the whole Prisma error object, which leaks schema details.
 */
export function serverError(context: string, error: unknown) {
    console.error(`[api] ${context}:`, error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
}

export function fromZodError(error: ZodError) {
    const first = error.issues[0]
    return badRequest(first?.message ?? "Invalid request", error.flatten().fieldErrors)
}

export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json()
    } catch {
        return null
    }
}
