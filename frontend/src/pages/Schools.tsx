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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", websiteUrl: "" });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(school: SchoolRow) {
    setEditingId(school.id);
    setEditDraft({ name: school.name, websiteUrl: school.websiteUrl ?? "" });
    setEditLogoFile(null);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(school: SchoolRow) {
    setEditError(null);
    try {
      const data = new FormData();
      data.append("name", editDraft.name);
      data.append("websiteUrl", editDraft.websiteUrl);
      if (editLogoFile) data.append("logo", editLogoFile);
      await api.patch(`/schools/${school.id}`, data);
      setEditingId(null);
      load();
    } catch (err: any) {
      setEditError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteSchool(school: SchoolRow) {
    if (!window.confirm(`Delete "${school.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/schools/${school.id}`);
      load();
    } catch (err: any) {
      window.alert(extractErrorMessage(err, "Could not delete school"));
    }
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
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <button className="sm:col-span-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Create School
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schools.map((school) =>
          editingId === school.id ? (
            <div key={school.id} className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">Edit school</p>
              {editError && <p className="mb-2 text-sm text-red-600">{editError}</p>}
              <div className="grid gap-2">
                <input placeholder="School name" value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Website URL (https://...)" value={editDraft.websiteUrl}
                  onChange={(e) => setEditDraft({ ...editDraft, websiteUrl: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(school)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    Save
                  </button>
                  <button onClick={cancelEdit}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    Cancel
                  </button>
                  <button onClick={() => deleteSchool(school)}
                    className="ml-auto rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                <div className="flex gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(school); }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(school); }}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    {school.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        {schools.length === 0 && (
          <p className="text-sm text-slate-400">No schools yet. Add your first one above.</p>
        )}
      </div>
    </div>
  );
}
