import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";

interface TeacherRow {
  id: string;
  user: { name: string };
}

interface SectionRow {
  id: string;
  name: string;
  classTeacherId: string | null;
  classTeacher: TeacherRow | null;
}

interface ClassRow {
  id: string;
  name: string;
  sections: SectionRow[];
  _count: { students: number };
}

export function Classes() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameDraft, setClassNameDraft] = useState("");
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);

  function load() {
    api.get("/classes").then((res) => setClasses(res.data));
  }

  useEffect(() => {
    load();
    api.get("/teachers").then((res) => setTeachers(res.data));
  }, []);

  async function addClass(e: FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    await api.post("/classes", { name: newClassName.trim() });
    setNewClassName("");
    load();
  }

  async function addSection(classId: string) {
    const name = sectionInputs[classId]?.trim();
    if (!name) return;
    await api.post(`/classes/${classId}/sections`, { name });
    setSectionInputs((prev) => ({ ...prev, [classId]: "" }));
    load();
  }

  async function assignClassTeacher(classId: string, sectionId: string, teacherId: string) {
    await api.patch(`/classes/${classId}/sections/${sectionId}`, {
      classTeacherId: teacherId || null,
    });
    load();
  }

  async function saveClassName(classId: string) {
    setError(null);
    if (!classNameDraft.trim()) return;
    try {
      await api.patch(`/classes/${classId}`, { name: classNameDraft.trim() });
      setEditingClassId(null);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not rename class"));
    }
  }

  async function deleteClass(classId: string) {
    setError(null);
    try {
      await api.delete(`/classes/${classId}`);
      setConfirmDeleteClassId(null);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not delete class"));
      setConfirmDeleteClassId(null);
    }
  }

  async function saveSectionName(classId: string, sectionId: string) {
    setError(null);
    if (!sectionNameDraft.trim()) return;
    try {
      await api.patch(`/classes/${classId}/sections/${sectionId}`, { name: sectionNameDraft.trim() });
      setEditingSectionId(null);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not rename section"));
    }
  }

  async function deleteSection(classId: string, sectionId: string) {
    setError(null);
    try {
      await api.delete(`/classes/${classId}/sections/${sectionId}`);
      setConfirmDeleteSectionId(null);
      load();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not delete section"));
      setConfirmDeleteSectionId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Classes &amp; Sections</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={addClass} className="mb-6 flex gap-2">
        <input
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="New class name (e.g. Grade 6)"
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Add Class
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <div key={cls.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              {editingClassId === cls.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    value={classNameDraft}
                    onChange={(e) => setClassNameDraft(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button onClick={() => saveClassName(cls.id)} className="text-xs text-indigo-600 hover:underline">Save</button>
                  <button onClick={() => setEditingClassId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <h2 className="font-semibold text-slate-800">{cls.name}</h2>
                  <span className="text-xs text-slate-400">{cls._count.students} students</span>
                </>
              )}
            </div>

            {editingClassId !== cls.id && (
              <div className="mb-3 flex gap-3 text-xs">
                <button
                  onClick={() => { setEditingClassId(cls.id); setClassNameDraft(cls.name); }}
                  className="text-indigo-600 hover:underline"
                >
                  Rename class
                </button>
                {confirmDeleteClassId === cls.id ? (
                  <>
                    <button onClick={() => deleteClass(cls.id)} className="text-red-600 hover:underline">Confirm delete?</button>
                    <button onClick={() => setConfirmDeleteClassId(null)} className="text-slate-400 hover:underline">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDeleteClassId(cls.id)} className="text-red-500 hover:underline">Delete class</button>
                )}
              </div>
            )}

            <div className="mb-3 space-y-2">
              {cls.sections.map((s) => (
                <div key={s.id} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    {editingSectionId === s.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          value={sectionNameDraft}
                          onChange={(e) => setSectionNameDraft(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button onClick={() => saveSectionName(cls.id, s.id)} className="text-xs text-indigo-600 hover:underline">Save</button>
                        <button onClick={() => setEditingSectionId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700">Section {s.name}</span>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => { setEditingSectionId(s.id); setSectionNameDraft(s.name); }}
                            className="text-indigo-600 hover:underline"
                          >
                            Rename
                          </button>
                          {confirmDeleteSectionId === s.id ? (
                            <>
                              <button onClick={() => deleteSection(cls.id, s.id)} className="text-red-600 hover:underline">Confirm?</button>
                              <button onClick={() => setConfirmDeleteSectionId(null)} className="text-slate-400 hover:underline">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteSectionId(s.id)} className="text-red-500 hover:underline">Delete</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <select
                    value={s.classTeacherId ?? ""}
                    onChange={(e) => assignClassTeacher(cls.id, s.id, e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">No class teacher assigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.user.name}</option>
                    ))}
                  </select>
                </div>
              ))}
              {cls.sections.length === 0 && (
                <span className="text-xs text-slate-400">No sections yet</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={sectionInputs[cls.id] ?? ""}
                onChange={(e) =>
                  setSectionInputs((prev) => ({ ...prev, [cls.id]: e.target.value }))
                }
                placeholder="Section name (e.g. B)"
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => addSection(cls.id)}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
