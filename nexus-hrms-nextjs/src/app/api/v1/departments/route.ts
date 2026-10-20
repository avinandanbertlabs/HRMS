import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company administrators can create departments." }, { status: 403 });

  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    businessUnitName: z.string().trim().min(2).max(80).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid department name and optional business unit.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const department = await prisma.$transaction(async (transaction) => {
      const businessUnit = parsed.data.businessUnitName
        ? await transaction.businessUnit.upsert({
            where: { companyId_name: { companyId: actor.companyId, name: parsed.data.businessUnitName } },
            update: {},
            create: { companyId: actor.companyId, name: parsed.data.businessUnitName },
            select: { id: true },
          })
        : null;
      const created = await transaction.department.create({
        data: { companyId: actor.companyId, name: parsed.data.name, businessUnitId: businessUnit?.id },
      });
      await transaction.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.userId,
          action: "department.created",
          entityType: "Department",
          entityId: created.id,
          metadata: { departmentName: created.name, businessUnitId: businessUnit?.id ?? null },
        },
      });
      return created;
    });
    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A department with that name already exists in this company." }, { status: 409 });
    }
    console.error("Failed to create department.", error);
    return NextResponse.json({ error: "Unable to create the department right now." }, { status: 500 });
  }
}
