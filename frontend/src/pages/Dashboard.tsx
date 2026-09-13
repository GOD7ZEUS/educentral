import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PLATFORM_ROLES, useAuth } from "../context/AuthContext";
import { useSchoolContext } from "../context/SchoolContext";

interface SchoolSummary {
  platform: false;
  studentCount: number;
  teacherCount: number;
  classCount: number;
  noticeCount: number;
  totalFeesCollected: number;
  todayAttendance: { status: string; _count: number }[];
}

interface PlatformSummary {
  platform: true;
  schoolCount: number;
  activeSchoolCount: number;
  studentCount: number;
  teacherCount: number;
}

type Summary = SchoolSummary | PlatformSummary;

interface SchoolOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

export function Dashboard() {
  const { user } = useAuth();
  const { activeSchool, setActiveSchool, clearActiveSchool } = useSchoolContext();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const isPlatformUser = !!user && PLATFORM_ROLES.includes(user.role);

  useEffect(() => {
    if (isPlatformUser) {
      api.get("/schools").then((res) => setSchoolOptions(res.data));
    }
  }, [isPlatformUser]);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data));
  }, [activeSchool?.id]);

  function handleFilterChange(schoolId: string) {
    if (!schoolId) {
      clearActiveSchool();
      return;
    }
    const school = schoolOptions.find((s) => s.id === schoolId);
    if (school) setActiveSchool(school);
  }

  const cards = !summary
    ? []
    : summary.platform
    ? [
        { label: "Schools", value: summary.schoolCount },
        { label: "Active Schools", value: summary.activeSchoolCount },
        { label: "Students (all schools)", value: summary.studentCount },
        { label: "Teachers (all schools)", value: summary.teacherCount },
      ]
    : [
        { label: "Students", value: summary.studentCount },
        { label: "Teachers", value: summary.teacherCount },
        { label: "Classes", value: summary.classCount },
        { label: "Notices", value: summary.noticeCount },
        { label: "Fees Collected", value: `₹${summary.totalFeesCollected.toLocaleString()}` },
      ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-500">
            {summary?.platform
              ? "Here's how the platform is doing across all schools."
              : `Here's what's happening ${isPlatformUser ? `at ${activeSchool?.name}` : "at your school"} today.`}
          </p>
        </div>

        {isPlatformUser && (
          <select
            value={activeSchool?.id ?? ""}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Schools</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      {summary && !summary.platform && summary.todayAttendance.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Today's Attendance</h2>
          <div className="flex gap-4">
            {summary.todayAttendance.map((row) => (
              <div key={row.status} className="text-sm text-slate-600">
                <span className="font-medium">{row.status}</span>: {row._count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
