
import pool from "../config/db.js";

// CREATE A NEW GROUP
export const createGroup = async (req, res) => {
  const client = await pool.connect();

  try {
    const { group_name } = req.body;
    const userId = req.user.id;

    if (!group_name || !group_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO groups (group_name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [group_name.trim(), userId]
    );

    const group = groupResult.rows[0];

    // Automatically add creator as group leader
    await client.query(
      `INSERT INTO group_members (group_id, user_id, member_role)
       VALUES ($1, $2, 'leader')`,
      [group.id, userId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create group error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not create group",
    });
  } finally {
    client.release();
  }
};

// VIEW MY GROUPS
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         g.created_at,
         gm.member_role,
         COUNT(all_members.id)::INTEGER AS member_count
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       LEFT JOIN group_members all_members
         ON all_members.group_id = g.id
       WHERE gm.user_id = $1
       GROUP BY g.id, g.group_name, g.created_at, gm.member_role
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      groups: result.rows,
    });
  } catch (error) {
    console.error("Get groups error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not retrieve groups",
    });
  }
};

// ADD A MEMBER BY EMAIL
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Student email is required",
      });
    }

    // Only the group creator can add members
    const groupResult = await pool.query(
      "SELECT id FROM groups WHERE id = $1 AND created_by = $2",
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only the group leader can add members",
      });
    }

    const studentResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1 AND role = 'student'",
      [email.toLowerCase().trim()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    const result = await pool.query(
      `INSERT INTO group_members (group_id, user_id, member_role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (group_id, user_id) DO NOTHING
       RETURNING id`,
      [groupId, student.id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Student is already in this group",
      });
    }

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      student,
    });
  } catch (error) {
    console.error("Add member error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add student",
    });
  }
};

// ADMIN: VIEW ALL GROUPS
export const getAllGroups = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         g.created_at,
         COUNT(gm.id)::INTEGER AS member_count
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.group_name, g.created_at
       ORDER BY g.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      groups: result.rows,
    });
  } catch (error) {
    console.error("Get all groups error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve groups",
    });
  }
};
