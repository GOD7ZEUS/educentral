import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { Role, signToken } from "../auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { school: true } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.school && !user.school.isActive) {
    return res.status(403).json({ error: "This school's account has been deactivated" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({
    userId: user.id,
    role: user.role as Role,
    email: user.email,
    schoolId: user.schoolId,
  });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      school: user.school ? { name: user.school.name, logoUrl: user.school.logoUrl } : null,
    },
  });
});
