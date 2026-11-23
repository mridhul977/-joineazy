import pool from "../config/db.js";

// 1. Create a new assignment (Admin only)
export const createAssignment = async (req, res) => {
  const {
    title,
    description,
    onedrive_link,
    deadline,
    target_all_students,
    group_ids,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Assignment title is required",
    });
  }

  if (
    !target_all_students &&
    (!Array.isArray(group_ids) || group_ids.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Select at least one group or assign to all students",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `INSERT INTO assignments
       (title, description, onedrive_link, deadline, target_all_students, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : null,
        onedrive_link ? onedrive_link.trim() : null,
        deadline || null,
        Boolean(target_all_students),
        req.user.id,
      ]
    );

    const assignment = assignmentResult.rows[0];

    // Assign to selected groups when not targeting everyone
    if (!target_all_students) {
      const uniqueGroupIds = [...new Set(group_ids.map(Number))];

      for (const groupId of uniqueGroupIds) {
        if (!Number.isInteger(groupId) || groupId <= 0) {
          throw new Error("Invalid group ID");
        }

        await client.query(
          `INSERT INTO assignment_groups (assignment_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (assignment_id, group_id) DO NOTHING`,
          [assignment.id, groupId]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create assignment error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create assignment",
    });
  } finally {
    client.release();
  }
};

// 2. Get assignments available to the logged-in student
export const getStudentAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
          a.id,
          a.title,
          a.description,
          a.onedrive_link,
          a.deadline,
          a.target_all_students,
          a.created_at,
          gm.group_id,
          g.group_name,
          s.status AS submission_status,
          s.confirmed_at,
          u.name AS confirmed_by_name
       FROM assignments a
       JOIN group_members gm ON gm.user_id = $1
       JOIN groups g ON g.id = gm.group_id
       LEFT JOIN assignment_groups ag
          ON ag.assignment_id = a.id
          AND ag.group_id = gm.group_id
       LEFT JOIN submissions s
          ON s.assignment_id = a.id
          AND s.group_id = gm.group_id
       LEFT JOIN users u ON u.id = s.confirmed_by
       WHERE a.target_all_students = TRUE
          OR ag.group_id IS NOT NULL
       ORDER BY a.deadline ASC NULLS LAST, a.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      assignments: result.rows,
    });
  } catch (error) {
    console.error("Get student assignments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignments",
    });
  }
};

// 3. Get assignments created by the admin
export const getAdminAssignments = async (req, res) => {
  try {
    const totalGroupsResult = await pool.query("SELECT COUNT(*)::INTEGER AS total FROM groups");
    const totalGroups = totalGroupsResult.rows[0].total;

    const result = await pool.query(
      `SELECT
          a.*,
          COUNT(DISTINCT s.group_id)::INTEGER AS submitted_groups,
          COALESCE(
            ARRAY_AGG(DISTINCT ag.group_id)
              FILTER (WHERE ag.group_id IS NOT NULL),
            ARRAY[]::INTEGER[]
          ) AS group_ids
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id
       LEFT JOIN assignment_groups ag ON ag.assignment_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at DESC`
    );

    const assignmentsWithStats = result.rows.map((assignment) => {
      const targetCount = assignment.target_all_students
        ? totalGroups
        : assignment.group_ids.length;

      return {
        ...assignment,
        target_groups_count: targetCount,
      };
    });

    return res.status(200).json({
      success: true,
      assignments: assignmentsWithStats,
    });
  } catch (error) {
    console.error("Get admin assignments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve assignments",
    });
  }
};

// 4. Update an existing assignment (Admin only)
export const updateAssignment = async (req, res) => {
  const { assignmentId } = req.params;

  const {
    title,
    description,
    onedrive_link,
    deadline,
    target_all_students,
    group_ids,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Assignment title is required",
    });
  }

  if (
    !target_all_students &&
    (!Array.isArray(group_ids) || group_ids.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Select at least one group or assign to all students",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify assignment exists
    const existing = await client.query(
      "SELECT id FROM assignments WHERE id = $1",
      [assignmentId]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    const uniqueGroupIds = target_all_students
      ? []
      : [...new Set(group_ids.map(Number))];

    if (uniqueGroupIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    await client.query(
      `UPDATE assignments
       SET title = $1,
           description = $2,
           onedrive_link = $3,
           deadline = $4,
           target_all_students = $5
       WHERE id = $6`,
      [
        title.trim(),
        description ? description.trim() : null,
        onedrive_link ? onedrive_link.trim() : null,
        deadline || null,
        Boolean(target_all_students),
        assignmentId,
      ]
    );

    // Replace assignment's selected groups
    await client.query(
      "DELETE FROM assignment_groups WHERE assignment_id = $1",
      [assignmentId]
    );

    if (!target_all_students) {
      for (const groupId of uniqueGroupIds) {
        await client.query(
          `INSERT INTO assignment_groups (assignment_id, group_id)
           VALUES ($1, $2)`,
          [assignmentId, groupId]
        );
      }
    }

    const updated = await client.query(
      "SELECT * FROM assignments WHERE id = $1",
      [assignmentId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update assignment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update assignment",
    });
  } finally {
    client.release();
  }
};

// 5. Delete an assignment (Admin only - only when safe for existing records)
export const deleteAssignment = async (req, res) => {
  const { assignmentId } = req.params;

  const parsedId = parseInt(assignmentId, 10);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid assignment ID",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if assignment exists
    const assignmentCheck = await client.query(
      "SELECT id, title FROM assignments WHERE id = $1",
      [parsedId]
    );

    if (assignmentCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if there are confirmed submissions
    const subCheck = await client.query(
      "SELECT COUNT(*)::INTEGER AS sub_count FROM submissions WHERE assignment_id = $1",
      [parsedId]
    );

    const subCount = subCheck.rows[0].sub_count;
    if (subCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Cannot delete assignment "${assignmentCheck.rows[0].title}" because it already has ${subCount} confirmed submission(s). Student submission records must be preserved.`,
      });
    }

    // Safe to delete: remove assignment groups and assignment
    await client.query("DELETE FROM assignment_groups WHERE assignment_id = $1", [parsedId]);
    await client.query("DELETE FROM assignments WHERE id = $1", [parsedId]);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Assignment "${assignmentCheck.rows[0].title}" deleted successfully`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete assignment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete assignment",
    });
  } finally {
    client.release();
  }
};
