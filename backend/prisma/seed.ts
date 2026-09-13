import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

// Production: seed nothing but the one Master Admin account, from env vars —
// they then create Super Admins, who create school Admins, from the app itself.
async function seedProduction() {
  const email = process.env.MASTER_ADMIN_EMAIL;
  const password = process.env.MASTER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "No MASTER_ADMIN_EMAIL / MASTER_ADMIN_PASSWORD set — skipping seed. " +
        "Set both env vars and redeploy to provision the first Master Admin."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const masterAdmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Master Admin", email, passwordHash, role: "MASTER_ADMIN" },
  });
  console.log(`Master admin ready: ${masterAdmin.email}`);
}

// Local dev: a full fixture set so the app is immediately usable without
// clicking through the whole Master Admin -> Super Admin -> Admin chain.
async function seedDevelopment() {
  const superAdminPasswordHash = await bcrypt.hash("123456", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "niladrisonu258@gmail.com" },
    update: {},
    create: {
      name: "Platform Super Admin",
      email: "niladrisonu258@gmail.com",
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  const masterAdminPasswordHash = await bcrypt.hash("123456", 10);
  const masterAdmin = await prisma.user.upsert({
    where: { email: "master@erp-platform.com" },
    update: {},
    create: {
      name: "Platform Master Admin",
      email: "master@erp-platform.com",
      passwordHash: masterAdminPasswordHash,
      role: "MASTER_ADMIN",
    },
  });

  const school = await prisma.school.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo Public School",
      code: "DEMO",
      websiteUrl: "https://example.com",
    },
  });

  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@school.edu" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@school.edu",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      schoolId: school.id,
    },
  });

  const grade5 = await prisma.schoolClass.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "Grade 5" } },
    update: {},
    create: { name: "Grade 5", schoolId: school.id },
  });

  await prisma.section.upsert({
    where: { classId_name: { classId: grade5.id, name: "A" } },
    update: {},
    create: { name: "A", classId: grade5.id },
  });

  await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "MATH101" } },
    update: {},
    create: { name: "Mathematics", code: "MATH101", schoolId: school.id },
  });

  await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: "ENG101" } },
    update: {},
    create: { name: "English", code: "ENG101", schoolId: school.id },
  });

  console.log("Seed complete.");
  console.log("Super admin login: niladrisonu258@gmail.com / 123456");
  console.log("Master admin login (placeholder): master@erp-platform.com / 123456");
  console.log("School admin login: admin@school.edu / Admin@123");
  console.log({ superAdminId: superAdmin.id, masterAdminId: masterAdmin.id, schoolId: school.id, adminId: admin.id, classId: grade5.id });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    await seedProduction();
  } else {
    await seedDevelopment();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
