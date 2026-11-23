
import express from "express";

import {
  confirmSubmission,
  getMySubmissions,
  getAssignmentSubmissions,
} from "../controllers/submissionController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Student: Confirm group assignment submission
router.post(
  "/:assignmentId/confirm",
  verifyToken,
  confirmSubmission
);

// Student: View submissions for their groups
router.get(
  "/my-submissions",
  verifyToken,
  getMySubmissions
);

// Admin: View submissions for a specific assignment
router.get(
  "/:assignmentId",
  verifyToken,
  verifyAdmin,
  getAssignmentSubmissions
);

export default router;
