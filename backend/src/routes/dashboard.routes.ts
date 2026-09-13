import { Router } from "express";
import { prisma } from "../prisma";
import { PLATFORM_ROLES, requireAuth, resolveSchoolId } from "../auth";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const schoolId = resolveSchoolId(req);

  if (PLATFORM_ROLES.includes(req.user!.role) && !schoolId) {
    const [schoolCount, activeSchoolCount, studentCount, teacherCount] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { isActive: true } }),
      prisma.student.count(),
      prisma.teacher.count(),
    ]);
    return res.json({
      platform: true,
      schoolCount,
      activeSchoolCount,
      studentCount,
      teacherCount,
    });
  }

  const [studentCount, teacherCount, classCount, noticeCount] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.schoolClass.count({ where: { schoolId } }),
    prisma.notice.count({ where: { schoolId } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAttendance = await prisma.attendance.groupBy({
    by: ["status"],
    where: { date: today, student: { schoolId } },
    _count: true,
  });

  const feeTotals = await prisma.feePayment.aggregate({
    where: { student: { schoolId } },
    _sum: { amountPaid: true },
  });

  res.json({
    platform: false,
    studentCount,
    teacherCount,
    classCount,
    noticeCount,
    todayAttendance,
    totalFeesCollected: feeTotals._sum.amountPaid ?? 0,
  });
});
