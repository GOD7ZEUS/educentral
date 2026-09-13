import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";
import { isClassTeacherOfSection } from "../permissions";

export const studentsRouter = Router();

export const TRANSPORT_MODES = [
  "SCHOOL_BUS",
  "PRIVATE_VEHICLE",
  "PUBLIC_TRANSPORT",
  "BICYCLE",
  "WALKING",
  "OTHER",
] as const;

studentsRouter.use(requireAuth);

studentsRouter.get("/", async (req, res) => {
  const { classId, sectionId } = req.query;
  const students = await prisma.student.findMany({
    where: {
      schoolId: resolveSchoolId(req),
      classId: typeof classId === "string" ? classId : undefined,
      sectionId: typeof sectionId === "string" ? sectionId : undefined,
    },
    include: { user: true, class: true, section: true },
    orderBy: { admissionNo: "asc" },
  });
  res.json(students);
});

studentsRouter.get("/:id", async (req, res) => {
  const student = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { user: true, class: true, section: true, parent: { include: { user: true } } },
  });
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json(student);
});

const familyDetailsSchema = {
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  fatherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  fatherOccupation: z.string().optional(),
  fatherQualification: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherOccupation: z.string().optional(),
  motherQualification: z.string().optional(),
  transportMode: z.enum(TRANSPORT_MODES).optional(),
};

const createStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  admissionNo: z.string().min(1),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  dob: z.string().datetime().optional(),
  ...familyDetailsSchema,
});

studentsRouter.post("/", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, admissionNo, classId, sectionId, dob, ...details } = parsed.data;

  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: "Select a school first" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role: "STUDENT", schoolId },
    });
    return tx.student.create({
      data: {
        admissionNo,
        classId,
        sectionId,
        dob: dob ? new Date(dob) : undefined,
        schoolId,
        userId: user.id,
        ...details,
      },
      include: { user: true, class: true, section: true },
    });
  });
  res.status(201).json(student);
});

// ADMIN/platform can move a student between classes and edit every field.
// A TEACHER may only edit the student's personal/family details, and only
// for a student in the section they're the class teacher of.
const nameEmailSchema = {
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
};

const adminUpdateStudentSchema = z.object({
  classId: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  dob: z.string().datetime().optional(),
  ...nameEmailSchema,
  ...familyDetailsSchema,
});

const teacherUpdateStudentSchema = z.object({
  dob: z.string().datetime().optional(),
  ...nameEmailSchema,
  ...familyDetailsSchema,
});

studentsRouter.patch("/:id", async (req, res) => {
  const existing = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
    include: { user: true },
  });
  if (!existing) return res.status(404).json({ error: "Student not found" });

  const isAdminOrPlatform = ADMIN_OR_PLATFORM.includes(req.user!.role);
  const isOwnClassTeacher = !isAdminOrPlatform && (await isClassTeacherOfSection(req, existing.sectionId));
  if (!isAdminOrPlatform && !isOwnClassTeacher) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const schema = isAdminOrPlatform ? adminUpdateStudentSchema : teacherUpdateStudentSchema;
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { dob, name, email, ...rest } = parsed.data as z.infer<typeof adminUpdateStudentSchema>;

  if (email && email !== existing.user.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: "Email already registered" });
  }

  const student = await prisma.$transaction(async (tx) => {
    if (name || email) {
      await tx.user.update({ where: { id: existing.userId }, data: { name, email } });
    }
    return tx.student.update({
      where: { id: req.params.id },
      data: { ...rest, dob: dob ? new Date(dob) : undefined },
      include: { user: true, class: true, section: true },
    });
  });
  res.json(student);
});

studentsRouter.delete("/:id", requireRole(...ADMIN_OR_PLATFORM), async (req, res) => {
  const existing = await prisma.student.findFirst({
    where: { id: req.params.id, schoolId: resolveSchoolId(req) },
  });
  if (!existing) return res.status(404).json({ error: "Student not found" });

  await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { studentId: existing.id } }),
    prisma.feePayment.deleteMany({ where: { studentId: existing.id } }),
    prisma.examResult.deleteMany({ where: { studentId: existing.id } }),
    prisma.student.delete({ where: { id: existing.id } }),
    prisma.user.delete({ where: { id: existing.userId } }),
  ]);
  res.status(204).send();
});
