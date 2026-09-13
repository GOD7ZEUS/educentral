import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const parentsRouter = Router();

parentsRouter.use(requireAuth);

parentsRouter.get("/", async (req, res) => {
  const parents = await prisma.parent.findMany({
    where: { schoolId: resolveSchoolId(req) },
    include: { user: true, students: { include: { user: true } } },
    orderBy: { user: { name: "asc" } },
  });
  res.json(parents);
});

const createParentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  studentId: z.string().optional(),
});

parentsRouter.post("/", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = createParentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, studentId } = parsed.data;

  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: "Select a school first" });

  if (studentId) {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return res.status(404).json({ error: "Student not found" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const parent = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "PARENT", schoolId },
    });
    const created = await tx.parent.create({
      data: { userId: user.id, schoolId },
      include: { user: true, students: { include: { user: true } } },
    });
    if (studentId) {
      await tx.student.update({ where: { id: studentId }, data: { parentId: created.id } });
    }
    return tx.parent.findUniqueOrThrow({
      where: { id: created.id },
      include: { user: true, students: { include: { user: true } } },
    });
  });
  res.status(201).json(parent);
});

const updateParentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

parentsRouter.patch("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = updateParentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email } = parsed.data;

  const existing = await prisma.parent.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { user: true },
  });
  if (!existing) return res.status(404).json({ error: "Parent not found" });

  if (email && email !== existing.user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: "Email already registered" });
  }

  await prisma.user.update({ where: { id: existing.userId }, data: { name, email } });
  const updated = await prisma.parent.findUnique({
    where: { id: existing.id },
    include: { user: true, students: { include: { user: true } } },
  });
  res.json(updated);
});

parentsRouter.delete("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const existing = await prisma.parent.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
  });
  if (!existing) return res.status(404).json({ error: "Parent not found" });

  await prisma.$transaction([
    prisma.student.updateMany({ where: { parentId: existing.id }, data: { parentId: null } }),
    prisma.parent.delete({ where: { id: existing.id } }),
    prisma.user.delete({ where: { id: existing.userId } }),
  ]);
  res.status(204).send();
});

const linkStudentSchema = z.object({ studentId: z.string() });

parentsRouter.post("/:id/students", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = linkStudentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const schoolId = resolveSchoolId(req);
  const parent = await prisma.parent.findFirst({ where: { id: req.params.id, schoolId } });
  if (!parent) return res.status(404).json({ error: "Parent not found" });

  const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId } });
  if (!student) return res.status(404).json({ error: "Student not found" });

  await prisma.student.update({ where: { id: student.id }, data: { parentId: parent.id } });
  const updated = await prisma.parent.findUnique({
    where: { id: parent.id },
    include: { user: true, students: { include: { user: true } } },
  });
  res.json(updated);
});
