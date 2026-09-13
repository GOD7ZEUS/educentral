import { Navigate, Outlet } from "react-router-dom";
import { PLATFORM_ROLES, useAuth, type Role } from "../context/AuthContext";
import { useSchoolContext } from "../context/SchoolContext";

interface ProtectedRouteProps {
  roles?: Role[];
  // When true, a platform-role user (SUPER_ADMIN/MASTER_ADMIN) must have
  // stepped into a specific school first, otherwise they're sent to /schools
  // instead of seeing unscoped, cross-school data.
  schoolScoped?: boolean;
}

export function ProtectedRoute({ roles, schoolScoped }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { activeSchool } = useSchoolContext();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (schoolScoped && PLATFORM_ROLES.includes(user.role) && !activeSchool) {
    return <Navigate to="/schools" replace />;
  }

  return <Outlet />;
}
