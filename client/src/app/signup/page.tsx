import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import AuthShell from "@/components/auth/AuthShell"
import SignUpForm from "@/components/auth/SignUpForm"
import { authOptions } from "@/lib/authOptions"

export const metadata: Metadata = { title: "Create account" }

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
    const session = await getServerSession(authOptions)
    if (session?.user) {
        redirect("/dashboard")
    }

    return (
        <AuthShell
            title="Create your account"
            subtitle="Start writing and collaborating in under a minute."
            footer={
                <>
                    Already have an account?{" "}
                    <Link href="/signin" className="font-medium text-indigo-600 hover:text-indigo-700">
                        Sign in
                    </Link>
                </>
            }
        >
            <SignUpForm />
        </AuthShell>
    )
}
