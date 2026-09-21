import withAuth from "next-auth/middleware"

/**
 * Guards the authenticated surface at the edge. Previously `/canvas` rendered
 * for anonymous visitors and only failed later, when its API calls 401'd.
 * Unauthenticated requests are redirected to the app's own sign-in page.
 */
export default withAuth({
    pages: {
        signIn: "/signin",
    },
})

export const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
        "/documents",
        "/documents/:path*",
        "/canvas",
        "/canvas/:path*",
    ],
}
