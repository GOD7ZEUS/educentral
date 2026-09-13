import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";

export const subjectsRouter = Router();

subjectsRouter.use(requireAuth);

subjectsRouter.get("/", async (req, res) => {
  const subjects = await prisma.subject.findMany({
    where: { schoolId: req.user!.schoolId ?? undefined },
    orderBy: { name: "asc" },
  });
  res.json(subjects);
});

const subjectSchema = z.object({ name: z.string().min(1), code: z.string().min(1) });

subjectsRouter.post("/", requireRole("ADMIN"), async (req, res) => {
  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const subject = await prisma.subject.create({
    data: { ...parsed.data, schoolId: req.user!.schoolId! },
  });
  res.status(201).json(subject);
});
