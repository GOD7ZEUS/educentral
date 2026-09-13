import { Fragment, type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";

interface ClassRow {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface StudentRow {
  id: string;
  admissionNo: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  address: string | null;
  fatherName: string | null;
  fatherPhone: string | null;
  fatherOccupation: string | null;
  fatherQualification: string | null;
  motherName: string | null;
  motherPhone: string | null;
  motherOccupation: string | null;
  motherQualification: string | null;
  transportMode: string | null;
  user: { name: string; email: string };
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
}

const TRANSPORT_MODES = [
  { value: "SCHOOL_BUS", label: "School Bus" },
  { value: "PRIVATE_VEHICLE", label: "Private Vehicle" },
  { value: "PUBLIC_TRANSPORT", label: "Public Transport" },
  { value: "BICYCLE", label: "Bicycle" },
  { value: "WALKING", label: "Walking" },
  { value: "OTHER", label: "Other" },
];

function transportLabel(mode: string | null) {
  return TRANSPORT_MODES.find((m) => m.value === mode)?.label ?? "—";
}

const emptyForm = {
  name: "", email: "", password: "", admissionNo: "", classId: "", sectionId: "",
  dob: "", gender: "", bloodGroup: "", address: "",
  fatherName: "", fatherPhone: "", fatherOccupation: "", fatherQualification: "",
  motherName: "", motherPhone: "", motherOccupation: "", motherQualification: "",
  transportMode: "",
};

function studentToEditForm(s: StudentRow) {
  return {
    name: s.user.name,
    email: s.user.email,
    classId: s.class?.id ?? "",
    sectionId: s.section?.id ?? "",
    dob: s.dob ? s.dob.slice(0, 10) : "",
    gender: s.gender ?? "",
    bloodGroup: s.bloodGroup ?? "",
    address: s.address ?? "",
    fatherName: s.fatherName ?? "",
    fatherPhone: s.fatherPhone ?? "",
    fatherOccupation: s.fatherOccupation ?? "",
    fatherQualification: s.fatherQualification ?? "",
    motherName: s.motherName ?? "",
    motherPhone: s.motherPhone ?? "",
    motherOccupation: s.motherOccupation ?? "",
    motherQualification: s.motherQualification ?? "",
    transportMode: s.transportMode ?? "",
  };
}

export function Students() {
  const { user } = useAuth();
  const isAdminOrPlatform = !!user && (user.role === "ADMIN" || PLATFORM_ROLES.includes(user.role));
  const isTeacher = user?.role === "TEACHER";
  const canCreate = isAdminOrPlatform || isTeacher;

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [myLedSectionIds, setMyLedSectionIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [showFamilyDetails, setShowFamilyDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(studentToEditForm({ user: { name: "", email: "" } } as StudentRow));
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadStudents() {
    api.get("/students").then((res) => setStudents(res.data));
  }

  useEffect(() => {
    loadStudents();
    api.get("/classes").then((res) => setClasses(res.data));
    if (isTeacher) {
      api.get("/teachers/me").then((res) => setMyLedSectionIds(new Set(res.data.sectionIds)));
    }
  }, [isTeacher]);

  const selectedClass = classes.find((c) => c.id === form.classId);
  const editSelectedClass = classes.find((c) => c.id === editForm.classId);

  function canEdit(s: StudentRow) {
    if (isAdminOrPlatform) return true;
    if (isTeacher && s.section) return myLedSectionIds.has(s.section.id);
    return false;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/students", {
        ...form,
        classId: form.classId || undefined,
        sectionId: form.sectionId || undefined,
        dob: form.dob ? new Date(form.dob).toISOString() : undefined,
        transportMode: form.transportMode || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadStudents();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not add student"));
    }
  }

  function startEdit(s: StudentRow) {
    setEditingId(s.id);
    setEditForm(studentToEditForm(s));
    setEditError(null);
    setExpandedId(null);
  }

  async function saveEdit(id: string) {
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        dob: editForm.dob ? new Date(editForm.dob).toISOString() : undefined,
        gender: editForm.gender || undefined,
        bloodGroup: editForm.bloodGroup || undefined,
        address: editForm.address || undefined,
        fatherName: editForm.fatherName || undefined,
        fatherPhone: editForm.fatherPhone || undefined,
        fatherOccupation: editForm.fatherOccupation || undefined,
        fatherQualification: editForm.fatherQualification || undefined,
        motherName: editForm.motherName || undefined,
        motherPhone: editForm.motherPhone || undefined,
        motherOccupation: editForm.motherOccupation || undefined,
        motherQualification: editForm.motherQualification || undefined,
        transportMode: editForm.transportMode || undefined,
      };
      if (isAdminOrPlatform) {
        payload.classId = editForm.classId || null;
        payload.sectionId = editForm.sectionId || null;
      }
      await api.patch(`/students/${id}`, payload);
      setEditingId(null);
      loadStudents();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteStudent(id: string) {
    await api.delete(`/students/${id}`);
    setConfirmDeleteId(null);
    loadStudents();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Students</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Student"}
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
          <input required placeholder="Admission No." value={form.admissionNo}
            onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "" })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select class (optional)</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.sectionId}
            onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
            disabled={!selectedClass}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50">
            <option value="">Select section (optional)</option>
            {selectedClass?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <button
            type="button"
            onClick={() => setShowFamilyDetails((v) => !v)}
            className="sm:col-span-2 text-left text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:underline"
          >
            {showFamilyDetails ? "Hide" : "Add"} date of birth, family &amp; transport details
          </button>

          {showFamilyDetails && (
            <>
              <label className="sm:col-span-2 -mb-2 text-xs text-slate-500">Date of birth</label>
              <input type="date" value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input placeholder="Blood group (e.g. O+)" value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.transportMode}
                onChange={(e) => setForm({ ...form, transportMode: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Mode of transport to school</option>
                {TRANSPORT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <textarea placeholder="Address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />

              <p className="sm:col-span-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Father's details</p>
              <input placeholder="Father's name" value={form.fatherName}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Father's phone number" value={form.fatherPhone}
                onChange={(e) => setForm({ ...form, fatherPhone: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Father's occupation" value={form.fatherOccupation}
                onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Father's qualification" value={form.fatherQualification}
                onChange={(e) => setForm({ ...form, fatherQualification: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

              <p className="sm:col-span-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Mother's details</p>
              <input placeholder="Mother's name" value={form.motherName}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Mother's phone number" value={form.motherPhone}
                onChange={(e) => setForm({ ...form, motherPhone: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Mother's occupation" value={form.motherOccupation}
                onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Mother's qualification" value={form.motherQualification}
                onChange={(e) => setForm({ ...form, motherQualification: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </>
          )}

          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create Student
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Admission No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="px-4 py-2">{s.admissionNo}</td>
                  <td className="px-4 py-2">{s.user.name}</td>
                  <td className="px-4 py-2 text-slate-500">{s.user.email}</td>
                  <td className="px-4 py-2">{s.class?.name ?? "—"}</td>
                  <td className="px-4 py-2">{s.section?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {expandedId === s.id ? "Hide details" : "View details"}
                    </button>
                    {canEdit(s) && (
                      <button onClick={() => startEdit(s)} className="text-xs text-indigo-600 hover:underline">
                        Edit
                      </button>
                    )}
                    {isAdminOrPlatform && (
                      confirmDeleteId === s.id ? (
                        <>
                          <button onClick={() => deleteStudent(s.id)} className="text-xs text-red-600 hover:underline">
                            Confirm?
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-400 hover:underline">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-xs text-red-500 hover:underline">
                          Delete
                        </button>
                      )
                    )}
                  </td>
                </tr>
                {expandedId === s.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
                        <div><span className="text-slate-400">DOB:</span> {s.dob ? new Date(s.dob).toLocaleDateString() : "—"}</div>
                        <div><span className="text-slate-400">Gender:</span> {s.gender ?? "—"}</div>
                        <div><span className="text-slate-400">Blood group:</span> {s.bloodGroup ?? "—"}</div>
                        <div><span className="text-slate-400">Transport:</span> {transportLabel(s.transportMode)}</div>
                        <div className="col-span-2 sm:col-span-4"><span className="text-slate-400">Address:</span> {s.address ?? "—"}</div>
                        <div><span className="text-slate-400">Father:</span> {s.fatherName ?? "—"}</div>
                        <div><span className="text-slate-400">Father's phone:</span> {s.fatherPhone ?? "—"}</div>
                        <div><span className="text-slate-400">Father's occupation:</span> {s.fatherOccupation ?? "—"}</div>
                        <div><span className="text-slate-400">Father's qualification:</span> {s.fatherQualification ?? "—"}</div>
                        <div><span className="text-slate-400">Mother:</span> {s.motherName ?? "—"}</div>
                        <div><span className="text-slate-400">Mother's phone:</span> {s.motherPhone ?? "—"}</div>
                        <div><span className="text-slate-400">Mother's occupation:</span> {s.motherOccupation ?? "—"}</div>
                        <div><span className="text-slate-400">Mother's qualification:</span> {s.motherQualification ?? "—"}</div>
                      </div>
                    </td>
                  </tr>
                )}
                {editingId === s.id && (
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
                        {isAdminOrPlatform && (
                          <>
                            <select value={editForm.classId}
                              onChange={(e) => setEditForm({ ...editForm, classId: e.target.value, sectionId: "" })}
                              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                              <option value="">No class</option>
                              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={editForm.sectionId}
                              onChange={(e) => setEditForm({ ...editForm, sectionId: e.target.value })}
                              disabled={!editSelectedClass}
                              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100">
                              <option value="">No section</option>
                              {editSelectedClass?.sections.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                            </select>
                          </>
                        )}
                        <input type="date" value={editForm.dob}
                          onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <select value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <input placeholder="Blood group" value={editForm.bloodGroup}
                          onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <select value={editForm.transportMode}
                          onChange={(e) => setEditForm({ ...editForm, transportMode: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">Mode of transport</option>
                          {TRANSPORT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <textarea placeholder="Address" value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          rows={2}
                          className="sm:col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Father's name" value={editForm.fatherName}
                          onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Father's phone" value={editForm.fatherPhone}
                          onChange={(e) => setEditForm({ ...editForm, fatherPhone: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Father's occupation" value={editForm.fatherOccupation}
                          onChange={(e) => setEditForm({ ...editForm, fatherOccupation: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Father's qualification" value={editForm.fatherQualification}
                          onChange={(e) => setEditForm({ ...editForm, fatherQualification: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Mother's name" value={editForm.motherName}
                          onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Mother's phone" value={editForm.motherPhone}
                          onChange={(e) => setEditForm({ ...editForm, motherPhone: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Mother's occupation" value={editForm.motherOccupation}
                          onChange={(e) => setEditForm({ ...editForm, motherOccupation: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input placeholder="Mother's qualification" value={editForm.motherQualification}
                          onChange={(e) => setEditForm({ ...editForm, motherQualification: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <div className="sm:col-span-2 flex gap-2">
                          <button onClick={() => saveEdit(s.id)} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
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
            {students.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No students yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
