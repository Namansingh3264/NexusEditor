import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signinSchema } from "./types";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "jsmith@mail.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                const parsedObj = signinSchema.safeParse(credentials);
                if (!parsedObj.success) {
                    throw new Error("error parsing the data")
                }
                const data = parsedObj.data
                try {
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            email: data.email
                        }
                    })
                    if (!existingUser) {
                        throw new Error("User doesn't Exist")
                    }
                    const passwordValidation = await bcrypt.compare(data.password, existingUser.password)
                    if (!passwordValidation) {
                        throw new Error("Password doesnt match")
                    }
                    return {
                        id: existingUser.id.toString(),
                        email: existingUser.email,
                    }

                } catch (error) {
                    console.log("Error while logging in : ", error);
                    return null;
                }

            }
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ token, session }: any) {
            session.user.id = token.sub,
                session.user.email = token.email
            return session
        }
    },
    pages: {
        signIn: '../../signin',
    }
}