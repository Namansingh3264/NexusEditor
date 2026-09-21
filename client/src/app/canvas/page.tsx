import { redirect } from "next/navigation"

/**
 * The editor now lives at /documents/[id] so that every document is addressed
 * by its real id. This keeps older /canvas links working.
 */
export default function CanvasRedirect() {
    redirect("/dashboard")
}
