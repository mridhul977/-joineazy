import pool from "../config/db.js";

// 1. Get comprehensive admin analytics
export const getAdminAnalytics = async (req, res) => {
  try {
    // Total students
    const studentsCountResult = await pool.query(
      "SELECT COUNT(*)::INTEGER AS count FROM users WHERE role = 'student'"
    );
    const totalStudents = studentsCountResult.rows[0].count;

    // Total groups
    const groupsCountResult = await pool.query(
      "SELECT COUNT(*)::INTEGER AS count FROM groups"
    );
    const totalGroups = groupsCountResult.rows[0].count;

    // Total assignments
    const assignmentsCountResult = await pool.query(
      "SELECT COUNT(*)::INTEGER AS count FROM assignments"
    );
    const totalAssignments = assignmentsCountResult.rows[0].count;

    // Total confirmed submissions
    const submissionsCountResult = await pool.query(
      "SELECT COUNT(*)::INTEGER AS count FROM submissions WHERE status = 'submitted'"
    );
    const confirmedSubmissions = submissionsCountResult.rows[0].count;

    // Assignment-wise statistics
    const assignmentsResult = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.deadline,
         a.target_all_students,
         COUNT(DISTINCT s.group_id)::INTEGER AS submitted_count,
         COUNT(DISTINCT ag.group_id)::INTEGER AS explicit_target_count
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.status = 'submitted'
       LEFT JOIN assignment_groups ag ON ag.assignment_id = a.id
       GROUP BY a.id, a.title, a.deadline, a.target_all_students
       ORDER BY a.created_at DESC`
    );

    let totalRequiredSubmissions = 0;
    const assignmentStats = assignmentsResult.rows.map((a) => {
      const targetCount = a.target_all_students ? totalGroups : a.explicit_target_count;
      totalRequiredSubmissions += targetCount;
      const submitted = Math.min(a.submitted_count, targetCount);
      const pending = Math.max(0, targetCount - submitted);
      const completionRate = targetCount > 0 ? Math.round((submitted / targetCount) * 100) : 0;

      return {
        id: a.id,
        title: a.title,
        deadline: a.deadline,
        target_groups: targetCount,
        submitted_groups: submitted,
        pending_groups: pending,
        completion_percentage: completionRate,
      };
    });

    const pendingSubmissions = Math.max(0, totalRequiredSubmissions - confirmedSubmissions);
    const overallCompletionRate =
      totalRequiredSubmissions > 0
        ? Math.round((confirmedSubmissions / totalRequiredSubmissions) * 100)
        : 0;

    // Group-wise completion statistics
    const groupStatsResult = await pool.query(
      `SELECT
         g.id,
         g.group_name,
         leader.name AS leader_name,
         COUNT(DISTINCT gm.id)::INTEGER AS member_count,
         -- Count of assignments targeted at this group
         (
           SELECT COUNT(*)::INTEGER
           FROM assignments a
           LEFT JOIN assignment_groups ag ON ag.assignment_id = a.id AND ag.group_id = g.id
           WHERE a.target_all_students = TRUE OR ag.group_id IS NOT NULL
         ) AS assigned_count,
         -- Count of submissions by this group
         (
           SELECT COUNT(*)::INTEGER
           FROM submissions s
           WHERE s.group_id = g.id AND s.status = 'submitted'
         ) AS submitted_count
       FROM groups g
       LEFT JOIN users leader ON leader.id = g.created_by
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.group_name, leader.name
       ORDER BY g.created_at DESC`
    );

    const groupStats = groupStatsResult.rows.map((g) => {
      const assigned = g.assigned_count;
      const submitted = Math.min(g.submitted_count, assigned);
      const completion = assigned > 0 ? Math.round((submitted / assigned) * 100) : 0;

      return {
        id: g.id,
        group_name: g.group_name,
        leader_name: g.leader_name || "Unknown",
        member_count: g.member_count,
        assigned_count: assigned,
        submitted_count: submitted,
        pending_count: Math.max(0, assigned - submitted),
        completion_percentage: completion,
      };
    });

    return res.status(200).json({
      success: true,
      analytics: {
        total_students: totalStudents,
        total_groups: totalGroups,
        total_assignments: totalAssignments,
        confirmed_submissions: confirmedSubmissions,
        pending_submissions: pendingSubmissions,
        total_required_submissions: totalRequiredSubmissions,
        overall_completion_rate: overallCompletionRate,
        assignment_stats: assignmentStats,
        group_stats: groupStats,
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve analytics",
    });
  }
};

// 2. View all registered students
export const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.created_at,
         COUNT(DISTINCT gm.group_id)::INTEGER AS group_count
       FROM users u
       LEFT JOIN group_members gm ON gm.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id, u.name, u.email, u.role, u.created_at
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      students: result.rows,
    });
  } catch (error) {
    console.error("Get all students error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve registered students",
    });
  }
};

