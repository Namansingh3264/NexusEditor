"use client"

import { useSession } from "next-auth/react";
import "./globals.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function Home() {
   const session = useSession()
   const router = useRouter()
   
   useEffect(() => {
      if (session.status === "authenticated") {
         router.replace('/canvas')
      } else if (session.status === "unauthenticated") {
         router.replace('/signin')
      }
   }, [session.status, router])

   return null
}
