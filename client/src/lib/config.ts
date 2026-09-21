/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* variables belong here — they
 * are inlined into the client bundle at build time.
 */
export const WEBSOCKET_URL =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080"

export const APP_NAME = "NexusEditor"

export const APP_DESCRIPTION =
    "A real-time collaborative rich-text editor with secure sharing and role-based permissions."
