import { Fragment, type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
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
    ? ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN"]
    : ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"];

  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [superAdminForm, setSuperAdminForm] = useState(emptySuperAdminForm);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

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
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      setAdminError(extractErrorMessage(err, "Could not add admin"));
    }
  }

  async function handleSuperAdminSubmit(e: FormEvent) {
    e.preventDefault();
    setSuperAdminError(null);
    try {
      await api.post("/super-admins", superAdminForm);
      setSuperAdminForm(emptySuperAdminForm);
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      setSuperAdminError(extractErrorMessage(err, "Could not add super admin"));
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", email: "", isActive: true, password: "" });
  const [editError, setEditError] = useState<string | null>(null);

  function canEdit(u: UserRow) {
    return u.role === "ADMIN" || u.role === "TEACHER" || (isMaster && u.role === "SUPER_ADMIN");
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditDraft({ name: u.name, email: u.email, isActive: u.isActive, password: "" });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(u: UserRow) {
    setEditError(null);
    const allowNameEmail = u.role !== "SUPER_ADMIN";
    const payload: Record<string, unknown> = { isActive: editDraft.isActive };
    if (allowNameEmail) {
      payload.name = editDraft.name;
      payload.email = editDraft.email;
    }
    if (editDraft.password) {
      if (editDraft.password.length < 8) {
        setEditError("Password must be at least 8 characters");
        return;
      }
      payload.password = editDraft.password;
    }
    try {
      await api.patch(`/users/${u.id}`, payload);
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteUser(u: UserRow) {
    if (!window.confirm(`Delete ${u.name} (${ROLE_LABELS[u.role] ?? u.role})? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not delete user"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Users</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Add New"}
        </button>
      </div>

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

      {showForm && isMaster && (
        <form onSubmit={handleSuperAdminSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
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

      {showForm && !isMaster && (
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
              <Fragment key={u.id}>
                <tr>
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
                    {canEdit(u) && (
                      <button
                        onClick={() => (editingId === u.id ? cancelEdit() : startEdit(u))}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        {editingId === u.id ? "Cancel" : u.role === "SUPER_ADMIN" ? "Reset" : "Edit"}
                      </button>
                    )}
                  </td>
                </tr>
                {editingId === u.id && (
                  <tr key={`${u.id}-edit`} className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {editError && <p className="sm:col-span-2 text-sm text-red-600">{editError}</p>}
                        {u.role !== "SUPER_ADMIN" && (
                          <>
                            <input placeholder="Full name" value={editDraft.name}
                              onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                            <input type="email" placeholder="Email" value={editDraft.email}
                              onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </>
                        )}
                        <input type="password" placeholder="New password (leave blank to keep current)"
                          value={editDraft.password}
                          onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input type="checkbox" checked={editDraft.isActive}
                            onChange={(e) => setEditDraft({ ...editDraft, isActive: e.target.checked })} />
                          Active
                        </label>
                        <div className="sm:col-span-2 flex gap-2">
                          <button onClick={() => saveEdit(u)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                            Save
                          </button>
                          <button onClick={cancelEdit}
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                            Cancel
                          </button>
                          <button onClick={() => deleteUser(u)}
                            className="ml-auto rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
