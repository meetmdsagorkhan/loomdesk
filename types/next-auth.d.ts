import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      rememberMe?: boolean
      sessionVersion?: number
      twoFactorEnabled?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    rememberMe?: boolean
    sessionVersion?: number
    twoFactorEnabled?: boolean
    createdAt?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    rememberMe?: boolean
    sessionVersion?: number
    sessionExpiresAt?: number
    twoFactorEnabled?: boolean
  }
}
