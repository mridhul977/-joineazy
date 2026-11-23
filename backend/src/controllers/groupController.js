import pool from "../config/db.js";

const MAX_GROUP_SIZE = parseInt(process.env.MAX_GROUP_SIZE || "6", 10);

// 1. CREATE A NEW GROUP
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

    if (group_name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Group name cannot exceed 100 characters",
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
      group: {
        ...group,
        member_role: "leader",
        is_leader: true,
        member_count: 1,
      },
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

// 2. VIEW MY GROUPS (for logged in student)
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         g.created_at,
         g.created_by,
         leader.name AS leader_name,
         leader.email AS leader_email,
         gm.member_role,
         (gm.member_role = 'leader' OR g.created_by = $1) AS is_leader,
         COUNT(all_members.id)::INTEGER AS member_count
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       LEFT JOIN users leader ON leader.id = g.created_by
       LEFT JOIN group_members all_members ON all_members.group_id = g.id
       WHERE gm.user_id = $1
       GROUP BY g.id, g.group_name, g.created_at, g.created_by, leader.name, leader.email, gm.member_role
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

// 3. GET GROUP DETAILS & MEMBERS
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const parsedGroupId = parseInt(groupId, 10);
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    // Verify membership or admin privilege
    if (!isAdmin) {
      const membership = await pool.query(
        "SELECT id, member_role FROM group_members WHERE group_id = $1 AND user_id = $2",
        [parsedGroupId, userId]
      );

      if (membership.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this group",
        });
      }
    }

    const groupResult = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         g.created_at,
         g.created_by,
         leader.name AS leader_name,
         leader.email AS leader_email
       FROM groups g
       LEFT JOIN users leader ON leader.id = g.created_by
       WHERE g.id = $1`,
      [parsedGroupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groupResult.rows[0];

    const membersResult = await pool.query(
      `SELECT
         gm.id,
         gm.user_id,
         u.name,
         u.email,
         gm.member_role,
         gm.joined_at,
         (gm.member_role = 'leader' OR g.created_by = u.id) AS is_leader
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.group_id = $1
       ORDER BY CASE WHEN gm.member_role = 'leader' OR g.created_by = u.id THEN 0 ELSE 1 END, gm.joined_at ASC`,
      [parsedGroupId]
    );

    res.status(200).json({
      success: true,
      group: {
        ...group,
        member_count: membersResult.rows.length,
        members: membersResult.rows,
      },
    });
  } catch (error) {
    console.error("Get group details error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not retrieve group details",
    });
  }
};

// 4. GET INDIVIDUAL GROUP MEMBERS
export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const parsedGroupId = parseInt(groupId, 10);
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    // Verify group exists
    const groupCheck = await pool.query(
      `SELECT g.id, g.group_name, g.created_by, leader.name AS leader_name, leader.email AS leader_email
       FROM groups g
       LEFT JOIN users leader ON leader.id = g.created_by
       WHERE g.id = $1`,
      [parsedGroupId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groupCheck.rows[0];

    // Check authorization: must be member or admin
    if (!isAdmin) {
      const membership = await pool.query(
        "SELECT id, member_role FROM group_members WHERE group_id = $1 AND user_id = $2",
        [parsedGroupId, userId]
      );

      if (membership.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view members of this group",
        });
      }
    }

    const membersResult = await pool.query(
      `SELECT
         gm.id,
         gm.user_id,
         u.name,
         u.email,
         gm.member_role,
         gm.joined_at,
         (gm.member_role = 'leader' OR g.created_by = u.id) AS is_leader
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.group_id = $1
       ORDER BY CASE WHEN gm.member_role = 'leader' OR g.created_by = u.id THEN 0 ELSE 1 END, gm.joined_at ASC`,
      [parsedGroupId]
    );

    res.status(200).json({
      success: true,
      group_id: group.id,
      group_name: group.group_name,
      leader_name: group.leader_name,
      leader_email: group.leader_email,
      max_limit: MAX_GROUP_SIZE,
      member_count: membersResult.rows.length,
      members: membersResult.rows,
    });
  } catch (error) {
    console.error("Get group members error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not retrieve group members",
    });
  }
};

// 5. ADD A MEMBER BY EMAIL
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const parsedGroupId = parseInt(groupId, 10);
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student email is required",
      });
    }

    const targetEmail = email.toLowerCase().trim();

    // Check if group exists
    const groupResult = await pool.query(
      "SELECT id, group_name, created_by FROM groups WHERE id = $1",
      [parsedGroupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groupResult.rows[0];

    // Only the group leader (or admin) can add members
    if (!isAdmin) {
      const leaderCheck = await pool.query(
        `SELECT id FROM group_members
         WHERE group_id = $1 AND user_id = $2 AND member_role = 'leader'`,
        [parsedGroupId, userId]
      );

      const isCreator = group.created_by === userId;

      if (!isCreator && leaderCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Only the group leader can add members",
        });
      }
    }

    // Lookup the user to add by email
    const studentResult = await pool.query(
      "SELECT id, name, email, role FROM users WHERE email = $1",
      [targetEmail]
    );

    // Reject non-existent email
    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student with this email address does not exist",
      });
    }

    const student = studentResult.rows[0];

    // Only registered student accounts can be added
    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Only registered student accounts can be added to groups",
      });
    }

    // A student cannot add themselves again
    if (student.id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself to the group",
      });
    }

    // Check group size limit
    const countResult = await pool.query(
      "SELECT COUNT(*)::INTEGER AS current_count FROM group_members WHERE group_id = $1",
      [parsedGroupId]
    );

    const currentCount = countResult.rows[0].current_count;
    if (currentCount >= MAX_GROUP_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Group has reached the maximum size limit of ${MAX_GROUP_SIZE} members`,
      });
    }

    // Check if user is already a member
    const existingMember = await pool.query(
      "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
      [parsedGroupId, student.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Student is already a member of this group",
      });
    }

    // Add member
    const insertResult = await pool.query(
      `INSERT INTO group_members (group_id, user_id, member_role)
       VALUES ($1, $2, 'member')
       RETURNING id, joined_at`,
      [parsedGroupId, student.id]
    );

    const newMembership = insertResult.rows[0];

    res.status(201).json({
      success: true,
      message: `${student.name} added to ${group.group_name} successfully`,
      student: {
        id: newMembership.id,
        user_id: student.id,
        name: student.name,
        email: student.email,
        member_role: "member",
        is_leader: false,
        joined_at: newMembership.joined_at,
      },
      member_count: currentCount + 1,
    });
  } catch (error) {
    console.error("Add member error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add student to group",
    });
  }
};

// 6. ADMIN: VIEW ALL GROUPS (with leader details and member counts)
export const getAllGroups = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         g.created_at,
         g.created_by,
         leader.name AS leader_name,
         leader.email AS leader_email,
         COUNT(gm.id)::INTEGER AS member_count
       FROM groups g
       LEFT JOIN users leader ON leader.id = g.created_by
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.group_name, g.created_at, g.created_by, leader.name, leader.email
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
