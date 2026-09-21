const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["week", 7 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
]

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** "3 minutes ago", "yesterday", "2 months ago". */
export function formatRelativeTime(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const diff = date.getTime() - Date.now()
    const absolute = Math.abs(diff)

    if (absolute < 60 * 1000) return "just now"

    for (const [unit, ms] of UNITS) {
        if (absolute >= ms) {
            return relativeFormatter.format(Math.round(diff / ms), unit)
        }
    }

    return "just now"
}

export function formatDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    return date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
}

/** Two-letter avatar fallback derived from a display name or email address. */
export function getInitials(name?: string | null, email?: string | null): string {
    const source = name?.trim() || email?.split("@")[0] || "?"
    const parts = source.split(/[\s._-]+/).filter(Boolean)

    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return source.slice(0, 2).toUpperCase()
}

/** Strips editor HTML down to a short plain-text preview for document cards. */
export function toPlainTextPreview(html: string, maxLength = 140): string {
    const text = html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()

    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength).trimEnd()}…`
}

/** Deterministic colour for collaboration cursors and avatars. */
export function colorFromString(value: string): string {
    const palette = [
        "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
        "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6", "#a855f7",
    ]

    let hash = 0
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i)
        hash |= 0
    }

    return palette[Math.abs(hash) % palette.length]
}
