
import { useEffect, useState } from "react";
import { Users, ClipboardList, Plus, LogOut } from "lucide-react";
import api from "../services/api";

function StudentDashboard({ user, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDashboardData = async () => {
    try {
      setError("");

      const [groupResponse, assignmentResponse] = await Promise.all([
        api.get("/groups/my-groups"),
        api.get("/assignments/student"),
      ]);

      setGroups(groupResponse.data.groups || []);
      setAssignments(assignmentResponse.data.assignments || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) return;

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/groups", {
        group_name: groupName.trim(),
      });

      setSuccess(response.data.message);
      setGroupName("");
      await fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create group.");
    } finally {
      setCreating(false);
    }
  };

const handleConfirmSubmission = async (assignment) => {
  const confirmed = window.confirm(
    `Confirm that "${assignment.group_name}" has submitted "${assignment.title}"?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  try {
    await api.post(
      `/submissions/${assignment.id}/confirm`,
      { group_id: assignment.group_id }
    );

    setSuccess("Assignment submission confirmed successfully!");
    await fetchDashboardData();
  } catch (err) {
    setError(
      err.response?.data?.message || "Could not confirm submission."
    );

    // Refresh in case another group member already confirmed it.
    await fetchDashboardData();
  }
};


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-sm px-6 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Joineazy</h1>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold text-secondary">
          Welcome, {user.name}!
        </h2>

        <p className="mt-2 text-gray-600">
          Manage your project groups and assignments from here.
        </p>

        {error && (
          <p className="mt-5 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-5 p-3 bg-green-100 text-green-700 rounded-lg">
            {success}
          </p>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 text-primary">
              <Users size={28} />
              <h3 className="text-lg font-semibold">My Groups</h3>
            </div>
            <p className="text-3xl font-bold mt-4">{groups.length}</p>
            <p className="text-gray-500 mt-1">Groups you belong to</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 text-primary">
              <ClipboardList size={28} />
              <h3 className="text-lg font-semibold">Assignments</h3>
            </div>
            <p className="text-3xl font-bold mt-4">{assignments.length}</p>
            <p className="text-gray-500 mt-1">Assignments available to you</p>
          </div>
        </div>

        {/* Create group */}
        <section className="bg-white rounded-xl shadow-sm border p-6 mt-8">
          <h3 className="text-xl font-bold text-secondary">
            Create a New Group
          </h3>

          <form
            onSubmit={handleCreateGroup}
            className="flex flex-col sm:flex-row gap-3 mt-5"
          >
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
              className="flex-1 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={creating}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {creating ? "Creating..." : "Create Group"}
            </button>
          </form>
        </section>

        {/* Groups list */}
        <section className="mt-10">
          <h3 className="text-xl font-bold text-secondary mb-5">
            My Groups
          </h3>

          {groups.length === 0 ? (
            <p className="bg-white rounded-xl p-6 text-gray-500">
              You haven't joined any groups yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-xl shadow-sm border p-6"
                >
                  <h4 className="font-bold text-lg">{group.group_name}</h4>
                  <p className="text-gray-500 mt-2">
                    Your role: {group.member_role}
                  </p>
                  <p className="text-gray-500">
                    Members: {group.member_count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        
{/* Assignments list */}
<section className="mt-10">
  <h3 className="text-xl font-bold text-secondary mb-5">
    My Assignments
  </h3>

  {assignments.length === 0 ? (
    <p className="bg-white rounded-xl p-6 text-gray-500">
      No assignments have been assigned to your groups yet.
    </p>
  ) : (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const isSubmitted =
          assignment.submission_status === "submitted";

        return (
          <div
            key={`${assignment.id}-${assignment.group_id}`}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h4 className="text-lg font-bold">
                {assignment.title}
              </h4>

              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isSubmitted
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isSubmitted ? "Submitted" : "Pending"}
              </span>
            </div>

            <p className="text-gray-600 mt-2">
              {assignment.description || "No description provided."}
            </p>

            <p className="text-sm text-gray-500 mt-3">
              Group: {assignment.group_name}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Deadline:{" "}
              {assignment.deadline
                ? new Date(assignment.deadline).toLocaleString()
                : "Not specified"}
            </p>

            {assignment.onedrive_link && (
              <a
                href={assignment.onedrive_link}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 text-primary font-semibold hover:underline"
              >
                Open Assignment Link
              </a>
            )}

            {isSubmitted ? (
              <p className="mt-4 text-green-700 font-medium">
                Submission confirmed successfully.
              </p>
            ) : (
              <button
                onClick={() => handleConfirmSubmission(assignment)}
                className="block mt-4 px-5 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
              >
                Confirm Submission
              </button>
            )}
          </div>
        );
      })}
    </div>
  )}
</section>

      </main>
    </div>
  );
}

export default StudentDashboard;
