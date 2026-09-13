import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const teachersRouter = Router();

teachersRouter.use(requireAuth);

teachersRouter.get("/", async (req, res) => {
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: resolveSchoolId(req) },
    include: { user: true, subjects: true, classesLed: { include: { class: true } } },
    orderBy: { employeeId: "asc" },
  });
  res.json(teachers);
});

teachersRouter.get("/me", requireRole("TEACHER"), async (req, res) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user!.userId },
    include: { classesLed: true },
  });
  if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });
  res.json({ id: teacher.id, sectionIds: teacher.classesLed.map((s) => s.id) });
});

teachersRouter.get("/:id", async (req, res) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { user: true, subjects: true, classesLed: { include: { class: true } }, timetable: true },
  });
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  res.json(teacher);
});

const createTeacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  employeeId: z.string().min(1),
  subjectIds: z.array(z.string()).optional(),
});

teachersRouter.post("/", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = createTeacherSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, employeeId, subjectIds } = parsed.data;

  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: "Select a school first" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "TEACHER", schoolId },
    });
    return tx.teacher.create({
      data: {
        userId: user.id,
        schoolId,
        employeeId,
        subjects: subjectIds?.length ? { connect: subjectIds.map((id) => ({ id })) } : undefined,
      },
      include: { user: true, subjects: true },
    });
  });
  res.status(201).json(teacher);
});

const updateTeacherSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  employeeId: z.string().min(1).optional(),
  subjectIds: z.array(z.string()).optional(),
});

teachersRouter.patch("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = updateTeacherSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { subjectIds, name, email, ...rest } = parsed.data;

  const existing = await prisma.teacher.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { user: true },
  });
  if (!existing) return res.status(404).json({ error: "Teacher not found" });

  if (email && email !== existing.user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: "Email already registered" });
  }

  const teacher = await prisma.$transaction(async (tx) => {
    if (name || email) {
      await tx.user.update({ where: { id: existing.userId }, data: { name, email } });
    }
    return tx.teacher.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        subjects: subjectIds ? { set: subjectIds.map((id) => ({ id })) } : undefined,
      },
      include: { user: true, subjects: true },
    });
  });
  res.json(teacher);
});

teachersRouter.delete("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const existing = await prisma.teacher.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { timetable: true, classesLed: true },
  });
  if (!existing) return res.status(404).json({ error: "Teacher not found" });

  if (existing.timetable.length > 0 || existing.classesLed.length > 0) {
    return res.status(409).json({
      error: "Remove this teacher from the timetable and as a class teacher before deleting",
    });
  }

  await prisma.$transaction([
    prisma.teacher.delete({ where: { id: existing.id } }),
    prisma.user.delete({ where: { id: existing.userId } }),
  ]);
  res.status(204).send();
});
