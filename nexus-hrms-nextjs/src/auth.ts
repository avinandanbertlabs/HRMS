import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, pages: { signIn: "/login" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, async authorize(raw) {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(raw);
    if (!parsed.success) return null;
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { roles: { include: { role: true } } } });
    if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
    return { id: user.id, name: user.name, email: user.email, companyId: user.companyId, roles: user.roles.map(r => r.role.key), mustChangePassword: user.mustChangePassword } as never;
  } })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const signedInUser = user as typeof user & { companyId?: string; roles?: string[] };
        token.companyId = signedInUser.companyId;
        token.roles = signedInUser.roles ?? [];
        token.mustChangePassword = Boolean((signedInUser as typeof signedInUser & { mustChangePassword?: boolean }).mustChangePassword);
      } else if (token.sub) {
        // Refresh role assignments from the database so an admin's team-lead change takes effect on the next request.
        const currentUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { roles: { include: { role: true } } },
        });
        if (currentUser?.isActive) {
          token.companyId = currentUser.companyId;
          token.roles = currentUser.roles.map((item) => item.role.key);
          token.mustChangePassword = currentUser.mustChangePassword;
          token.name = currentUser.name;
          token.email = currentUser.email;
        } else {
          token.companyId = undefined;
          token.roles = [];
          token.mustChangePassword = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & { id?: string; companyId?: string; roles?: string[]; mustChangePassword?: boolean };
        sessionUser.id = token.sub;
        sessionUser.companyId = token.companyId as string;
        sessionUser.roles = token.roles as string[];
        sessionUser.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    }
  }
});
