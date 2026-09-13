import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { extractErrorMessage } from "../api/errors";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";
import { ExportButton } from "../components/ExportButton";

interface ClassRow {
  id: string;
  name: string;
}

interface SubjectRow {
  id: string;
  name: string;
  code: string;
}

interface ExamRow {
  id: string;
  name: string;
  term: string;
  startDate: string;
  endDate: string;
  class: { name: string };
}

interface StudentRow {
  id: string;
  admissionNo: string;
  user: { name: string };
}

interface ResultRow {
  id: string;
  marksObtained: number;
  maxMarks: number;
  grade: string | null;
  student: { admissionNo: string; user: { name: string } };
  subject: { id: string; name: string };
}

export function Exams() {
  const { user } = useAuth();
  const isAdminOrPlatform = !!user && (user.role === "ADMIN" || PLATFORM_ROLES.includes(user.role));

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [examError, setExamError] = useState<string | null>(null);

  const [examForm, setExamForm] = useState({ name: "", classId: "", term: "", startDate: "", endDate: "" });
  const [resultForm, setResultForm] = useState({ studentId: "", subjectId: "", marksObtained: "", maxMarks: "100" });

  const [editingExam, setEditingExam] = useState(false);
  const [examEditForm, setExamEditForm] = useState({ name: "", term: "", startDate: "", endDate: "" });
  const [confirmDeleteExam, setConfirmDeleteExam] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");

  function loadExams() {
    api.get("/exams").then((res) => setExams(res.data));
  }

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(res.data));
    api.get("/subjects").then((res) => setSubjects(res.data));
    loadExams();
  }, []);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  useEffect(() => {
    if (!selectedExamId) {
      setResults([]);
      return;
    }
    api.get("/exams/" + selectedExamId + "/results").then((res) => setResults(res.data));
  }, [selectedExamId]);

  const filteredResults = useMemo(
    () => (subjectFilter ? results.filter((r) => r.subject.id === subjectFilter) : results),
    [results, subjectFilter]
  );

  const exportRows = useMemo(
    () =>
      filteredResults.map((r) => ({
        "Admission No": r.student.admissionNo,
        Student: r.student.user.name,
        Subject: r.subject.name,
        "Marks Obtained": r.marksObtained,
        "Max Marks": r.maxMarks,
        Grade: r.grade ?? "",
      })),
    [filteredResults]
  );

  useEffect(() => {
    if (!selectedExam) {
      setStudents([]);
      return;
    }
    const cls = classes.find((c) => c.name === selectedExam.class.name);
    if (cls) {
      api.get("/students", { params: { classId: cls.id } }).then((res) => setStudents(res.data));
    }
  }, [selectedExam, classes]);

  async function addExam(e: FormEvent) {
    e.preventDefault();
    await api.post("/exams", {
      name: examForm.name,
      classId: examForm.classId,
      term: examForm.term,
      startDate: new Date(examForm.startDate).toISOString(),
      endDate: new Date(examForm.endDate).toISOString(),
    });
    setExamForm({ name: "", classId: "", term: "", startDate: "", endDate: "" });
    loadExams();
  }

  function startEditExam() {
    if (!selectedExam) return;
    setExamEditForm({
      name: selectedExam.name,
      term: selectedExam.term,
      startDate: selectedExam.startDate.slice(0, 10),
      endDate: selectedExam.endDate.slice(0, 10),
    });
    setEditingExam(true);
    setExamError(null);
  }

  async function saveExamEdit() {
    if (!selectedExamId) return;
    setExamError(null);
    try {
      await api.patch(`/exams/${selectedExamId}`, {
        name: examEditForm.name,
        term: examEditForm.term,
        startDate: new Date(examEditForm.startDate).toISOString(),
        endDate: new Date(examEditForm.endDate).toISOString(),
      });
      setEditingExam(false);
      loadExams();
    } catch (err: any) {
      setExamError(extractErrorMessage(err, "Could not save changes"));
    }
  }

  async function deleteExam() {
    if (!selectedExamId) return;
    setExamError(null);
    try {
      await api.delete(`/exams/${selectedExamId}`);
      setSelectedExamId("");
      setConfirmDeleteExam(false);
      loadExams();
    } catch (err: any) {
      setExamError(extractErrorMessage(err, "Could not delete exam"));
      setConfirmDeleteExam(false);
    }
  }

  async function addResult(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return;
    await api.post(`/exams/${selectedExamId}/results`, {
      studentId: resultForm.studentId,
      subjectId: resultForm.subjectId,
      marksObtained: Number(resultForm.marksObtained),
      maxMarks: Number(resultForm.maxMarks),
    });
    setResultForm({ studentId: "", subjectId: "", marksObtained: "", maxMarks: "100" });
    api.get("/exams/" + selectedExamId + "/results").then((res) => setResults(res.data));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Exams &amp; Results</h1>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-700">Create Exam</h2>
        <form onSubmit={addExam} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input required placeholder="Exam name" value={examForm.name}
            onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <select required value={examForm.classId}
            onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Term" value={examForm.term}
            onChange={(e) => setExamForm({ ...examForm, term: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input required type="date" value={examForm.startDate}
              onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <input required type="date" value={examForm.endDate}
              onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </div>
          <button className="col-span-2 sm:col-span-4 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            Create Exam
          </button>
        </form>
      </div>

      {examError && <p className="mb-3 text-sm text-red-600">{examError}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={selectedExamId} onChange={(e) => { setSelectedExamId(e.target.value); setEditingExam(false); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select exam to enter results</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.name} — {e.class.name} ({e.term})</option>
          ))}
        </select>
        {selectedExamId && isAdminOrPlatform && (
          <>
            <button onClick={startEditExam} className="text-xs text-indigo-600 hover:underline">Edit exam</button>
            {confirmDeleteExam ? (
              <>
                <button onClick={deleteExam} className="text-xs text-red-600 hover:underline">Confirm delete?</button>
                <button onClick={() => setConfirmDeleteExam(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDeleteExam(true)} className="text-xs text-red-500 hover:underline">Delete exam</button>
            )}
          </>
        )}
      </div>

      {editingExam && selectedExam && (
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
          <input placeholder="Exam name" value={examEditForm.name}
            onChange={(e) => setExamEditForm({ ...examEditForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input placeholder="Term" value={examEditForm.term}
            onChange={(e) => setExamEditForm({ ...examEditForm, term: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input type="date" value={examEditForm.startDate}
            onChange={(e) => setExamEditForm({ ...examEditForm, startDate: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input type="date" value={examEditForm.endDate}
            onChange={(e) => setExamEditForm({ ...examEditForm, endDate: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="col-span-2 sm:col-span-4 flex gap-2">
            <button onClick={saveExamEdit} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Save
            </button>
            <button onClick={() => setEditingExam(false)} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedExamId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-700">Enter Result</h2>
            <form onSubmit={addResult} className="grid grid-cols-2 gap-2">
              <select required value={resultForm.studentId}
                onChange={(e) => setResultForm({ ...resultForm, studentId: e.target.value })}
                className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">Select student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.admissionNo} — {s.user.name}</option>)}
              </select>
              <select required value={resultForm.subjectId}
                onChange={(e) => setResultForm({ ...resultForm, subjectId: e.target.value })}
                className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">Select subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input required type="number" placeholder="Marks obtained" value={resultForm.marksObtained}
                onChange={(e) => setResultForm({ ...resultForm, marksObtained: e.target.value })}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <input required type="number" placeholder="Max marks" value={resultForm.maxMarks}
                onChange={(e) => setResultForm({ ...resultForm, maxMarks: e.target.value })}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <button className="col-span-2 rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                Save Result
              </button>
            </form>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">All Subjects</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ExportButton filename={`exam-results-${selectedExam?.name ?? ""}`} rows={exportRows} />
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{r.student.admissionNo} — {r.student.user.name}</td>
                      <td className="px-4 py-2">{r.subject.name}</td>
                      <td className="px-4 py-2">{r.marksObtained} / {r.maxMarks}</td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No results found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
