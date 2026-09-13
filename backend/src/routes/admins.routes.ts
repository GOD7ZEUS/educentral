import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { PLATFORM_ROLES, requireAuth, requireRole } from "../auth";
import { sendWelcomeEmail } from "../email";

// A platform-wide "Users" view of every school's admin accounts, plus
// super-admin provisioning. SUPER_ADMIN / MASTER_ADMIN can create school
// ADMIN accounts (no cap per school); only MASTER_ADMIN can create new
// SUPER_ADMIN accounts — the top of the hierarchy creates the next tier down.
export const adminsRouter = Router();

adminsRouter.use(requireAuth, requireRole(...PLATFORM_ROLES));

adminsRouter.get("/", async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    include: { school: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      isActive: a.isActive,
      createdAt: a.createdAt,
      school: a.school ? { id: a.school.id, name: a.school.name } : null,
    }))
  );
});

const createAdminSchema = z.object({
  schoolId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  dob: z.string().datetime().optional(),
});

adminsRouter.post("/", async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { schoolId, firstName, lastName, email, password, dob } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return res.status(404).json({ error: "School not found" });

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN", schoolId, dob: dob ? new Date(dob) : undefined },
  });
  sendWelcomeEmail(admin.email, admin.name);
  res.status(201).json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
    school: { id: school.id, name: school.name },
  });
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

adminsRouter.patch("/:id", async (req, res) => {
  const parsed = updateAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const admin = await prisma.user.findFirst({ where: { id: req.params.id, role: "ADMIN" } });
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const { name, email, isActive, password } = parsed.data;

  if (email && email !== admin.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: "Email already registered" });
  }

  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  res.json({ id: updated.id, name: updated.name, email: updated.email, isActive: updated.isActive });
});

// Super admin provisioning — MASTER_ADMIN only. A super admin is a platform
// account (schoolId null), same as master admin, just one tier down.
export const superAdminsRouter = Router();

superAdminsRouter.use(requireAuth, requireRole("MASTER_ADMIN"));

superAdminsRouter.get("/", async (_req, res) => {
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "desc" },
  });
  res.json(superAdmins.map((a) => ({ id: a.id, name: a.name, email: a.email, isActive: a.isActive, createdAt: a.createdAt })));
});

const createSuperAdminSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  dob: z.string().datetime().optional(),
});

superAdminsRouter.post("/", async (req, res) => {
  const parsed = createSuperAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { firstName, lastName, email, password, dob } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await prisma.user.create({
    data: { name, email, passwordHash, role: "SUPER_ADMIN", dob: dob ? new Date(dob) : undefined },
  });
  sendWelcomeEmail(superAdmin.email, superAdmin.name);
  res.status(201).json({ id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, isActive: superAdmin.isActive });
});

superAdminsRouter.patch("/:id", async (req, res) => {
  const parsed = updateAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const superAdmin = await prisma.user.findFirst({ where: { id: req.params.id, role: "SUPER_ADMIN" } });
  if (!superAdmin) return res.status(404).json({ error: "Super admin not found" });

  const { isActive, password } = parsed.data;
  const updated = await prisma.user.update({
    where: { id: superAdmin.id },
    data: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  res.json({ id: updated.id, name: updated.name, email: updated.email, isActive: updated.isActive });
});
