import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

const BASE_URL = process.env.CANVAS_BASE_URL;
const TOKEN = process.env.CANVAS_TOKEN;

if (!BASE_URL || !TOKEN) {
  console.error("Missing CANVAS_BASE_URL or CANVAS_TOKEN. Did you create a .env file from .env.example?");
  process.exit(1);
}

// Serves the front-end (public/index.html and friends)
app.use(express.static("public"));

// The front-end calls THIS endpoint (same origin, no CORS problem).
// This server then calls the real Canvas API on your behalf.
app.get("/api/assignments", async (req, res) => {
  const headers = { Authorization: `Bearer ${TOKEN}` };

  try {
    // 1. Get your active courses
    const coursesRes = await fetch(
      `${BASE_URL}/api/v1/courses?enrollment_state=active&per_page=100`,
      { headers }
    );
    if (!coursesRes.ok) {
      throw new Error(`Canvas rejected the courses request (status ${coursesRes.status}). Check your token and base URL.`);
    }
    const courses = await coursesRes.json();

    // 2. For each course, get its assignments + your submission status for each
    const allAssignments = [];

    for (const course of courses) {
      const assignRes = await fetch(
        `${BASE_URL}/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`,
        { headers }
      );
      if (!assignRes.ok) continue; // skip a course if Canvas errors on it

      const assignments = await assignRes.json();

      for (const a of assignments) {
        if (!a.due_at) continue; // skip assignments with no due date set

        const submission = a.submission;
        const done = !!submission && submission.workflow_state !== "unsubmitted";

        allAssignments.push({
          id: a.id,
          name: a.name,
          course: course.name,
          dueDate: a.due_at.split("T")[0], // keep just YYYY-MM-DD
          done
        });
      }
    }

    res.json(allAssignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running -- open http://localhost:${PORT} in your browser`);
});
