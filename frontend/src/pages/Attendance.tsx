import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

interface ClassRow {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface StudentRow {
  id: string;
  admissionNo: string;
  user: { name: string };
}

export function Attendance() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(res.data));
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    api.get("/students", { params: { classId, sectionId: sectionId || undefined } }).then((res) => {
      setStudents(res.data);
      setPresent(new Set());
      setSubmitted(false);
    });
  }, [classId, sectionId]);

  useEffect(() => {
    setSubmitted(false);
  }, [date]);

  function toggle(studentId: string) {
    if (submitted) return;
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  const presentCount = present.size;
  const absentCount = students.length - presentCount;

  const roster = useMemo(
    () => students.map((s, idx) => ({ ...s, roll: idx + 1 })),
    [students]
  );

  async function submit() {
    setSubmitting(true);
    try {
      await api.post("/attendance", {
        date: new Date(date).toISOString(),
        entries: students.map((s) => ({
          studentId: s.id,
          status: present.has(s.id) ? "PRESENT" : "ABSENT",
        })),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Attendance</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!selectedClass}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50">
          <option value="">All sections</option>
          {selectedClass?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {roster.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-800">{roster.length}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-600">{presentCount}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Present</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-semibold text-red-500">{absentCount}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Absent</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {submitted ? (
                <>
                  <span className="text-sm font-medium text-green-600">Attendance submitted</span>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                </>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit Attendance"}
                </button>
              )}
            </div>
          </div>

          {!submitted ? (
            <>
              <p className="mb-3 text-xs text-slate-400">
                Tap a student's roll number to mark them present. Untapped students are marked absent.
              </p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                {roster.map((s) => {
                  const isPresent = present.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`flex flex-col items-center rounded-xl border-2 p-3 transition ${
                        isPresent
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className={`text-xl font-bold ${isPresent ? "text-green-600" : "text-slate-700"}`}>
                        {s.roll}
                      </span>
                      <span className="mt-1 line-clamp-1 text-center text-[11px] text-slate-500">
                        {s.user.name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <h2 className="mb-2 text-sm font-semibold text-green-700">Present ({presentCount})</h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  {roster.filter((s) => present.has(s.id)).map((s) => (
                    <li key={s.id}>#{s.roll} — {s.user.name}</li>
                  ))}
                  {presentCount === 0 && <li className="text-slate-400">No one marked present</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h2 className="mb-2 text-sm font-semibold text-red-700">Absent ({absentCount})</h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  {roster.filter((s) => !present.has(s.id)).map((s) => (
                    <li key={s.id}>#{s.roll} — {s.user.name}</li>
                  ))}
                  {absentCount === 0 && <li className="text-slate-400">Everyone is present</li>}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {classId && roster.length === 0 && (
        <p className="text-sm text-slate-400">No students found for this selection.</p>
      )}
    </div>
  );
}
