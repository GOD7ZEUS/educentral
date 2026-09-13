import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { useSchoolContext } from "../context/SchoolContext";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  _count: { students: number; teachers: number };
}

const emptyTextForm = {
  name: "",
  code: "",
  websiteUrl: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export function Schools() {
  const navigate = useNavigate();
  const { setActiveSchool } = useSchoolContext();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [form, setForm] = useState(emptyTextForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    api.get("/schools").then((res) => setSchools(res.data));
  }

  useEffect(load, []);

  function resetForm() {
    setForm(emptyTextForm);
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (logoFile) data.append("logo", logoFile);

      await api.post("/schools", data);
      resetForm();
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not add school"));
    }
  }

  async function toggleActive(school: SchoolRow) {
    await api.patch(`/schools/${school.id}`, { isActive: !school.isActive });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Schools</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "Add School"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-400">School details</p>
          <input required placeholder="School name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="School code (e.g. GREENWOOD)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <div className="flex items-center gap-3">
            {logoPreview && (
              <img src={logoPreview} alt="Logo preview" className="h-10 w-10 rounded-md object-cover" />
            )}
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs text-slate-500">School logo (JPG, PNG or WEBP)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs"
              />
            </label>
          </div>
          <input placeholder="Website URL (https://...)" value={form.websiteUrl}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <p className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">School's admin login</p>
          <input required placeholder="Admin full name" value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Admin email" value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="Admin password (min 8 chars)" value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create School
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schools.map((school) => (
          <div
            key={school.id}
            onClick={() => {
              setActiveSchool({ id: school.id, name: school.name, logoUrl: school.logoUrl });
              navigate(`/schools/${school.id}`);
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300"
          >
            <div className="mb-3 flex items-center gap-3">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt={school.name} className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-100 text-lg font-semibold text-indigo-600">
                  {school.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="font-semibold text-slate-800">{school.name}</h2>
                <p className="text-xs text-slate-400">Code: {school.code}</p>
                {school.websiteUrl && (
                  <a
                    href={school.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Visit website ↗
                  </a>
                )}
              </div>
            </div>
            <div className="mb-3 flex gap-4 text-xs text-slate-500">
              <span>{school._count.students} students</span>
              <span>{school._count.teachers} teachers</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${school.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {school.isActive ? "Active" : "Deactivated"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(school); }}
                className="text-xs text-slate-500 hover:underline"
              >
                {school.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        ))}
        {schools.length === 0 && (
          <p className="text-sm text-slate-400">No schools yet. Add your first one above.</p>
        )}
      </div>
    </div>
  );
}
