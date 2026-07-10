import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from '@/lib/prisma'
import { signupSchema } from "@/lib/types";


export async function POST(req: NextRequest, res: NextResponse) {
    const body = await req.json()
    try {
        const parsedData = signupSchema.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({
                msg: "Error while parsing the body"
            },
                { status: 411 }
            )
        }
        const { name, email, password } = parsedData.data
        const hashedPassword = await bcrypt.hash(password, 10)
        const existingUser = await prisma.user.findFirst({
            where: {
                email: email,
            }
        })
        if (existingUser) {
            return NextResponse.json({
                msg: "User already exists"
            }, { status: 411 })
        }
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            }
        })
        return NextResponse.json({
            msg: "User created successfully"
        }, { status: 200 })
    } catch (error) {
        console.log(error);
        return NextResponse.json({
            msg: "Error while signup",
            error: error
        },
            { status: 500 }
        )
    }

}