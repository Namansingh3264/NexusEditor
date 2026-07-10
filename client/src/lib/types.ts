import { z } from 'zod'

const signinSchema = z.object({
    password: z.string().trim().min(6),
    email: z.string().email()
})

const signupSchema = z.object({
    name:z.string().trim(),
    password: z.string().trim().min(6),
    email: z.string().email()
})

export {
    signinSchema,
    signupSchema
}