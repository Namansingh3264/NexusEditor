import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { title, content, permission,yjs_state } = await req.json()

    try {
        const existing = await prisma.document.findFirst({ where: { title } })
        if (!existing) {
            const resp = await prisma.document.create({
                data: {
                    title,
                    content,
                    yjs_state,
                    owner_id: session.user.id,
                    permissions: {
                        create: {
                            email: session.user.email,
                            permission_level: permission
                        }
                    }
                }
            })
            return NextResponse.json({ message: "Document saved successfully", doc: resp })
        } else {
            const resp = await prisma.document.update({
                where: { 
                    id:existing.id,
                    title
                },
                data: { content }
            })
            return NextResponse.json({ message: "Document updated successfully", doc: resp })
        }
    } catch (err) {
        console.error("Error saving doc:", err)
        return NextResponse.json({ message: "Error saving doc" }, { status: 500 })
    }
}