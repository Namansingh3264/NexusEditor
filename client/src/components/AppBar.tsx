"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signIn, signOut, useSession } from "next-auth/react"

export default function AppBar() {
    const session=useSession()
    console.log(session);
    
    return (
        <header className="w-full h-16 px-4 flex items-center justify-between shadow-sm border-b bg-white">
            <div className="text-lg font-semibold text-gray-700">
                Docs
            </div>
            <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                    <AvatarImage src="/profile.png" alt="Profile" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={session.data?.user ? signOut : signIn}>
                    {session.data?.user ? "Logout" : "SignIn"}
                </Button>
            </div>
        </header>
    )
}
