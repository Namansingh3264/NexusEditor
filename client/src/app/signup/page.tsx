"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import axios from "axios"

export default function SignUp() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()


        const res = await axios.post('api/signup', {
            name,
            email,
            password
        }, {
            withCredentials: true
        })
        if (res.status !== 200) {
            setError(res.data.msg || "Something went wrong")
            return
        }

        const signInRes = await signIn("credentials", {
            redirect: false,
            email,
            password
        })

        if (signInRes?.ok) {
            router.push("/canvas")
        } else {
            setError("Could not sign in after signup")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-sm shadow-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Sign Up</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        {error && <div className="text-sm text-red-600">{error}</div>}
                        <Button type="submit" className="w-full mt-2">Sign Up</Button>
                    </form>

                    <div className="text-sm text-center text-gray-600 mt-6">
                        Already have an account?{" "}
                        <Link href="/signin" className="text-blue-600 hover:underline">Sign in</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
