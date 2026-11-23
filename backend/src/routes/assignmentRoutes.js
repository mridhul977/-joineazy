
import express from "express";

import {
  createAssignment,
  getStudentAssignments,
  getAdminAssignments,
  updateAssignment,
} from "../controllers/assignmentController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin: Create an assignment
router.post("/", verifyToken, verifyAdmin, createAssignment);

// Admin: Update an existing assignment
router.put("/:assignmentId", verifyToken, verifyAdmin, updateAssignment);

// Student: View available assignments
router.get("/student", verifyToken, getStudentAssignments);

// Admin: View assignments created by the admin
router.get("/admin", verifyToken, verifyAdmin, getAdminAssignments);

export default router;
