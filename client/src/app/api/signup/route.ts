import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signupSchema } from "@/lib/types"
import { linkPendingPermissions } from "@/lib/authOptions"
import { conflict, fromZodError, ok, readJson, serverError } from "@/lib/apiResponse"

export async function POST(req: NextRequest) {
    const body = await readJson(req)
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
        return fromZodError(parsed.error)
    }

    const { name, email, password } = parsed.data

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return conflict("An account with this email already exists")
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
            select: { id: true, email: true, name: true },
        })

        // Claim any documents that were shared with this address before signup.
        await linkPendingPermissions(user.id, user.email)

        return ok({ message: "Account created successfully", user }, 201)
    } catch (error) {
        // Unique constraint — two concurrent signups for the same address.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return conflict("An account with this email already exists")
        }
        return serverError("signup", error)
    }
}
