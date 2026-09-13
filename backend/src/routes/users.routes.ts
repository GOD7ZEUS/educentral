import { Router } from "express";
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
