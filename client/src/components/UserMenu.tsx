"use client"

import { signOut, useSession } from "next-auth/react"
import { LayoutGrid, LogOut } from "lucide-react"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { colorFromString, getInitials } from "@/lib/format"

export default function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Skeleton className="size-9 rounded-full" />
  }

  const user = session?.user
  if (!user?.email) {
    return null
  }

  const initials = getInitials(user.name, user.email)
  const background = colorFromString(user.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-9 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-sm transition-transform outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2"
          style={{ backgroundColor: background }}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ backgroundColor: background }}
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">
              {user.name || "Account"}
            </span>
            <span className="block truncate text-xs font-normal text-slate-500">{user.email}</span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutGrid />
            My documents
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/*
          The original AppBar passed `signOut` straight to onClick, so React's
          click event was forwarded as the options argument.
        */}
        <DropdownMenuItem variant="destructive" onSelect={() => signOut({ callbackUrl: "/signin" })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
