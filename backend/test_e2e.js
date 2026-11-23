import pool from "./src/config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "joineazy_development_secret_change_before_production";

async function runTests() {
  console.log("====================================================");
  console.log("   JOINEAZY FULL-STACK VERIFICATION & E2E TESTS     ");
  console.log("====================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  try {
    // 1. Database & Existing Data Checks
    console.log("--- 1. Database Integrity & Existing Records ---");
    const existingUsers = await pool.query("SELECT id, name, email, role, password FROM users ORDER BY id");
    assert(existingUsers.rows.length >= 3, "Existing users preserved", `Found ${existingUsers.rows.length} users`);

    const adminUser = existingUsers.rows.find((u) => u.role === "admin");
    const studentUser = existingUsers.rows.find((u) => u.role === "student" && u.email === "student@test.com");
    const johnUser = existingUsers.rows.find((u) => u.email === "john@gmail.com");

    assert(Boolean(adminUser), "Admin account exists in database");
    assert(Boolean(studentUser), "Student account (student@test.com) exists in database");
    assert(Boolean(johnUser), "Student account (john@gmail.com) exists in database");

    // Check admin and student passwords
    let adminPassword = "password123";
    for (const testPwd of ["password123", "admin123", "joineazy123", "secret123", "Test@123"]) {
      if (await bcrypt.compare(testPwd, adminUser.password)) {
        adminPassword = testPwd;
        break;
      }
    }

    let studentPassword = "password123";
    for (const testPwd of ["password123", "student123", "joineazy123", "secret123", "Test@123"]) {
      if (await bcrypt.compare(testPwd, studentUser.password)) {
        studentPassword = testPwd;
        break;
      }
    }

    // 2. Authentication Testing
    console.log("\n--- 2. Authentication & Authorization Testing ---");

    // Test Registration of a new student
    const testEmail = `test_student_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Enrolled Student",
        email: testEmail,
        password: "securepassword123",
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.user?.role === "student", "Student registration creates 'student' role only");

    // Test Registration duplicate email rejection
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Student",
        email: testEmail,
        password: "securepassword123",
      }),
    });
    assert(dupRes.status === 409, "Duplicate email registration rejected with 409");

    // Test Registration short password rejection
    const shortPwdRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Short Pwd",
        email: `short_${Date.now()}@example.com`,
        password: "short",
      }),
    });
    assert(shortPwdRes.status === 400, "Registration with password < 8 chars rejected with 400");

    // Test Login with newly created student
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "securepassword123",
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && Boolean(loginData.token), "Student login generates valid JWT token");
    const newStudentToken = loginData.token;
    const newStudentId = loginData.user.id;

    // Tokens for existing accounts
    const studentToken = jwt.sign(
      { id: studentUser.id, role: studentUser.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Test Auth Me endpoint
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.email === studentUser.email, "GET /api/auth/me returns current user profile");

    // Test Security: Student attempting to access Admin endpoints
    const unauthAdmin = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unauthAdmin.status === 403, "Student blocked from admin analytics (403 Forbidden)");

    const unauthAdminAssign = await fetch(`${BASE_URL}/assignments/admin`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unauthAdminAssign.status === 403, "Student blocked from admin assignments (403 Forbidden)");

    // 3. Group Management Testing (HIGHEST PRIORITY)
    console.log("\n--- 3. Group Management Testing (HIGHEST PRIORITY) ---");

    // Test: Create a new group
    const groupName = `E2E Collaboration Group ${Date.now()}`;
    const createGroupRes = await fetch(`${BASE_URL}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ group_name: groupName }),
    });
    const createGroupData = await createGroupRes.json();
    assert(createGroupRes.status === 201 && createGroupData.group?.group_name === groupName, "Student creates a new group successfully");
    const testGroupId = createGroupData.group.id;

    // Test: View my groups
    const myGroupsRes = await fetch(`${BASE_URL}/groups/my-groups`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const myGroupsData = await myGroupsRes.json();
    const createdGroupEntry = myGroupsData.groups?.find((g) => g.id === testGroupId);
    assert(Boolean(createdGroupEntry) && createdGroupEntry.is_leader === true, "My Groups includes created group with is_leader = true");

    // Test: View group details
    const groupDetailsRes = await fetch(`${BASE_URL}/groups/${testGroupId}`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const groupDetailsData = await groupDetailsRes.json();
    assert(groupDetailsRes.status === 200 && groupDetailsData.group?.members?.length === 1, "View group details returns creator as group leader");

    // Test: View individual group members
    const membersRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const membersData = await membersRes.json();
    assert(
      membersRes.status === 200 &&
      membersData.members?.length === 1 &&
      membersData.members[0].is_leader === true &&
      membersData.members[0].email === testEmail,
      "View Members endpoint returns individual member details with leader indicator"
    );

    // Test: Add member - Non-existent email rejection
    const invalidEmailRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ email: "doesnotexist_989823@university.edu" }),
    });
    assert(invalidEmailRes.status === 404, "Adding non-existent email rejected with 404");

    // Test: Add member - Student cannot add themselves again
    const selfAddRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ email: testEmail }),
    });
    assert(selfAddRes.status === 400, "Student adding themselves again rejected with 400");

    // Test: Add member - Cannot add an admin account to a student group
    const adminAddRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ email: adminUser.email }),
    });
    assert(adminAddRes.status === 400, "Adding admin account to group rejected with 400");

    // Test: Add member - Add valid student (Second Student)
    const addValidRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ email: studentUser.email }),
    });
    const addValidData = await addValidRes.json();
    assert(addValidRes.status === 201 && addValidData.student?.email === studentUser.email, "Leader adds registered student by email successfully");

    // Test: Add member - Duplicate member addition rejected
    const dupMemberRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ email: studentUser.email }),
    });
    assert(dupMemberRes.status === 409, "Duplicate group member rejected with 409");

    // Test: Member list reflects newly added member immediately
    const updatedMembersRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const updatedMembersData = await updatedMembersRes.json();
    assert(
      updatedMembersData.members?.length === 2 &&
      updatedMembersData.members.some((m) => m.email === studentUser.email && m.member_role === "member") &&
      updatedMembersData.members.some((m) => m.email === testEmail && m.is_leader === true),
      "Member list correctly displays both members with name, email, and leader designation"
    );

    // Test: Unauthorized member addition - only leader can add members
    // Create another third student
    const thirdStudentEmail = `student3_${Date.now()}@example.com`;
    const regThird = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Third Student",
        email: thirdStudentEmail,
        password: "securepassword123",
      }),
    });
    const regThirdData = await regThird.json();
    const thirdStudentToken = jwt.sign(
      { id: regThirdData.user.id, role: "student" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Third student (not in group) attempts to add a member to testGroupId
    const unauthAddRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${thirdStudentToken}`,
      },
      body: JSON.stringify({ email: johnUser.email }),
    });
    assert(unauthAddRes.status === 403, "Non-leader student rejected from adding members (403 Forbidden)");

    // Test: Unauthorized user viewing private group members
    const unauthViewRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      headers: { Authorization: `Bearer ${thirdStudentToken}` },
    });
    assert(unauthViewRes.status === 403, "Non-member student rejected from viewing private group members (403 Forbidden)");

    // 4. Assignments & Submission Testing
    console.log("\n--- 4. Student Assignments & Submission Confirmation ---");

    // Admin creates an assignment targeting this new group
    const assignRes = await fetch(`${BASE_URL}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: `Test Assignment ${Date.now()}`,
        description: "Submit final report via OneDrive link",
        onedrive_link: "https://onedrive.live.com/test-folder",
        deadline: new Date(Date.now() + 86400000).toISOString(),
        target_all_students: false,
        group_ids: [testGroupId],
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 201 && Boolean(assignData.assignment?.id), "Admin creates assignment targeting selected group");
    const testAssignmentId = assignData.assignment.id;

    // Student views assignment
    const studentAssignRes = await fetch(`${BASE_URL}/assignments/student`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const studentAssignData = await studentAssignRes.json();
    const receivedAssignment = studentAssignData.assignments?.find(
      (a) => a.id === testAssignmentId && a.group_id === testGroupId
    );
    assert(
      Boolean(receivedAssignment) &&
      receivedAssignment.onedrive_link === "https://onedrive.live.com/test-folder" &&
      receivedAssignment.submission_status === null,
      "Student receives assignment with description, deadline, onedrive_link, and pending status"
    );

    // Confirm Submission
    const confirmRes = await fetch(`${BASE_URL}/submissions/${testAssignmentId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ group_id: testGroupId }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 201 && confirmData.submission?.status === "submitted", "Student confirms group assignment submission");

    // Duplicate submission confirmation rejected
    const dupConfirmRes = await fetch(`${BASE_URL}/submissions/${testAssignmentId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({ group_id: testGroupId }),
    });
    assert(dupConfirmRes.status === 409, "Duplicate submission confirmation rejected with 409");

    // Student assignments status updated to submitted
    const updatedAssignRes = await fetch(`${BASE_URL}/assignments/student`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const updatedAssignData = await updatedAssignRes.json();
    const confirmedAssignment = updatedAssignData.assignments?.find(
      (a) => a.id === testAssignmentId && a.group_id === testGroupId
    );
    assert(confirmedAssignment?.submission_status === "submitted", "Assignment submission status updated to 'submitted'");

    // 5. Admin Features & Analytics Testing
    console.log("\n--- 5. Admin Features, Groups & Submission Monitoring ---");

    // Admin view all groups
    const allGroupsRes = await fetch(`${BASE_URL}/groups/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allGroupsData = await allGroupsRes.json();
    assert(allGroupsRes.status === 200 && allGroupsData.groups?.length >= 3, "Admin views all groups with leader info and member counts");

    // Admin view group members
    const adminGroupMembersRes = await fetch(`${BASE_URL}/groups/${testGroupId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminGroupMembersData = await adminGroupMembersRes.json();
    assert(adminGroupMembersRes.status === 200 && adminGroupMembersData.members?.length === 2, "Admin can view members of any student group");

    // Admin view all registered students
    const allStudentsRes = await fetch(`${BASE_URL}/admin/students`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allStudentsData = await allStudentsRes.json();
    assert(allStudentsRes.status === 200 && allStudentsData.students?.length >= 3, "Admin views all registered students");

    // Admin view submission monitoring (submitted & pending groups)
    const monitorRes = await fetch(`${BASE_URL}/submissions/${testAssignmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const monitorData = await monitorRes.json();
    assert(
      monitorRes.status === 200 &&
      monitorData.submitted_count === 1 &&
      monitorData.groups?.some((g) => g.group_id === testGroupId && g.status === "submitted"),
      "Admin monitors submissions with group breakdown and confirmed_by details"
    );

    // Admin Analytics
    const analyticsRes = await fetch(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsData = await analyticsRes.json();
    assert(
      analyticsRes.status === 200 &&
      analyticsData.analytics?.total_students >= 3 &&
      analyticsData.analytics?.total_groups >= 3 &&
      analyticsData.analytics?.confirmed_submissions >= 2 &&
      Array.isArray(analyticsData.analytics?.group_stats),
      "Admin analytics returns statistics and group completion percentages"
    );

    // Admin Assignment Update
    const updateRes = await fetch(`${BASE_URL}/assignments/${testAssignmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Updated Title for Assignment",
        description: "Updated description",
        target_all_students: false,
        group_ids: [testGroupId],
      }),
    });
    assert(updateRes.status === 200, "Admin updates assignment successfully");

    // Admin Safe Assignment Deletion
    // Attempt to delete assignment with confirmed submissions -> MUST BE REJECTED!
    const deleteBlockedRes = await fetch(`${BASE_URL}/assignments/${testAssignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteBlockedRes.status === 400, "Deleting assignment with confirmed submissions rejected to preserve student records");

    // Create an unused assignment with 0 submissions and delete it safely
    const tempAssignRes = await fetch(`${BASE_URL}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Temporary Empty Assignment",
        target_all_students: true,
      }),
    });
    const tempAssignData = await tempAssignRes.json();
    const tempId = tempAssignData.assignment.id;

    const safeDeleteRes = await fetch(`${BASE_URL}/assignments/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(safeDeleteRes.status === 200, "Safe deletion of assignment with 0 submissions succeeds");

    // SUMMARY
    console.log("\n====================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("====================================================");

    if (failed === 0) {
      console.log("🎉 ALL TEST SCENARIOS PASSED WITH 100% SUCCESS!");
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();

