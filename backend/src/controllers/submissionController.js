
import pool from "../config/db.js";

// 1. Confirm assignment submission for a group
export const confirmSubmission = async (req, res) => {
  const { assignmentId } = req.params;
  const { group_id } = req.body;
  const userId = req.user.id;

  if (!Number.isInteger(Number(assignmentId)) ||
      Number(assignmentId) <= 0 ||
      !Number.isInteger(Number(group_id)) ||
      Number(group_id) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid assignment ID and group ID are required",
    });
  }

  try {
    // Check whether the student belongs to this group
    const membership = await pool.query(
      `SELECT id FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [Number(group_id), userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Check whether the assignment is available to this group
    const assignment = await pool.query(
      `SELECT a.id
       FROM assignments a
       LEFT JOIN assignment_groups ag
         ON ag.assignment_id = a.id AND ag.group_id = $2
       WHERE a.id = $1
         AND (a.target_all_students = TRUE OR ag.group_id IS NOT NULL)`,
      [Number(assignmentId), Number(group_id)]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or not assigned to this group",
      });
    }

    // Save the group's submission confirmation
    const result = await pool.query(
      `INSERT INTO submissions
       (assignment_id, group_id, confirmed_by, status)
       VALUES ($1, $2, $3, 'submitted')
       ON CONFLICT (assignment_id, group_id) DO NOTHING
       RETURNING *`,
      [Number(assignmentId), Number(group_id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "This group has already confirmed submission",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Assignment submission confirmed successfully",
      submission: result.rows[0],
    });
  } catch (error) {
    console.error("Confirm submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm assignment submission",
    });
  }
};

// 2. Get submission status for the student's groups
export const getMySubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          s.id,
          s.assignment_id,
          a.title AS assignment_title,
          s.group_id,
          g.group_name,
          s.confirmed_by,
          s.confirmed_at,
          s.status
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN groups g ON g.id = s.group_id
       JOIN group_members gm ON gm.group_id = s.group_id
       WHERE gm.user_id = $1
       ORDER BY s.confirmed_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      submissions: result.rows,
    });
  } catch (error) {
    console.error("Get submissions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve submissions",
    });
  }
};

// 3. Admin: View submissions for an assignment
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          s.*,
          a.title AS assignment_title,
          g.group_name,
          u.name AS confirmed_by_name
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN groups g ON g.id = s.group_id
       LEFT JOIN users u ON u.id = s.confirmed_by
       WHERE a.created_by = $1 AND a.id = $2
       ORDER BY s.confirmed_at DESC`,
      [req.user.id, Number(req.params.assignmentId)]
    );

    return res.status(200).json({
      success: true,
      submissions: result.rows,
    });
  } catch (error) {
    console.error("Get assignment submissions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignment submissions",
    });
  }
};
