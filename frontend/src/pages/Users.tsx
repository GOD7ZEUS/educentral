import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MASTER_ADMIN: "Master Admin",
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
};

interface SchoolOption {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  school: { id: string; name: string } | null;
}

const emptyAdminForm = { schoolId: "", name: "", email: "", password: "" };
const emptySuperAdminForm = { name: "", email: "", password: "" };

export function Users() {
  const { user } = useAuth();
  const isMaster = user?.role === "MASTER_ADMIN";
  const roleFilterOptions = isMaster
    ? ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN", "MASTER_ADMIN"]
    : ["ADMIN", "TEACHER"];

  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [superAdminForm, setSuperAdminForm] = useState(emptySuperAdminForm);
  const [showSuperAdminForm, setShowSuperAdminForm] = useState(false);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  function loadUsers() {
    api.get("/users", { params: { schoolId: schoolFilter || undefined, role: roleFilter || undefined } })
      .then((res) => setUsers(res.data));
  }

  useEffect(() => {
    api.get("/schools").then((res) => setSchools(res.data));
  }, []);

  useEffect(loadUsers, [schoolFilter, roleFilter]);

  async function handleAdminSubmit(e: FormEvent) {
    e.preventDefault();
    setAdminError(null);
    try {
      await api.post("/admins", adminForm);
      setAdminForm(emptyAdminForm);
      setShowAdminForm(false);
      loadUsers();
    } catch (err: any) {
      setAdminError(err.response?.data?.error?.formErrors?.[0] ?? err.response?.data?.error ?? "Could not add admin");
    }
  }

  async function handleSuperAdminSubmit(e: FormEvent) {
    e.preventDefault();
    setSuperAdminError(null);
    try {
      await api.post("/super-admins", superAdminForm);
      setSuperAdminForm(emptySuperAdminForm);
      setShowSuperAdminForm(false);
      loadUsers();
    } catch (err: any) {
      setSuperAdminError(err.response?.data?.error?.formErrors?.[0] ?? err.response?.data?.error ?? "Could not add super admin");
    }
  }

  async function toggleActive(u: UserRow) {
    const path = u.role === "SUPER_ADMIN" ? `/super-admins/${u.id}` : `/admins/${u.id}`;
    await api.patch(path, { isActive: !u.isActive });
    loadUsers();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Users</h1>
        <div className="flex gap-2">
          {isMaster && (
            <button
              onClick={() => setShowSuperAdminForm((v) => !v)}
              className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              {showSuperAdminForm ? "Cancel" : "Add Super Admin"}
            </button>
          )}
          <button
            onClick={() => setShowAdminForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showAdminForm ? "Cancel" : "Add Admin"}
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        {isMaster
          ? "Every account on the platform, across every school and role."
          : "Admin and Teacher accounts across every school. Master Admin accounts aren't shown here."}
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Schools</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Roles</option>
          {roleFilterOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {showSuperAdminForm && (
        <form onSubmit={handleSuperAdminSubmit} className="mb-6 grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">New Super Admin</p>
          {superAdminError && <p className="sm:col-span-2 text-sm text-red-600">{superAdminError}</p>}
          <input required placeholder="Full name" value={superAdminForm.name}
            onChange={(e) => setSuperAdminForm({ ...superAdminForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={superAdminForm.email}
            onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Password (min 8 chars)" value={superAdminForm.password}
            onChange={(e) => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create Super Admin
          </button>
        </form>
      )}

      {showAdminForm && (
        <form onSubmit={handleAdminSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          {adminError && <p className="sm:col-span-2 text-sm text-red-600">{adminError}</p>}
          <select required value={adminForm.schoolId}
            onChange={(e) => setAdminForm({ ...adminForm, schoolId: e.target.value })}
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select school</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input required placeholder="Full name" value={adminForm.name}
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Password (min 8 chars)" value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create Admin
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">School</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-2">{u.school?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {(u.role === "ADMIN" || (isMaster && u.role === "SUPER_ADMIN")) && (
                    <button onClick={() => toggleActive(u)} className="text-xs text-slate-500 hover:underline">
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
