import Link from "next/link"

import { LogoMark } from "@/components/Logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <LogoMark className="size-11" />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                We couldn&apos;t find that page
            </h1>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
                The document may have been deleted, or you may no longer have access to it.
            </p>
            <Button asChild className="mt-6">
                <Link href="/dashboard">Back to dashboard</Link>
            </Button>
        </div>
    )
}
