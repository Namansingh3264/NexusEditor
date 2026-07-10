"use client"

import { useSession } from "next-auth/react";
import "./globals.css";
import { useRouter } from "next/navigation";


export default function Home() {
   const session = useSession()
   const router=useRouter()
   if (session.status=="authenticated") {
      router.replace('/canvas')
   } else {
      router.replace('/signin')
   }
}
