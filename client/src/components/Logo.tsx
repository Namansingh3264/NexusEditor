import Link from "next/link"

import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/config"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/30",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden="true">
        <path
          d="M6 4.5h7.5L18 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13 4.5V9h4.5" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="9.25" cy="13" r="1.15" fill="white" />
        <circle cx="13.75" cy="16" r="1.15" fill="white" />
        <path d="M10.3 13.6 12.7 15.4" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
        className,
      )}
    >
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
    </Link>
  )
}
