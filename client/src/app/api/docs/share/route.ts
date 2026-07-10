import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json({ msg: "Unauthorized" }, { status: 411 })
    }
    const { doc_id, email, permission } = await req.json();
    try {
        const isPermitted = await prisma.document_Permissions.findFirst({
            where: {
                email:session.user.email,
                document_id: doc_id
            }
        })

        if (isPermitted?.permission_level != "OWNER") {
            return NextResponse.json({ msg: "You are no the owner" }, { status: 411 })
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })
        const resp = await prisma.document_Permissions.create({
            data: {
                document_id: doc_id,
                email,
                user_id: existingUser?.id || null,
                permission_level: permission,
                granted_by: session.user.id
            }
        })
        return NextResponse.json({ msg: "Doc shared successfully" }, { status: 200 })
    } catch (error) {
        console.log(error);
        return NextResponse.json({ msg: "Error while sharing" }, { status: 411 })
    }
}