import { Fragment, type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { toIsoDob } from "../utils/dob";

interface StudentRow {
  id: string;
  admissionNo: string;
  user: { name: string };
}

interface ParentRow {
  id: string;
  user: { name: string; email: string };
  students: { id: string; admissionNo: string; user: { name: string } }[];
}

const emptyForm = { firstName: "", lastName: "", email: "", password: "", dob: "", studentId: "" };

export function Parents() {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadParents() {
    api.get("/parents").then((res) => setParents(res.data));
  }

  useEffect(() => {
    loadParents();
    api.get("/students").then((res) => setStudents(res.data));
  }, []);

  const unlinkedStudentIds = new Set(parents.flatMap((p) => p.students.map((s) => s.id)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/parents", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        dob: toIsoDob(form.dob),
        studentId: form.studentId || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadParents();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not add guardian"));
    }
  }

  function startEdit(p: ParentRow) {
    setEditingId(p.id);
    setEditForm({ name: p.user.name, email: p.user.email });
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    try {
      await api.patch(`/parents/${id}`, editForm);
      setEditingId(null);
      loadParents();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteParent(id: string) {
    await api.delete(`/parents/${id}`);
    setConfirmDeleteId(null);
    loadParents();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Parents / Guardians</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Add Guardian"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <input required placeholder="First name" value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Last name" value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Date of birth
            <input type="date" value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </label>
          <input required type="password" placeholder="Password (min 8 chars)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Link to student (optional)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.admissionNo} — {s.user.name}{unlinkedStudentIds.has(s.id) ? " (already linked)" : ""}
              </option>
            ))}
          </select>
          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create Guardian
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Children</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parents.map((p) => (
              <Fragment key={p.id}>
                <tr>
                  <td className="px-4 py-2">{p.user.name}</td>
                  <td className="px-4 py-2 text-slate-500">{p.user.email}</td>
                  <td className="px-4 py-2">
                    {p.students.length > 0
                      ? p.students.map((s) => `${s.admissionNo} — ${s.user.name}`).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    {confirmDeleteId === p.id ? (
                      <>
                        <button onClick={() => deleteParent(p.id)} className="text-xs text-red-600 hover:underline">Confirm?</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    )}
                  </td>
                </tr>
                {editingId === p.id && (
                  <tr>
                    <td colSpan={4} className="bg-indigo-50 px-4 py-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {editError && <p className="sm:col-span-2 text-sm text-red-600">{editError}</p>}
                        <input placeholder="Full name" value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input type="email" placeholder="Email" value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <div className="sm:col-span-2 flex gap-2">
                          <button onClick={() => saveEdit(p.id)} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
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
            {parents.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No guardians yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
