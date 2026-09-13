import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { PLATFORM_ROLES, useAuth, type Role } from "../context/AuthContext";
import { useSchoolContext } from "../context/SchoolContext";
import { PhoenixLogo } from "./PhoenixLogo";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  schoolScoped?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["SUPER_ADMIN", "MASTER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] },
  { to: "/schools", label: "Schools", roles: ["SUPER_ADMIN", "MASTER_ADMIN"] },
  { to: "/users", label: "Users", roles: ["SUPER_ADMIN", "MASTER_ADMIN"] },
  { to: "/students", label: "Students", roles: ["ADMIN", "TEACHER", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/parents", label: "Parents", roles: ["ADMIN", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/teachers", label: "Teachers", roles: ["ADMIN", "TEACHER", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/classes", label: "Classes", roles: ["ADMIN", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/timetable", label: "Routine", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/fees", label: "Fees", roles: ["ADMIN", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/exams", label: "Exams", roles: ["ADMIN", "TEACHER", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
  { to: "/notices", label: "Notices", roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN", "MASTER_ADMIN"], schoolScoped: true },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { activeSchool, clearActiveSchool } = useSchoolContext();
  const navigate = useNavigate();
  const isPlatformUser = !!user && PLATFORM_ROLES.includes(user.role);

  const displayedSchool = user?.school ?? (isPlatformUser ? activeSchool : null);

  function exitSchoolView() {
    clearActiveSchool();
    navigate("/schools");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
          {displayedSchool?.logoUrl ? (
            <img src={displayedSchool.logoUrl} alt="" className="h-7 w-7 rounded object-cover" />
          ) : (
            <PhoenixLogo className="h-7 w-7" />
          )}
          <h1 className="font-semibold text-slate-800">{displayedSchool?.name ?? "EduCentral"}</h1>
        </div>

        {isPlatformUser && activeSchool && (
          <div className="flex items-center justify-between gap-2 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            <span className="truncate">Viewing: {activeSchool.name}</span>
            <button onClick={exitSchoolView} className="shrink-0 font-medium hover:underline">
              Exit ✕
            </button>
          </div>
        )}

        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems
            .filter((item) => {
              if (!user || !item.roles.includes(user.role)) return false;
              if (item.schoolScoped && isPlatformUser && !activeSchool) return false;
              return true;
            })
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="text-sm text-slate-700 font-medium">{user?.name}</p>
          <p className="text-xs text-slate-400 mb-2">{user?.role}</p>
          <button
            onClick={logout}
            className="w-full text-sm rounded-md border border-slate-200 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
