import express from "express";
import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  getGroupMembers,
  addMember,
  getAllGroups,
} from "../controllers/groupController.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Student: create group & view personal groups
router.post("/", verifyToken, createGroup);
router.get("/my-groups", verifyToken, getMyGroups);

// Admin: View all groups
router.get("/all", verifyToken, verifyAdmin, getAllGroups);

// Group details & members (member or admin)
router.get("/:groupId", verifyToken, getGroupDetails);
router.get("/:groupId/members", verifyToken, getGroupMembers);

// Add member by email (group leader or admin)
router.post("/:groupId/members", verifyToken, addMember);

export default router;
