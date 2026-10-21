import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    name: "Sekhar",
    email: "sekhar@bertlabs.invalid",
    password: "u7eneZaBNxrk_iL14YU0f8M2",
  },
  {
    name: "Vanshiks",
    email: "vanshiks@bertlabs.invalid",
    password: "7kJM81xwvt9Ogo7DCRwelupn",
  },

  // remaining users...

  {
    name: "Bert Labs Administrator",
    email: "bertlabs.admin@bertlabs.invalid",
    password: "EMpQwC20O6PuanYekIzPd9oBKJsic7EA",
  },
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        companyId: "bert-labs",
        mustChangePassword: true,
        isActive: true,
        mfaEnabled: false,
      },
    });
  }

  console.log("Users seeded successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
