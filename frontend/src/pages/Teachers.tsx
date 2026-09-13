import { Fragment, type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";

interface SubjectRow {
  id: string;
  name: string;
  code: string;
}

interface TeacherRow {
  id: string;
  employeeId: string;
  user: { name: string; email: string };
  subjects: SubjectRow[];
  classesLed: { id: string; name: string; class: { name: string } }[];
}

const emptyForm = { name: "", email: "", password: "", employeeId: "", subjectIds: [] as string[] };

function teacherToEditForm(t: TeacherRow) {
  return { name: t.user.name, email: t.user.email, password: "", employeeId: t.employeeId, subjectIds: t.subjects.map((s) => s.id) };
}

export function Teachers() {
  const { user } = useAuth();
  const isAdminOrPlatform = !!user && (user.role === "ADMIN" || PLATFORM_ROLES.includes(user.role));

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadTeachers() {
    api.get("/teachers").then((res) => setTeachers(res.data));
  }

  useEffect(() => {
    loadTeachers();
    api.get("/subjects").then((res) => setSubjects(res.data));
  }, []);

  function toggleSubject(id: string, target: "create" | "edit") {
    const setter = target === "create" ? setForm : setEditForm;
    setter((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(id)
        ? prev.subjectIds.filter((s) => s !== id)
        : [...prev.subjectIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/teachers", form);
      setForm(emptyForm);
      setShowForm(false);
      loadTeachers();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not add teacher"));
    }
  }

  function startEdit(t: TeacherRow) {
    setEditingId(t.id);
    setEditForm(teacherToEditForm(t));
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    try {
      await api.patch(`/teachers/${id}`, {
        name: editForm.name,
        email: editForm.email,
        employeeId: editForm.employeeId,
        subjectIds: editForm.subjectIds,
      });
      setEditingId(null);
      loadTeachers();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteTeacher(id: string) {
    setDeleteError(null);
    try {
      await api.delete(`/teachers/${id}`);
      setConfirmDeleteId(null);
      loadTeachers();
    } catch (err: any) {
      setDeleteError(extractErrorMessage(err, "Could not delete teacher"));
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Teachers</h1>
        {isAdminOrPlatform && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Teacher"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <input required placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Password (min 8 chars)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Employee ID" value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="sm:col-span-2">
            <p className="mb-1 text-sm font-medium text-slate-700">Subjects taught</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSubject(s.id, "create")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.subjectIds.includes(s.id)
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create Teacher
          </button>
        </form>
      )}

      {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Employee ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Subjects</th>
              <th className="px-4 py-2">Class Teacher Of</th>
              {isAdminOrPlatform && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map((t) => (
              <Fragment key={t.id}>
                <tr>
                  <td className="px-4 py-2">{t.employeeId}</td>
                  <td className="px-4 py-2">{t.user.name}</td>
                  <td className="px-4 py-2 text-slate-500">{t.user.email}</td>
                  <td className="px-4 py-2">{t.subjects.map((s) => s.name).join(", ") || "—"}</td>
                  <td className="px-4 py-2">
                    {t.classesLed.map((s) => `${s.class.name} - ${s.name}`).join(", ") || "—"}
                  </td>
                  {isAdminOrPlatform && (
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => startEdit(t)} className="text-xs text-indigo-600 hover:underline">
                        Edit
                      </button>
                      {confirmDeleteId === t.id ? (
                        <>
                          <button onClick={() => deleteTeacher(t.id)} className="text-xs text-red-600 hover:underline">
                            Confirm?
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:underline">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(t.id)} className="text-xs text-red-500 hover:underline">
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {editingId === t.id && (
                  <tr>
                    <td colSpan={6} className="bg-indigo-50 px-4 py-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {editError && <p className="sm:col-span-2 text-sm text-red-600">{editError}</p>}
                        <input placeholder="Full name" value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input type="email" placeholder="Email" value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Employee ID" value={editForm.employeeId}
                          onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <div className="sm:col-span-2 flex flex-wrap gap-2">
                          {subjects.map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => toggleSubject(s.id, "edit")}
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                editForm.subjectIds.includes(s.id)
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                        <div className="sm:col-span-2 flex gap-2">
                          <button onClick={() => saveEdit(t.id)} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No teachers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
