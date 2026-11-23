import express from "express";
import {
  getAdminAnalytics,
  getAllStudents,
} from "../controllers/adminController.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/analytics", getAdminAnalytics);
router.get("/students", getAllStudents);

export default router;

