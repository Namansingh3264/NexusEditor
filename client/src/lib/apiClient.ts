import axios, { AxiosError } from "axios"

/**
 * Shared axios instance. Requests were previously made against relative paths
 * such as `"api/signup"`, which resolve differently depending on the current
 * route — `/documents/abc` would have requested `/documents/api/signup`.
 * A leading-slash baseURL removes that whole class of bug.
 */
export const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
})

/**
 * Pulls the server's human-readable message out of a failed request so the UI
 * can show something better than "Request failed with status code 500".
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
    if (error instanceof AxiosError) {
        const data = error.response?.data as { message?: string; msg?: string } | undefined
        return data?.message || data?.msg || error.message || fallback
    }

    if (error instanceof Error) {
        return error.message || fallback
    }

    return fallback
}
