import { Fragment, type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import { toIsoDob } from "../utils/dob";

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

const emptyNewForm = {
  schoolId: "", firstName: "", lastName: "", email: "", password: "", dob: "",
  employeeId: "", admissionNo: "",
};

const CREATABLE_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export function Users() {
  const { user } = useAuth();
  const isMaster = user?.role === "MASTER_ADMIN";
  const roleFilterOptions = isMaster
    ? ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN"]
    : ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"];
  // Master creates Super Admin, Admin, Teacher; Super Admin creates Admin,
  // Teacher, Student (per the platform hierarchy) — never Parent here.
  const creatableRoles = isMaster
    ? ["SUPER_ADMIN", "ADMIN", "TEACHER"]
    : ["ADMIN", "TEACHER", "STUDENT"];

  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [newRole, setNewRole] = useState(creatableRoles[0]);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [newError, setNewError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  function loadUsers() {
    api.get("/users", { params: { schoolId: schoolFilter || undefined, role: roleFilter || undefined } })
      .then((res) => setUsers(res.data));
  }

  useEffect(() => {
    api.get("/schools").then((res) => setSchools(res.data));
  }, []);

  useEffect(loadUsers, [schoolFilter, roleFilter]);

  async function handleNewSubmit(e: FormEvent) {
    e.preventDefault();
    setNewError(null);
    const { schoolId, firstName, lastName, email, password, dob, employeeId, admissionNo } = newForm;
    const dobIso = toIsoDob(dob);
    try {
      if (newRole === "SUPER_ADMIN") {
        await api.post("/super-admins", { firstName, lastName, email, password, dob: dobIso });
      } else if (newRole === "ADMIN") {
        await api.post("/admins", { schoolId, firstName, lastName, email, password, dob: dobIso });
      } else if (newRole === "TEACHER") {
        await api.post("/teachers", { firstName, lastName, email, password, employeeId, dob: dobIso }, { params: { schoolId } });
      } else {
        await api.post("/students", { firstName, lastName, email, password, admissionNo, dob: dobIso }, { params: { schoolId } });
      }
      setNewForm(emptyNewForm);
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      setNewError(extractErrorMessage(err, `Could not add ${CREATABLE_ROLE_LABELS[newRole].toLowerCase()}`));
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

      {showForm && (
        <form onSubmit={handleNewSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          {newError && <p className="sm:col-span-2 text-sm text-red-600">{newError}</p>}

          <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-slate-500">
            Role to create
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800">
              {creatableRoles.map((r) => <option key={r} value={r}>{CREATABLE_ROLE_LABELS[r]}</option>)}
            </select>
          </label>

          {newRole !== "SUPER_ADMIN" && (
            <select required value={newForm.schoolId}
              onChange={(e) => setNewForm({ ...newForm, schoolId: e.target.value })}
              className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select school</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          <input required placeholder="First name" value={newForm.firstName}
            onChange={(e) => setNewForm({ ...newForm, firstName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Last name" value={newForm.lastName}
            onChange={(e) => setNewForm({ ...newForm, lastName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={newForm.email}
            onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Date of birth
            <input type="date" value={newForm.dob}
              onChange={(e) => setNewForm({ ...newForm, dob: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </label>

          {newRole === "TEACHER" && (
            <input required placeholder="Employee ID" value={newForm.employeeId}
              onChange={(e) => setNewForm({ ...newForm, employeeId: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          )}
          {newRole === "STUDENT" && (
            <input required placeholder="Admission No." value={newForm.admissionNo}
              onChange={(e) => setNewForm({ ...newForm, admissionNo: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          )}

          <input required type="password" placeholder="Password (min 8 chars)" value={newForm.password}
            onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create {CREATABLE_ROLE_LABELS[newRole]}
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
