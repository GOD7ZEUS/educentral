import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const feesRouter = Router();

feesRouter.use(requireAuth);

feesRouter.get("/structures", async (req, res) => {
  const { classId } = req.query;
  const structures = await prisma.feeStructure.findMany({
    where: {
      classId: typeof classId === "string" ? classId : undefined,
      class: { schoolId: resolveSchoolId(req) },
    },
    include: { class: true },
    orderBy: { dueDate: "asc" },
  });
  res.json(structures);
});

const structureSchema = z.object({
  classId: z.string(),
  term: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
});

feesRouter.post("/structures", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = structureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { dueDate, ...rest } = parsed.data;

  const cls = await prisma.schoolClass.findFirst({
    where: { id: rest.classId, schoolId: resolveSchoolId(req) },
  });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const structure = await prisma.feeStructure.create({
    data: { ...rest, dueDate: new Date(dueDate) },
  });
  res.status(201).json(structure);
});

const structureUpdateSchema = z.object({
  term: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
});

feesRouter.patch("/structures/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = structureUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { dueDate, ...rest } = parsed.data;

  const existing = await prisma.feeStructure.findFirst({
    where: { id: req.params.id, class: { schoolId: resolveSchoolId(req) } },
  });
  if (!existing) return res.status(404).json({ error: "Fee structure not found" });

  const structure = await prisma.feeStructure.update({
    where: { id: existing.id },
    data: { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
    include: { class: true },
  });
  res.json(structure);
});

feesRouter.delete("/structures/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const existing = await prisma.feeStructure.findFirst({
    where: { id: req.params.id, class: { schoolId: resolveSchoolId(req) } },
    include: { _count: { select: { payments: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Fee structure not found" });
  if (existing._count.payments > 0) {
    return res.status(409).json({ error: "Payments already exist against this fee structure — it can't be deleted" });
  }

  await prisma.feeStructure.delete({ where: { id: existing.id } });
  res.status(204).send();
});

feesRouter.get("/payments", async (req, res) => {
  const { studentId } = req.query;
  const payments = await prisma.feePayment.findMany({
    where: {
      studentId: typeof studentId === "string" ? studentId : undefined,
      student: { schoolId: resolveSchoolId(req) },
    },
    include: { feeStructure: { include: { class: true } }, student: { include: { user: true } } },
    orderBy: { paymentDate: "desc" },
  });
  res.json(payments);
});

const paymentSchema = z.object({
  studentId: z.string(),
  feeStructureId: z.string(),
  amountPaid: z.number().positive(),
  method: z.string().optional(),
});

feesRouter.post("/payments", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentId, feeStructureId, amountPaid, method } = parsed.data;

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: resolveSchoolId(req) },
  });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const structure = await prisma.feeStructure.findFirst({
    where: { id: feeStructureId, class: { schoolId: resolveSchoolId(req) } },
  });
  if (!structure) return res.status(404).json({ error: "Fee structure not found" });

  const priorPayments = await prisma.feePayment.aggregate({
    where: { studentId, feeStructureId },
    _sum: { amountPaid: true },
  });
  const totalPaid = (priorPayments._sum.amountPaid ?? 0) + amountPaid;
  const status = totalPaid >= structure.amount ? "PAID" : totalPaid > 0 ? "PARTIAL" : "PENDING";

  const payment = await prisma.feePayment.create({
    data: { studentId, feeStructureId, amountPaid, method, status },
  });
  res.status(201).json(payment);
});
