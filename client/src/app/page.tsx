import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export const dynamic = "force-dynamic"

/**
 * Resolved on the server. The previous client-side version rendered `null` and
 * redirected from an effect, so every visitor saw a blank white page first.
 */
export default async function Home() {
  const session = await getServerSession(authOptions)

  redirect(session?.user ? "/dashboard" : "/signin")
}
