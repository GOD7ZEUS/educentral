import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { ADMIN_OR_PLATFORM, requireAuth, requireRole, resolveSchoolId } from "../auth";

export const noticesRouter = Router();

noticesRouter.use(requireAuth);

noticesRouter.get("/", async (req, res) => {
  const audience = req.user!.role;
  const notices = await prisma.notice.findMany({
    where: {
      schoolId: resolveSchoolId(req),
      OR: [{ audience: null }, { audience }, { postedById: req.user!.userId }],
    },
    include: { postedBy: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(notices);
});

const noticeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  audience: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]).nullable().optional(),
});

noticesRouter.post("/", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = noticeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: "Select a school first" });
  const notice = await prisma.notice.create({
    data: { ...parsed.data, postedById: req.user!.userId, schoolId },
  });
  res.status(201).json(notice);
});

async function canEditNotice(req: import("express").Request, noticeId: string) {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, schoolId: resolveSchoolId(req) },
  });
  if (!notice) return { notice: null, allowed: false };
  const allowed = ADMIN_OR_PLATFORM.includes(req.user!.role) || notice.postedById === req.user!.userId;
  return { notice, allowed };
}

noticesRouter.patch("/:id", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const parsed = noticeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { notice, allowed } = await canEditNotice(req, req.params.id);
  if (!notice) return res.status(404).json({ error: "Notice not found" });
  if (!allowed) return res.status(403).json({ error: "You can only edit notices you posted" });

  const updated = await prisma.notice.update({ where: { id: notice.id }, data: parsed.data });
  res.json(updated);
});

noticesRouter.delete("/:id", requireRole("TEACHER", ...ADMIN_OR_PLATFORM), async (req, res) => {
  const { notice, allowed } = await canEditNotice(req, req.params.id);
  if (!notice) return res.status(404).json({ error: "Notice not found" });
  if (!allowed) return res.status(403).json({ error: "You can only delete notices you posted" });

  await prisma.notice.delete({ where: { id: notice.id } });
  res.status(204).send();
});
