import { Routes, Route } from "react-router-dom";
import { AuthProvider, type Role } from "./context/AuthContext";
import { SchoolProvider } from "./context/SchoolContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { Classes } from "./pages/Classes";
import { Attendance } from "./pages/Attendance";
import { Fees } from "./pages/Fees";
import { Exams } from "./pages/Exams";
import { Notices } from "./pages/Notices";
import { Teachers } from "./pages/Teachers";
import { Timetable } from "./pages/Timetable";
import { Schools } from "./pages/Schools";
import { SchoolDetail } from "./pages/SchoolDetail";
import { Users } from "./pages/Users";
import { Parents } from "./pages/Parents";

const SCHOOL_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN", "MASTER_ADMIN"];
const SCHOOL_TEACHER_ROLES: Role[] = ["ADMIN", "TEACHER", "SUPER_ADMIN", "MASTER_ADMIN"];
const SCHOOL_EVERYONE_ROLES: Role[] = ["ADMIN", "TEACHER", "STUDENT", "PARENT", "SUPER_ADMIN", "MASTER_ADMIN"];

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />

              <Route element={<ProtectedRoute roles={["SUPER_ADMIN", "MASTER_ADMIN"]} />}>
                <Route path="/schools" element={<Schools />} />
                <Route path="/schools/:id" element={<SchoolDetail />} />
                <Route path="/users" element={<Users />} />
              </Route>

              <Route element={<ProtectedRoute roles={SCHOOL_EVERYONE_ROLES} schoolScoped />}>
                <Route path="/notices" element={<Notices />} />
                <Route path="/timetable" element={<Timetable />} />
              </Route>

              <Route element={<ProtectedRoute roles={SCHOOL_TEACHER_ROLES} schoolScoped />}>
                <Route path="/students" element={<Students />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/exams" element={<Exams />} />
              </Route>

              <Route element={<ProtectedRoute roles={SCHOOL_ROLES} schoolScoped />}>
                <Route path="/classes" element={<Classes />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/parents" element={<Parents />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </SchoolProvider>
    </AuthProvider>
  );
}
