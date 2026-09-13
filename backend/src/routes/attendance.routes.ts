import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

attendanceRouter.get("/", async (req, res) => {
  const { studentId, classId, sectionId, date } = req.query;
  const attendance = await prisma.attendance.findMany({
    where: {
      studentId: typeof studentId === "string" ? studentId : undefined,
      date: typeof date === "string" ? new Date(date) : undefined,
      student: {
        schoolId: resolveSchoolId(req),
        classId: typeof classId === "string" ? classId : undefined,
        sectionId: typeof sectionId === "string" ? sectionId : undefined,
      },
    },
    include: { student: { include: { user: true } } },
    orderBy: { date: "desc" },
  });
  res.json(attendance);
});

const markSchema = z.object({
  date: z.string().datetime(),
  entries: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
    })
  ),
});

attendanceRouter.post("/", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = markSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { date, entries } = parsed.data;
  const day = new Date(date);

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: entry.studentId, date: day } },
        create: { studentId: entry.studentId, date: day, status: entry.status, markedBy: req.user!.userId },
        update: { status: entry.status, markedBy: req.user!.userId },
      })
    )
  );
  res.json(results);
});
