import pool from "../config/db.js";

// 1. Confirm assignment submission for a group
export const confirmSubmission = async (req, res) => {
  const { assignmentId } = req.params;
  const { group_id } = req.body;
  const userId = req.user.id;

  const parsedAssignmentId = parseInt(assignmentId, 10);
  const parsedGroupId = parseInt(group_id, 10);

  if (
    !Number.isInteger(parsedAssignmentId) ||
    parsedAssignmentId <= 0 ||
    !Number.isInteger(parsedGroupId) ||
    parsedGroupId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid assignment ID and group ID are required",
    });
  }

  try {
    // Check whether the student belongs to this group
    const membership = await pool.query(
      `SELECT id, member_role FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [parsedGroupId, userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Check whether the assignment is available to this group
    const assignment = await pool.query(
      `SELECT a.id, a.title, g.group_name
       FROM assignments a
       JOIN groups g ON g.id = $2
       LEFT JOIN assignment_groups ag
         ON ag.assignment_id = a.id AND ag.group_id = $2
       WHERE a.id = $1
         AND (a.target_all_students = TRUE OR ag.group_id IS NOT NULL)`,
      [parsedAssignmentId, parsedGroupId]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or not assigned to this group",
      });
    }

    const { title, group_name } = assignment.rows[0];

    // Check if already submitted
    const existing = await pool.query(
      "SELECT id, confirmed_at FROM submissions WHERE assignment_id = $1 AND group_id = $2",
      [parsedAssignmentId, parsedGroupId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Submission for "${title}" has already been confirmed for group "${group_name}"`,
      });
    }

    // Save the group's submission confirmation
    const result = await pool.query(
      `INSERT INTO submissions
       (assignment_id, group_id, confirmed_by, status)
       VALUES ($1, $2, $3, 'submitted')
       RETURNING *`,
      [parsedAssignmentId, parsedGroupId, userId]
    );

    return res.status(201).json({
      success: true,
      message: `Submission confirmed successfully for "${group_name}"!`,
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
          u.name AS confirmed_by_name,
          s.confirmed_at,
          s.status
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN groups g ON g.id = s.group_id
       LEFT JOIN users u ON u.id = s.confirmed_by
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

// 3. Admin: View group-wise submission status (both submitted and pending groups)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const parsedAssignmentId = parseInt(req.params.assignmentId, 10);
    if (!Number.isInteger(parsedAssignmentId) || parsedAssignmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    // Check assignment
    const assignmentResult = await pool.query(
      "SELECT id, title, target_all_students FROM assignments WHERE id = $1",
      [parsedAssignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const assignment = assignmentResult.rows[0];

    // Get all target groups with their submission status
    let query;
    let params;

    if (assignment.target_all_students) {
      query = `
        SELECT
          g.id AS group_id,
          g.group_name,
          s.id AS submission_id,
          s.confirmed_at,
          COALESCE(s.status, 'pending') AS status,
          s.confirmed_by,
          u.name AS confirmed_by_name,
          u.email AS confirmed_by_email
        FROM groups g
        LEFT JOIN submissions s
          ON s.group_id = g.id AND s.assignment_id = $1
        LEFT JOIN users u
          ON u.id = s.confirmed_by
        ORDER BY
          CASE WHEN s.status = 'submitted' THEN 0 ELSE 1 END,
          s.confirmed_at DESC,
          g.group_name ASC
      `;
      params = [parsedAssignmentId];
    } else {
      query = `
        SELECT
          g.id AS group_id,
          g.group_name,
          s.id AS submission_id,
          s.confirmed_at,
          COALESCE(s.status, 'pending') AS status,
          s.confirmed_by,
          u.name AS confirmed_by_name,
          u.email AS confirmed_by_email
        FROM assignment_groups ag
        JOIN groups g ON g.id = ag.group_id
        LEFT JOIN submissions s
          ON s.group_id = g.id AND s.assignment_id = $1
        LEFT JOIN users u
          ON u.id = s.confirmed_by
        WHERE ag.assignment_id = $1
        ORDER BY
          CASE WHEN s.status = 'submitted' THEN 0 ELSE 1 END,
          s.confirmed_at DESC,
          g.group_name ASC
      `;
      params = [parsedAssignmentId];
    }

    const result = await pool.query(query, params);

    const submittedGroups = result.rows.filter((r) => r.status === "submitted");
    const pendingGroups = result.rows.filter((r) => r.status === "pending");

    return res.status(200).json({
      success: true,
      assignment_id: assignment.id,
      assignment_title: assignment.title,
      total_target_groups: result.rows.length,
      submitted_count: submittedGroups.length,
      pending_count: pendingGroups.length,
      groups: result.rows,
      // Backwards-compatible submissions array
      submissions: submittedGroups.map((s) => ({
        ...s,
        id: s.submission_id,
        assignment_id: assignment.id,
        assignment_title: assignment.title,
      })),
    });
  } catch (error) {
    console.error("Get assignment submissions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignment submissions",
    });
  }
};
