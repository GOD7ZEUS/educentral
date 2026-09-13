import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { toIsoDob } from "../utils/dob";

interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  _count: { students: number; teachers: number; classes: number };
}

interface ClassRow {
  id: string;
  name: string;
  sections: { id: string; name: string; classTeacher: { user: { name: string } } | null }[];
  _count: { students: number };
}

interface TeacherRow {
  id: string;
  employeeId: string;
  user: { name: string; email: string };
  subjects: { name: string }[];
}

interface StudentRow {
  id: string;
  admissionNo: string;
  user: { name: string; email: string };
  class: { name: string } | null;
  section: { name: string } | null;
}

interface AdminRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

const emptyAdminForm = { firstName: "", lastName: "", email: "", password: "", dob: "" };

export function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  function loadAdmins() {
    if (!id) return;
    api.get(`/schools/${id}/admins`).then((res) => setAdmins(res.data));
  }

  useEffect(() => {
    if (!id) return;
    api.get(`/schools/${id}`).then((res) => setSchool(res.data));
    api.get("/classes", { params: { schoolId: id } }).then((res) => setClasses(res.data));
    api.get("/teachers", { params: { schoolId: id } }).then((res) => setTeachers(res.data));
    api.get("/students", { params: { schoolId: id } }).then((res) => setStudents(res.data));
    loadAdmins();
  }, [id]);

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminError(null);
    try {
      await api.post(`/schools/${id}/admins`, { ...adminForm, dob: toIsoDob(adminForm.dob) });
      setAdminForm(emptyAdminForm);
      setShowAdminForm(false);
      loadAdmins();
    } catch (err: any) {
      setAdminError(extractErrorMessage(err, "Could not add admin"));
    }
  }

  async function toggleAdminActive(admin: AdminRow) {
    await api.patch(`/schools/${id}/admins/${admin.id}`, { isActive: !admin.isActive });
    loadAdmins();
  }

  if (!school) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <Link to="/schools" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
        ← Back to Schools
      </Link>

      <div className="mb-6 flex items-center gap-4">
        {school.logoUrl ? (
          <img src={school.logoUrl} alt={school.name} className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-100 text-xl font-semibold text-indigo-600">
            {school.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{school.name}</h1>
          <p className="text-sm text-slate-500">
            Code: {school.code}
            {school.websiteUrl && (
              <>
                {" · "}
                <a href={school.websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  {school.websiteUrl}
                </a>
              </>
            )}
          </p>
        </div>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${school.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {school.isActive ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Classes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{school._count.classes}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Teachers</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{school._count.teachers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Students</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{school._count.students}</p>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-700">Admins ({admins.length})</h2>
          <button
            onClick={() => setShowAdminForm((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {showAdminForm ? "Cancel" : "Add Admin"}
          </button>
        </div>

        {showAdminForm && (
          <form onSubmit={addAdmin} className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-3">
            {adminError && <p className="sm:col-span-3 text-sm text-red-600">{adminError}</p>}
            <input required placeholder="First name" value={adminForm.firstName}
              onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required placeholder="Last name" value={adminForm.lastName}
              onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required type="email" placeholder="Email" value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Date of birth
              <input type="date" value={adminForm.dob}
                onChange={(e) => setAdminForm({ ...adminForm, dob: e.target.value })}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800" />
            </label>
            <input required type="password" placeholder="Password (min 8 chars)" value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
            <button className="sm:col-span-3 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Create Admin
            </button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2">{a.name}</td>
                <td className="px-4 py-2 text-slate-500">{a.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {a.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleAdminActive(a)} className="text-xs text-slate-500 hover:underline">
                    {a.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No admins yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Classes &amp; Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400">{c._count.students} students</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.sections.map((s) => (
                  <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {s.name}{s.classTeacher ? ` · ${s.classTeacher.user.name}` : ""}
                  </span>
                ))}
                {c.sections.length === 0 && <span className="text-xs text-slate-400">No sections</span>}
              </div>
            </div>
          ))}
          {classes.length === 0 && <p className="text-sm text-slate-400">No classes yet.</p>}
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Teachers</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Employee ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Subjects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2">{t.employeeId}</td>
                <td className="px-4 py-2">{t.user.name}</td>
                <td className="px-4 py-2 text-slate-500">{t.user.email}</td>
                <td className="px-4 py-2">{t.subjects.map((s) => s.name).join(", ") || "—"}</td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No teachers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Students</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Admission No.</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Section</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">{s.admissionNo}</td>
                <td className="px-4 py-2">{s.user.name}</td>
                <td className="px-4 py-2 text-slate-500">{s.user.email}</td>
                <td className="px-4 py-2">{s.class?.name ?? "—"}</td>
                <td className="px-4 py-2">{s.section?.name ?? "—"}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No students yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
