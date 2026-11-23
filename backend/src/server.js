
import submissionRoutes from "./routes/submissionRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
}));

app.use(express.json());
// Authentication routes
app.use("/api/auth", authRoutes);
// Group management routes
app.use("/api/groups", groupRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Joineazy API",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "Backend connected to PostgreSQL successfully!",
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});




const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Joineazy server running on port ${PORT}`);
});
