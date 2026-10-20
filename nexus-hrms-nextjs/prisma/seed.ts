import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissionKeys = [
  "employee:read", "employee:create", "employee:update", "employee:deactivate",
  "organization:read", "organization:manage", "role:manage", "audit:read",
  "leave:read", "leave:apply", "leave:approve", "leave:policy:manage", "leave:report",
  "attendance:read", "attendance:punch", "attendance:regularize", "attendance:approve",
  "attendance:import", "attendance:policy:manage", "attendance:report",
] as const;

const roles = [
  { key: "SUPER_ADMIN", name: "Super Admin", permissions: [...permissionKeys] },
  { key: "HR_ADMIN", name: "HR Admin", permissions: permissionKeys.filter((key) => !key.startsWith("role:") && !key.startsWith("audit:")) },
  { key: "DEPARTMENT_HEAD", name: "Department Head", permissions: ["employee:read", "organization:read", "leave:read", "leave:approve", "leave:report", "attendance:read", "attendance:approve", "attendance:report"] },
  { key: "MANAGER", name: "Team Lead / Manager", permissions: ["employee:read", "leave:read", "leave:approve", "attendance:read", "attendance:approve"] },
  { key: "EMPLOYEE", name: "Employee", permissions: ["leave:read", "leave:apply", "attendance:read", "attendance:punch", "attendance:regularize"] },
  { key: "AUDITOR", name: "Auditor", permissions: ["employee:read", "organization:read", "leave:read", "leave:report", "attendance:read", "attendance:report", "audit:read"] },
];

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "bert-labs" },
    update: { name: "Bert Labs" },
    create: { name: "Bert Labs", slug: "bert-labs" },
  });

  const permissions = await Promise.all(permissionKeys.map((key) => prisma.permission.upsert({
    where: { key },
    update: {},
    create: { key, description: `Permission: ${key}` },
  })));
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { key: roleData.key },
      update: { name: roleData.name },
      create: { key: roleData.key, name: roleData.name },
    });
    for (const key of roleData.permissions) {
      const permission = permissions.find((item) => item.key === key);
      if (!permission) throw new Error(`Permission ${key} is not configured.`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  await prisma.team.upsert({
    where: { companyId_name: { companyId: company.id, name: "General" } },
    update: {},
    create: { companyId: company.id, name: "General" },
  });

  const leaveTypes = [
    { name: "Annual Leave", code: "ANNUAL", paid: true },
    { name: "Sick Leave", code: "SICK", paid: true },
    { name: "Casual Leave", code: "CASUAL", paid: true },
    { name: "Unpaid Leave", code: "UNPAID", paid: false },
  ];
  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { companyId_code: { companyId: company.id, code: leaveType.code } },
      update: { name: leaveType.name, paid: leaveType.paid, active: true },
      create: { ...leaveType, companyId: company.id },
    });
  }

  const adminEmails = (process.env.SEED_ADMIN_EMAILS || process.env.SEED_ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "";
  if (adminEmails.length && adminPassword) {
    if (adminPassword.length < 14) throw new Error("SEED_ADMIN_PASSWORD must be at least 14 characters.");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const adminName = process.env.SEED_ADMIN_NAME?.trim() || "Bert Labs Administrator";
    for (const [index, email] of adminEmails.entries()) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, companyId: company.id, isActive: true },
        create: { email, name: adminName, passwordHash, companyId: company.id },
      });
      const role = await prisma.role.findUniqueOrThrow({
        where: { key: index === 0 ? "SUPER_ADMIN" : "HR_ADMIN" },
      });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
    console.log(`Configured ${adminEmails.length} company administrator account(s).`);
  } else {
    console.log("No administrator account was configured. Set SEED_ADMIN_EMAILS and SEED_ADMIN_PASSWORD before seeding a new installation.");
  }

  console.log("Bert Labs roles, leave categories, and the initial General team are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
