import express from "express";
import {
  createAssignment,
  getStudentAssignments,
  getAdminAssignments,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignmentController.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Student: View available assignments
router.get("/student", verifyToken, getStudentAssignments);

// Admin: View assignments
router.get("/admin", verifyToken, verifyAdmin, getAdminAssignments);

// Admin: Create an assignment
router.post("/", verifyToken, verifyAdmin, createAssignment);

// Admin: Update an existing assignment
router.put("/:assignmentId", verifyToken, verifyAdmin, updateAssignment);

// Admin: Delete assignment safely (only when no student submissions exist)
router.delete("/:assignmentId", verifyToken, verifyAdmin, deleteAssignment);

export default router;
