import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { classesRouter } from "./routes/classes.routes";
import { studentsRouter } from "./routes/students.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { feesRouter } from "./routes/fees.routes";
import { examsRouter } from "./routes/exams.routes";
import { subjectsRouter } from "./routes/subjects.routes";
import { noticesRouter } from "./routes/notices.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { teachersRouter } from "./routes/teachers.routes";
import { timetableRouter } from "./routes/timetable.routes";
import { schoolsRouter } from "./routes/schools.routes";
import { adminsRouter, superAdminsRouter } from "./routes/admins.routes";
import { usersRouter } from "./routes/users.routes";
import { parentsRouter } from "./routes/parents.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/classes", classesRouter);
app.use("/api/students", studentsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/fees", feesRouter);
app.use("/api/exams", examsRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/notices", noticesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/teachers", teachersRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/schools", schoolsRouter);
app.use("/api/admins", adminsRouter);
app.use("/api/super-admins", superAdminsRouter);
app.use("/api/users", usersRouter);
app.use("/api/parents", parentsRouter);

// Single-service deployment: this same process serves the built frontend
// (frontend/dist) alongside the API, so there's just one URL and no CORS
// wiring needed in production. Local dev instead uses the Vite dev server
// with its own proxy, so this only kicks in when the build actually exists.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && (err.name === "MulterError" || err.message.includes("images are allowed"))) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`EduCentral API listening on port ${PORT}`));
