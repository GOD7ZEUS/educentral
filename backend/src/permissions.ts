import { Request } from "express";
import { prisma } from "./prisma";

// True when the logged-in TEACHER is the class teacher of this section —
// the one case a teacher is allowed to edit something outside their own
// direct records (a student's profile, for the class they're responsible for).
export async function isClassTeacherOfSection(req: Request, sectionId: string | null | undefined): Promise<boolean> {
  if (!sectionId || req.user!.role !== "TEACHER") return false;
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
  if (!teacher) return false;
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  return section?.classTeacherId === teacher.id;
}
