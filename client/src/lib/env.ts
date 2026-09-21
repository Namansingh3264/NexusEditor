import "server-only"

/**
 * Resolved lazily (never at module load) so that a missing variable surfaces as
 * a clear runtime error on the affected request instead of breaking the whole
 * production build or crashing an unrelated page.
 */
function requireServerEnv(name: string): string {
    const value = process.env[name]

    if (!value) {
        throw new Error(
            `Missing required environment variable "${name}". ` +
            `Set it in your hosting provider's environment settings.`,
        )
    }

    return value
}

export function getAuthSecret(): string {
    return requireServerEnv("NEXTAUTH_SECRET")
}

export function getDatabaseUrl(): string {
    return requireServerEnv("DATABASE_URL")
}
