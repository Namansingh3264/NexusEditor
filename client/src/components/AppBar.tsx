import { Logo } from "@/components/Logo"
import UserMenu from "@/components/UserMenu"

export default function AppBar({ children }: { children?: React.ReactNode }) {
    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                <Logo />
                <div className="min-w-0 flex-1">{children}</div>
                <UserMenu />
            </div>
        </header>
    )
}
