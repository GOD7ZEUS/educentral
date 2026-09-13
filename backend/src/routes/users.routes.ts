import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";

// A platform-wide directory of every account on the system. Visibility is
// tiered: MASTER_ADMIN sees every role in every school (with a school filter);
// SUPER_ADMIN sees other SUPER_ADMIN, ADMIN, TEACHER and STUDENT accounts,
// but never MASTER_ADMIN.
export const usersRouter = Router();

const MASTER_VISIBLE_ROLES = ["SUPER_ADMIN", "MASTER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"];
const SUPER_VISIBLE_ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"];

usersRouter.use(requireAuth, requireRole("SUPER_ADMIN", "MASTER_ADMIN"));

usersRouter.get("/", async (req, res) => {
  const isMaster = req.user!.role === "MASTER_ADMIN";
  const allowedRoles = isMaster ? MASTER_VISIBLE_ROLES : SUPER_VISIBLE_ROLES;

  const { schoolId, role } = req.query;
  const roleFilter = typeof role === "string" && allowedRoles.includes(role) ? role : undefined;

  const users = await prisma.user.findMany({
    where: {
      role: roleFilter ?? { in: allowedRoles },
      schoolId: typeof schoolId === "string" ? schoolId : undefined,
    },
    include: { school: true },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      school: u.school ? { id: u.school.id, name: u.school.name } : null,
    }))
  );
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// A single edit endpoint for this directory, since Users.tsx only has each
// account's User id (not a Teacher/Student's own record id). Permissions:
// SUPER_ADMIN and MASTER_ADMIN can fully edit ADMIN and TEACHER accounts;
// only MASTER_ADMIN may touch a SUPER_ADMIN, and only to reset its password
// or active status (never its name/email).
usersRouter.patch("/:id", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  const isMaster = req.user!.role === "MASTER_ADMIN";
  const editableRoles = isMaster ? ["ADMIN", "TEACHER", "SUPER_ADMIN"] : ["ADMIN", "TEACHER"];
  if (!editableRoles.includes(target.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, email, isActive, password } = parsed.data;
  const allowNameEmail = target.role !== "SUPER_ADMIN";

  if (allowNameEmail && email && email !== target.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: "Email already registered" });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(allowNameEmail && name ? { name } : {}),
      ...(allowNameEmail && email ? { email } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive });
});
