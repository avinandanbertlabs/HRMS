import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.companyId) return NextResponse.json({ error: "Sign in before changing your password." }, { status: 401 });
  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a new password between 12 and 128 characters." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, companyId: session.user.companyId, isActive: true },
    select: { id: true, passwordHash: true, mustChangePassword: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "The current password is incorrect." }, { status: 400 });
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Choose a password different from your current password." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } }),
    prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        actorId: user.id,
        action: user.mustChangePassword ? "account.password.initial_change" : "account.password.changed",
        entityType: "User",
        entityId: user.id,
        metadata: { passwordChanged: true },
      },
    }),
  ]);
  return NextResponse.json({ data: { changed: true } });
}
