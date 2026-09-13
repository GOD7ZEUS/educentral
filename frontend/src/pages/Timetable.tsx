import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";
import { ExportButton } from "../components/ExportButton";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ClassRow {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SubjectRow {
  id: string;
  name: string;
}

interface TeacherRow {
  id: string;
  user: { name: string };
}

interface EntryRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { name: string };
  teacher: { id: string; user: { name: string } };
  class: { name: string };
  section: { name: string };
}

function groupByDay(entries: EntryRow[]) {
  const grouped = new Map<number, EntryRow[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.dayOfWeek) ?? [];
    list.push(entry);
    grouped.set(entry.dayOfWeek, list);
  }
  return grouped;
}

export function Timetable() {
  const { user } = useAuth();
  const isAdmin = !!user && (user.role === "ADMIN" || PLATFORM_ROLES.includes(user.role));

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [myEntries, setMyEntries] = useState<EntryRow[]>([]);

  const [form, setForm] = useState({
    subjectId: "",
    teacherId: "",
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "09:45",
  });

  const selectedClass = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (isAdmin) {
      api.get("/classes").then((res) => setClasses(res.data));
      api.get("/subjects").then((res) => setSubjects(res.data));
      api.get("/teachers").then((res) => setTeachers(res.data));
    } else {
      api.get("/timetable/me").then((res) => setMyEntries(res.data));
    }
  }, [isAdmin]);

  function loadEntries() {
    if (!classId) return;
    api
      .get("/timetable", { params: { classId, sectionId: sectionId || undefined } })
      .then((res) => setEntries(res.data));
  }

  useEffect(loadEntries, [classId, sectionId]);

  async function addEntry(e: FormEvent) {
    e.preventDefault();
    if (!sectionId) return;
    await api.post("/timetable", {
      classId,
      sectionId,
      subjectId: form.subjectId,
      teacherId: form.teacherId,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
    });
    loadEntries();
  }

  async function removeEntry(id: string) {
    await api.delete(`/timetable/${id}`);
    loadEntries();
  }

  if (!isAdmin) {
    const grouped = groupByDay(myEntries);
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-800">My Routine</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DAY_NAMES.map((day, idx) => {
            const dayEntries = grouped.get(idx) ?? [];
            if (dayEntries.length === 0) return null;
            return (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-2 font-semibold text-slate-700">{day}</h2>
                <ul className="space-y-1 text-sm text-slate-600">
                  {dayEntries.map((e) => (
                    <li key={e.id} className="border-t border-slate-100 pt-1 first:border-0 first:pt-0">
                      <span className="font-medium">{e.startTime}–{e.endTime}</span> {e.subject.name}
                      <br />
                      <span className="text-xs text-slate-400">
                        {e.teacher.user.name} · {e.class.name} {e.section.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {myEntries.length === 0 && (
            <p className="text-sm text-slate-400">No routine has been set up yet.</p>
          )}
        </div>
      </div>
    );
  }

  const filteredEntries = teacherFilter ? entries.filter((e) => e.teacher.id === teacherFilter) : entries;
  const grouped = groupByDay(filteredEntries);

  const exportRows = filteredEntries.map((e) => ({
    Day: DAY_NAMES[e.dayOfWeek],
    "Start Time": e.startTime,
    "End Time": e.endTime,
    Class: e.class.name,
    Section: e.section.name,
    Subject: e.subject.name,
    Teacher: e.teacher.user.name,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Routine / Timetable</h1>
        <ExportButton filename="timetable" rows={exportRows} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!selectedClass}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50">
          <option value="">Select section</option>
          {selectedClass?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Teachers</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
        </select>
      </div>

      {sectionId && (
        <>
          <form onSubmit={addEntry} className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5">
            <select required value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {DAY_NAMES.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
            </select>
            <select required value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select required value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
            </select>
            <input required type="time" value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required type="time" value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button className="col-span-2 sm:col-span-5 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Add Period
            </button>
          </form>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DAY_NAMES.map((day, idx) => {
              const dayEntries = (grouped.get(idx) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 font-semibold text-slate-700">{day}</h2>
                  {dayEntries.length === 0 && <p className="text-xs text-slate-400">No periods</p>}
                  <ul className="space-y-1 text-sm text-slate-600">
                    {dayEntries.map((e) => (
                      <li key={e.id} className="flex items-start justify-between border-t border-slate-100 pt-1 first:border-0 first:pt-0">
                        <div>
                          <span className="font-medium">{e.startTime}–{e.endTime}</span> {e.subject.name}
                          <br />
                          <span className="text-xs text-slate-400">{e.teacher.user.name}</span>
                        </div>
                        <button onClick={() => removeEntry(e.id)} className="text-xs text-red-500 hover:underline">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
