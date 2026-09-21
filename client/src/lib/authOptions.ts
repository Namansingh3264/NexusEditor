import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signinSchema } from "@/lib/types"
import { getAuthSecret } from "@/lib/env"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "jsmith@mail.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const parsed = signinSchema.safeParse(credentials)
                if (!parsed.success) {
                    return null
                }

                const { email, password } = parsed.data

                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email },
                    })

                    if (!existingUser) {
                        // Still hash-compare against a dummy value so that a missing
                        // user and a wrong password take a similar amount of time.
                        await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin")
                        return null
                    }

                    const passwordMatches = await bcrypt.compare(password, existingUser.password)
                    if (!passwordMatches) {
                        return null
                    }

                    // Any share created before this user signed up was keyed by
                    // email only; link it to the account now that one exists.
                    await linkPendingPermissions(existingUser.id, existingUser.email)

                    return {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.name,
                    }
                } catch (error) {
                    console.error("[auth] Sign-in failed:", error)
                    return null
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    get secret() {
        return getAuthSecret()
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.name = user.name
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) ?? token.sub ?? ""
                session.user.email = token.email ?? session.user.email
                session.user.name = token.name ?? session.user.name
            }
            return session
        },
    },
    pages: {
        signIn: "/signin",
    },
}

/**
 * Documents can be shared with an address that has no account yet. Those rows
 * carry an email but no user_id, which means permission lookups by user id miss
 * them forever. Backfill the link on the user's first authenticated request.
 */
export async function linkPendingPermissions(userId: string, email: string) {
    try {
        await prisma.document_Permissions.updateMany({
            where: { email, user_id: null },
            data: { user_id: userId },
        })
    } catch (error) {
        // A duplicate (document_id, user_id) pair means the link already exists,
        // which is harmless — never block sign-in on this.
        console.error("[auth] Could not link pending permissions:", error)
    }
}
