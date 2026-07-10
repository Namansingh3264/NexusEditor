import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
    const session = await getServerSession(authOptions)
    console.log("session : ", session.user);

    if (!session || !session.user) {
        return NextResponse.json({ msg: "Unauthorized" }, { status: 411 })
    }
    const listOfDocs = await prisma.document_Permissions.findMany({
        where: {
            OR: [
                { email: session.user.email },
                { user: { email: session.user.email } }
            ]
        },
        include: {
            document: true
        }
    })

    const documents = listOfDocs.map((entry) => ({
        ...entry.document,
        permission: entry.permission_level,
    }));

    if (!documents) {
        return NextResponse.json({ msg: "Nothing found" }, { status: 411 })
    }

    return NextResponse.json({ list: documents }, { status: 200 });
}