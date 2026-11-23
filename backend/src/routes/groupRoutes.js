

import express from "express";

import {
  createGroup,
  getMyGroups,
  addMember,
  getAllGroups,
} from "../controllers/groupController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createGroup);
router.get("/my-groups", verifyToken, getMyGroups);
router.post("/:groupId/members", verifyToken, addMember);

// Admin: View all groups
router.get("/all", verifyToken, verifyAdmin, getAllGroups);

export default router;
