import "next-auth";
import type { DefaultSession } from "next-auth";
declare module "next-auth" { interface Session { user: { id: string; companyId: string; roles: string[]; mustChangePassword: boolean } & DefaultSession["user"] } }
declare module "next-auth/jwt" { interface JWT { companyId?: string; roles?: string[]; mustChangePassword?: boolean } }
