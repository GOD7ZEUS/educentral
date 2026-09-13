import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const classesRouter = Router();

classesRouter.use(requireAuth);

classesRouter.get("/", async (req, res) => {
  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: resolveSchoolId(req) },
    include: {
      sections: { include: { classTeacher: { include: { user: true } } } },
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(classes);
});

const classSchema = z.object({ name: z.string().min(1) });

classesRouter.post("/", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: "Select a school first" });
  const cls = await prisma.schoolClass.create({
    data: { name: parsed.data.name, schoolId },
  });
  res.status(201).json(cls);
});

classesRouter.patch("/:classId", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const cls = await prisma.schoolClass.findFirst({
    where: { id: req.params.classId, schoolId: resolveSchoolId(req) },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const updated = await prisma.schoolClass.update({
    where: { id: req.params.classId },
    data: { name: parsed.data.name },
  });
  res.json(updated);
});

classesRouter.delete("/:classId", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: req.params.classId, schoolId: resolveSchoolId(req) },
    include: { _count: { select: { students: true } } },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });
  if (cls._count.students > 0) {
    return res.status(409).json({ error: "Move or remove this class's students before deleting it" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.timetable.deleteMany({ where: { classId: cls.id } });
    await tx.examResult.deleteMany({ where: { exam: { classId: cls.id } } });
    await tx.exam.deleteMany({ where: { classId: cls.id } });
    await tx.feePayment.deleteMany({ where: { feeStructure: { classId: cls.id } } });
    await tx.feeStructure.deleteMany({ where: { classId: cls.id } });
    await tx.section.deleteMany({ where: { classId: cls.id } });
    await tx.schoolClass.delete({ where: { id: cls.id } });
  });
  res.status(204).send();
});

const sectionSchema = z.object({ name: z.string().min(1) });

classesRouter.post("/:classId/sections", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const cls = await prisma.schoolClass.findFirst({
    where: { id: req.params.classId, schoolId: resolveSchoolId(req) },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const section = await prisma.section.create({
    data: { name: parsed.data.name, classId: req.params.classId },
    include: { classTeacher: { include: { user: true } } },
  });
  res.status(201).json(section);
});

const sectionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  classTeacherId: z.string().nullable().optional(),
});

classesRouter.patch("/:classId/sections/:sectionId", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = sectionUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const section = await prisma.section.findFirst({
    where: { id: req.params.sectionId, class: { id: req.params.classId, schoolId: resolveSchoolId(req) } },
  });
  if (!section) return res.status(404).json({ error: "Section not found" });

  const updated = await prisma.section.update({
    where: { id: req.params.sectionId },
    data: parsed.data,
    include: { classTeacher: { include: { user: true } } },
  });
  res.json(updated);
});

classesRouter.delete("/:classId/sections/:sectionId", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const section = await prisma.section.findFirst({
    where: { id: req.params.sectionId, class: { id: req.params.classId, schoolId: resolveSchoolId(req) } },
    include: { _count: { select: { students: true } } },
  });
  if (!section) return res.status(404).json({ error: "Section not found" });
  if (section._count.students > 0) {
    return res.status(409).json({ error: "Move or remove this section's students before deleting it" });
  }

  await prisma.$transaction([
    prisma.timetable.deleteMany({ where: { sectionId: section.id } }),
    prisma.section.delete({ where: { id: section.id } }),
  ]);
  res.status(204).send();
});
