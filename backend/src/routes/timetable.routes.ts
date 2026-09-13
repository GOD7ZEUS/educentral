import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const timetableRouter = Router();

timetableRouter.use(requireAuth);

timetableRouter.get("/", async (req, res) => {
  const { classId, sectionId } = req.query;
  const entries = await prisma.timetable.findMany({
    where: {
      classId: typeof classId === "string" ? classId : undefined,
      sectionId: typeof sectionId === "string" ? sectionId : undefined,
      class: { schoolId: resolveSchoolId(req) },
    },
    include: { class: true, section: true, subject: true, teacher: { include: { user: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  res.json(entries);
});

timetableRouter.get("/me", async (req, res) => {
  const { userId, role } = req.user!;

  if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student?.sectionId) return res.json([]);
    const entries = await prisma.timetable.findMany({
      where: { sectionId: student.sectionId },
      include: { class: true, section: true, subject: true, teacher: { include: { user: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return res.json(entries);
  }

  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) return res.json([]);
    const entries = await prisma.timetable.findMany({
      where: { teacherId: teacher.id },
      include: { class: true, section: true, subject: true, teacher: { include: { user: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return res.json(entries);
  }

  res.json([]);
});

const entrySchema = z.object({
  classId: z.string(),
  sectionId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

timetableRouter.post("/", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const cls = await prisma.schoolClass.findFirst({
    where: { id: parsed.data.classId, schoolId: resolveSchoolId(req) },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const entry = await prisma.timetable.create({
    data: parsed.data,
    include: { class: true, section: true, subject: true, teacher: { include: { user: true } } },
  });
  res.status(201).json(entry);
});

timetableRouter.patch("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = entrySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const entry = await prisma.timetable.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { class: true, section: true, subject: true, teacher: { include: { user: true } } },
  });
  res.json(entry);
});

timetableRouter.delete("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  await prisma.timetable.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
