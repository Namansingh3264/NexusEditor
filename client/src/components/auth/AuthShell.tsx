import Link from "next/link"
import { Check } from "lucide-react"

import { LogoMark } from "@/components/Logo"
import { APP_NAME } from "@/lib/config"

const HIGHLIGHTS = [
  "Write together in real time, with live cursors",
  "Share documents by email with edit or view access",
  "Every change saved automatically as you type",
]

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Form side */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </Link>

          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-16 size-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex h-full flex-col justify-center px-16">
          <h2 className="max-w-md text-3xl leading-tight font-semibold tracking-tight text-white">
            One document. Everyone on the same page.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-indigo-100">
            {APP_NAME} keeps your team writing together — no refreshes, no
            conflicting copies, no lost edits.
          </p>

          <ul className="mt-10 space-y-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-indigo-50">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
