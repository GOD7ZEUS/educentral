import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { PLATFORM_ROLES, requireAuth, requireRole } from "../auth";
import { fileToDataUri, logoUpload } from "../upload";

export const schoolsRouter = Router();

// Public: used by the login page to show a school's branding (logo linking to
// its real website) before the user signs in.
schoolsRouter.get("/public/:code", async (req, res) => {
  const school = await prisma.school.findUnique({ where: { code: req.params.code } });
  if (!school || !school.isActive) return res.status(404).json({ error: "School not found" });
  res.json({ name: school.name, code: school.code, logoUrl: school.logoUrl, websiteUrl: school.websiteUrl });
});

schoolsRouter.use(requireAuth, requireRole(...PLATFORM_ROLES));

schoolsRouter.get("/", async (_req, res) => {
  const schools = await prisma.school.findMany({
    include: { _count: { select: { students: true, teachers: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(schools);
});

schoolsRouter.get("/:id", async (req, res) => {
  const school = await prisma.school.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { students: true, teachers: true, classes: true } } },
  });
  if (!school) return res.status(404).json({ error: "School not found" });
  res.json(school);
});

// Admin accounts: only SUPER_ADMIN / MASTER_ADMIN may create them. A school
// may have any number of admins (no cap) — each still belongs to exactly one
// school (schoolId is a single FK, never a list).
schoolsRouter.get("/:id/admins", async (req, res) => {
  const admins = await prisma.user.findMany({
    where: { schoolId: req.params.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  res.json(admins.map((a) => ({ id: a.id, name: a.name, email: a.email, isActive: a.isActive, createdAt: a.createdAt })));
});

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

schoolsRouter.post("/:id/admins", async (req, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password } = parsed.data;

  const school = await prisma.school.findUnique({ where: { id: req.params.id } });
  if (!school) return res.status(404).json({ error: "School not found" });

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN", schoolId: school.id },
  });
  res.status(201).json({ id: admin.id, name: admin.name, email: admin.email, isActive: admin.isActive });
});

const updateAdminSchema = z.object({ isActive: z.boolean() });

schoolsRouter.patch("/:id/admins/:adminId", async (req, res) => {
  const parsed = updateAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const admin = await prisma.user.findFirst({
    where: { id: req.params.adminId, schoolId: req.params.id, role: "ADMIN" },
  });
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: { isActive: parsed.data.isActive },
  });
  res.json({ id: updated.id, name: updated.name, email: updated.email, isActive: updated.isActive });
});

// Creating a school only creates the school itself — no admin account. Once
// it exists, a SUPER_ADMIN/MASTER_ADMIN creates an Admin from the Users page
// and assigns it to this school (school first, then user, never bundled).
const createSchoolSchema = z.object({
  name: z.string().min(1),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, - and _"),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

schoolsRouter.post("/", logoUpload.single("logo"), async (req, res) => {
  const parsed = createSchoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, code, websiteUrl } = parsed.data;
  const logoUrl = req.file ? fileToDataUri(req.file) : null;

  const existingCode = await prisma.school.findUnique({ where: { code } });
  if (existingCode) return res.status(409).json({ error: "School code already in use" });

  const school = await prisma.school.create({
    data: { name, code, logoUrl, websiteUrl: websiteUrl || null },
  });

  res.status(201).json(school);
});

const updateSchoolSchema = z.object({
  name: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

schoolsRouter.patch("/:id", logoUpload.single("logo"), async (req, res) => {
  const parsed = updateSchoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { websiteUrl, ...rest } = parsed.data;
  const logoUrl = req.file ? fileToDataUri(req.file) : undefined;
  const school = await prisma.school.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      logoUrl,
      websiteUrl: websiteUrl !== undefined ? websiteUrl || null : undefined,
    },
  });
  res.json(school);
});

schoolsRouter.delete("/:id", async (req, res) => {
  const school = await prisma.school.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { students: true, teachers: true, users: true, classes: true } } },
  });
  if (!school) return res.status(404).json({ error: "School not found" });

  const { students, teachers, users, classes } = school._count;
  if (students + teachers + users + classes > 0) {
    return res.status(409).json({
      error: "Remove this school's users, classes and students before deleting it",
    });
  }

  await prisma.school.delete({ where: { id: school.id } });
  res.status(204).send();
});
