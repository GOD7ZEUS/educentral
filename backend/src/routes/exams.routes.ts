import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const examsRouter = Router();

examsRouter.use(requireAuth);

examsRouter.get("/", async (req, res) => {
  const { classId } = req.query;
  const exams = await prisma.exam.findMany({
    where: {
      classId: typeof classId === "string" ? classId : undefined,
      class: { schoolId: resolveSchoolId(req) },
    },
    include: { class: true },
    orderBy: { startDate: "desc" },
  });
  res.json(exams);
});

const examSchema = z.object({
  name: z.string().min(1),
  classId: z.string(),
  term: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

examsRouter.post("/", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = examSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { startDate, endDate, ...rest } = parsed.data;

  const cls = await prisma.schoolClass.findFirst({
    where: { id: rest.classId, schoolId: resolveSchoolId(req) },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const exam = await prisma.exam.create({
    data: { ...rest, startDate: new Date(startDate), endDate: new Date(endDate) },
  });
  res.status(201).json(exam);
});

const examUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  term: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

examsRouter.patch("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = examUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { startDate, endDate, ...rest } = parsed.data;

  const existing = await prisma.exam.findFirst({
    where: { id: req.params.id, class: { schoolId: resolveSchoolId(req) } },
  });
  if (!existing) return res.status(404).json({ error: "Exam not found" });

  const exam = await prisma.exam.update({
    where: { id: existing.id },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    include: { class: true },
  });
  res.json(exam);
});

examsRouter.delete("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const existing = await prisma.exam.findFirst({
    where: { id: req.params.id, class: { schoolId: resolveSchoolId(req) } },
  });
  if (!existing) return res.status(404).json({ error: "Exam not found" });

  await prisma.$transaction([
    prisma.examResult.deleteMany({ where: { examId: existing.id } }),
    prisma.exam.delete({ where: { id: existing.id } }),
  ]);
  res.status(204).send();
});

examsRouter.get("/:id/results", async (req, res) => {
  const results = await prisma.examResult.findMany({
    where: { examId: req.params.id, exam: { class: { schoolId: resolveSchoolId(req) } } },
    include: { student: { include: { user: true } }, subject: true },
  });
  res.json(results);
});

const resultSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  marksObtained: z.number().min(0),
  maxMarks: z.number().positive(),
  grade: z.string().optional(),
});

examsRouter.post("/:id/results", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentId, subjectId, marksObtained, maxMarks, grade } = parsed.data;

  const result = await prisma.examResult.upsert({
    where: { examId_studentId_subjectId: { examId: req.params.id, studentId, subjectId } },
    create: { examId: req.params.id, studentId, subjectId, marksObtained, maxMarks, grade },
    update: { marksObtained, maxMarks, grade },
  });
  res.json(result);
});
