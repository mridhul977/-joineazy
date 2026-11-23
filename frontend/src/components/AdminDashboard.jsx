
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Users,
  CheckCircle,
  Clock,
  Plus,
  LogOut,
  ExternalLink,
  Pencil,
} from "lucide-react";
import api from "../services/api";

function AdminDashboard({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    onedrive_link: "",
    deadline: "",
    target_all_students: false,
    group_ids: [],
  });

  // Load assignments and groups
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [assignmentResponse, groupResponse] = await Promise.all([
        api.get("/assignments/admin"),
        api.get("/groups/all"),
      ]);

      setAssignments(assignmentResponse.data.assignments || []);
      setGroups(groupResponse.data.groups || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle form inputs
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Select or deselect groups
  const handleGroupSelection = (groupId) => {
    const id = Number(groupId);

    setForm((previous) => ({
      ...previous,
      group_ids: previous.group_ids.includes(id)
        ? previous.group_ids.filter((item) => item !== id)
        : [...previous.group_ids, id],
    }));
  };

  // Reset form
  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      onedrive_link: "",
      deadline: "",
      target_all_students: false,
      group_ids: [],
    });

    setEditingId(null);
  };

  // Convert database date to datetime-local format
  const toLocalDateTimeInput = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  // Load assignment into edit form
  const handleEditAssignment = (assignment) => {
    setEditingId(assignment.id);

    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      onedrive_link: assignment.onedrive_link || "",
      deadline: toLocalDateTimeInput(assignment.deadline),
      target_all_students: Boolean(
        assignment.target_all_students
      ),
      group_ids: (assignment.group_ids || []).map(Number),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Create or update assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        group_ids: form.target_all_students
          ? []
          : form.group_ids,
        deadline: form.deadline || null,
      };

      let response;

      if (editingId) {
        response = await api.put(
          `/assignments/${editingId}`,
          payload
        );
      } else {
        response = await api.post("/assignments", payload);
      }

      setSuccess(
        response.data.message ||
          (editingId
            ? "Assignment updated successfully."
            : "Assignment created successfully.")
      );

      resetForm();
      await fetchDashboardData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save assignment"
      );
    }
  };

  // Dashboard statistics
  const submittedCount = assignments.reduce(
    (total, assignment) =>
      total + Number(assignment.submitted_groups || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen p-10">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm px-6 py-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">
          Joineazy Admin
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            {user.name}
          </span>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold text-secondary">
          Admin Dashboard
        </h2>

        <p className="text-gray-500 mt-2">
          Manage assignments and monitor student submissions.
        </p>

        {/* Error message */}
        {error && (
          <p className="mt-5 bg-red-100 text-red-700 p-3 rounded-lg">
            {error}
          </p>
        )}

        {/* Success message */}
        {success && (
          <p className="mt-5 bg-green-100 text-green-700 p-3 rounded-lg">
            {success}
          </p>
        )}

        {/* Dashboard statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          <StatCard
            icon={<ClipboardList />}
            label="Total Assignments"
            value={assignments.length}
          />

          <StatCard
            icon={<Users />}
            label="Total Groups"
            value={groups.length}
          />

          <StatCard
            icon={<CheckCircle />}
            label="Confirmed Submissions"
            value={submittedCount}
          />
        </div>

        {/* Create / Edit Assignment Form */}
        <section className="bg-white rounded-xl shadow-sm p-6 mt-10">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {editingId ? (
              <Pencil size={22} />
            ) : (
              <Plus size={22} />
            )}

            {editingId
              ? "Edit Assignment"
              : "Create New Assignment"}
          </h3>

          <form
            onSubmit={handleCreateAssignment}
            className="mt-6 space-y-4"
          >
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Assignment title"
              required
              className="w-full border rounded-lg p-3"
            />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Assignment description"
              rows={3}
              className="w-full border rounded-lg p-3"
            />

            <input
              name="onedrive_link"
              type="url"
              value={form.onedrive_link}
              onChange={handleChange}
              placeholder="OneDrive assignment link"
              className="w-full border rounded-lg p-3"
            />

            <div>
              <label className="block mb-2 font-medium">
                Assignment deadline
              </label>

              <input
                name="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="target_all_students"
                checked={form.target_all_students}
                onChange={handleChange}
              />

              Assign to all students
            </label>

            {!form.target_all_students && (
              <div>
                <p className="font-medium mb-3">
                  Select target groups:
                </p>

                {groups.length === 0 ? (
                  <p className="text-gray-500">
                    No groups available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 border p-3 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={form.group_ids.includes(
                            Number(group.id)
                          )}
                          onChange={() =>
                            handleGroupSelection(group.id)
                          }
                        />

                        <span>{group.group_name}</span>

                        <span className="text-gray-500 text-sm">
                          ({group.member_count} members)
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                {editingId
                  ? "Save Changes"
                  : "Create Assignment"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Created Assignments */}
        <section className="bg-white rounded-xl shadow-sm p-6 mt-10">
          <h3 className="text-xl font-bold mb-5">
            Created Assignments
          </h3>

          {assignments.length === 0 ? (
            <p className="text-gray-500">
              No assignments created yet.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onEdit={handleEditAssignment}
                  totalGroups={groups.length}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Statistics card
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-primary mb-3">
        {icon}
      </div>

      <p className="text-gray-500">{label}</p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>
    </div>
  );
}

// Individual assignment card
function AssignmentCard({
  assignment,
  onEdit,
  totalGroups,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [error, setError] = useState("");
  const [loadingSubmissions, setLoadingSubmissions] =
    useState(false);

  // Calculate assigned groups and submission progress
  const targetGroups = assignment.target_all_students
    ? totalGroups
    : (assignment.group_ids || []).length;

  const submittedGroups = Math.min(
    Number(assignment.submitted_groups || 0),
    targetGroups
  );

  const progress =
    targetGroups > 0
      ? Math.round((submittedGroups / targetGroups) * 100)
      : 0;

  // Fetch submission details
  const viewSubmissions = async () => {
    if (showSubmissions) {
      setShowSubmissions(false);
      return;
    }

    try {
      setLoadingSubmissions(true);
      setError("");

      const response = await api.get(
        `/submissions/${assignment.id}`
      );

      setSubmissions(response.data.submissions || []);
      setShowSubmissions(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load submissions"
      );
    } finally {
      setLoadingSubmissions(false);
    }
  };

  return (
    <div className="border rounded-xl p-5">
      <h4 className="font-bold text-lg">
        {assignment.title}
      </h4>

      <p className="text-gray-600 mt-2">
        {assignment.description || "No description"}
      </p>

      <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
        <Clock size={15} />

        Deadline:{" "}
        {assignment.deadline
          ? new Date(assignment.deadline).toLocaleString()
          : "Not specified"}
      </p>

      {/* Submission progress */}
      <div className="mt-5">
        <div className="flex justify-between items-center mb-2 gap-3">
          <p className="text-sm font-medium text-gray-700">
            Submission Progress
          </p>

          <p className="text-sm font-bold text-gray-800">
            {submittedGroups} / {targetGroups} groups
          </p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-between items-center mt-3 gap-2">
          <span className="text-sm text-gray-500">
            {progress}% completed
          </span>

          {targetGroups > 0 && progress === 100 ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
              <CheckCircle size={15} />
              All Groups Submitted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
              <Clock size={15} />
              Pending
            </span>
          )}
        </div>
      </div>

      {/* OneDrive link */}
      {assignment.onedrive_link && (
        <a
          href={assignment.onedrive_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-primary mt-4"
        >
          Open OneDrive link
          <ExternalLink size={16} />
        </a>
      )}

      {/* Assignment actions */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={() => onEdit(assignment)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Pencil size={16} />
          Edit Assignment
        </button>

        <button
          onClick={viewSubmissions}
          disabled={loadingSubmissions}
          className="bg-secondary text-white px-4 py-2 rounded-lg"
        >
          {loadingSubmissions
            ? "Loading..."
            : showSubmissions
              ? "Hide Submissions"
              : "View Submissions"}
        </button>
      </div>

      {error && (
        <p className="text-red-600 mt-3">
          {error}
        </p>
      )}

      {/* Submission details */}
      {showSubmissions && (
        <div className="mt-4 border-t pt-4">
          {submissions.length === 0 ? (
            <p className="text-gray-500">
              No submissions confirmed yet.
            </p>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="border-b py-3 text-sm"
              >
                <p className="font-semibold">
                  {submission.group_name}
                </p>

                <p>
                  Confirmed by:{" "}
                  {submission.confirmed_by_name || "Unknown"}
                </p>

                <p>
                  Date:{" "}
                  {submission.confirmed_at
                    ? new Date(
                        submission.confirmed_at
                      ).toLocaleString()
                    : "Unknown"}
                </p>

                <p className="text-green-600 flex items-center gap-1 mt-1">
                  <CheckCircle size={15} />
                  Submitted
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
