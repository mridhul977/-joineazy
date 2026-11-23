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
  Trash2,
  AlertCircle,
  X,
  Crown,
  User,
  RefreshCw,
  LayoutDashboard,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import api from "../services/api";

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, assignments, groups, students
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit / Create Form State
  const [editingId, setEditingId] = useState(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    onedrive_link: "",
    deadline: "",
    target_all_students: false,
    group_ids: [],
  });

  // Group Members Modal State
  const [viewingGroup, setViewingGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Submissions Details State per Assignment
  const [expandedSubmissions, setExpandedSubmissions] = useState({});
  const [loadingSubmissions, setLoadingSubmissions] = useState({});

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [assignmentsRes, groupsRes, analyticsRes, studentsRes] =
        await Promise.all([
          api.get("/assignments/admin"),
          api.get("/groups/all"),
          api.get("/admin/analytics"),
          api.get("/admin/students"),
        ]);

      setAssignments(assignmentsRes.data.assignments || []);
      setGroups(groupsRes.data.groups || []);
      setAnalytics(analyticsRes.data.analytics || null);
      setStudents(studentsRes.data.students || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load admin dashboard data. Please try again."
      );
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Form input changes
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Group selection toggling for assignments
  const handleGroupSelection = (groupId) => {
    const id = Number(groupId);
    setForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(id)
        ? prev.group_ids.filter((item) => item !== id)
        : [...prev.group_ids, id],
    }));
  };

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

  const toLocalDateTimeInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  };

  const handleEditAssignment = (assignment) => {
    setEditingId(assignment.id);
    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      onedrive_link: assignment.onedrive_link || "",
      deadline: toLocalDateTimeInput(assignment.deadline),
      target_all_students: Boolean(assignment.target_all_students),
      group_ids: (assignment.group_ids || []).map(Number),
    });
    setActiveTab("assignments");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Assignment title is required.");
      return;
    }

    if (!form.target_all_students && form.group_ids.length === 0) {
      setError("Please select at least one group or check 'Assign to all students'.");
      return;
    }

    setSavingAssignment(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description ? form.description.trim() : null,
        onedrive_link: form.onedrive_link ? form.onedrive_link.trim() : null,
        deadline: form.deadline || null,
        target_all_students: form.target_all_students,
        group_ids: form.target_all_students ? [] : form.group_ids,
      };

      let response;
      if (editingId) {
        response = await api.put(`/assignments/${editingId}`, payload);
      } else {
        response = await api.post("/assignments", payload);
      }

      setSuccess(
        response.data.message ||
          (editingId
            ? "Assignment updated successfully!"
            : "Assignment created successfully!")
      );

      resetForm();
      await fetchDashboardData(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save assignment."
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  // Safe Assignment Deletion
  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/assignments/${deleteTarget.id}`);
      setSuccess(response.data.message || "Assignment deleted successfully.");
      setDeleteTarget(null);
      await fetchDashboardData(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete assignment."
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // View Submissions Details for an Assignment (submitted + pending groups)
  const toggleSubmissions = async (assignmentId) => {
    if (expandedSubmissions[assignmentId]) {
      setExpandedSubmissions((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      return;
    }

    try {
      setLoadingSubmissions((prev) => ({ ...prev, [assignmentId]: true }));
      const response = await api.get(`/submissions/${assignmentId}`);
      setExpandedSubmissions((prev) => ({
        ...prev,
        [assignmentId]: response.data.groups || [],
      }));
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load assignment submissions."
      );
    } finally {
      setLoadingSubmissions((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  // View Group Members Modal
  const handleViewGroupMembers = async (group) => {
    setViewingGroup(group);
    setLoadingMembers(true);
    try {
      const response = await api.get(`/groups/${group.id}/members`);
      setGroupMembers(response.data.members || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to retrieve group members."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium mt-4">Loading Admin Portal...</p>
      </div>
    );
  }

  const confirmedCount =
    analytics?.confirmed_submissions ??
    assignments.reduce(
      (tot, a) => tot + Number(a.submitted_groups || 0),
      0
    );

  const pendingCount = analytics?.pending_submissions ?? 0;
  const totalStudents = analytics?.total_students ?? students.length;
  const totalGroups = analytics?.total_groups ?? groups.length;
  const totalAssignments = analytics?.total_assignments ?? assignments.length;
  const overallRate = analytics?.overall_completion_rate ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white font-bold text-xl shadow-sm">
              J
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary tracking-tight">
                  Joineazy
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  Admin Portal
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Faculty & Project Administration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-secondary">
                {user.name}
              </span>
              <span className="text-xs text-gray-500">{user.email}</span>
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchDashboardData(true);
              }}
              disabled={refreshing}
              title="Refresh Data"
              className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin text-primary" : ""}
              />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
              Administrator Dashboard
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Create assignments, monitor group submissions, and track student project progress.
            </p>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              }`}
            >
              <LayoutDashboard size={16} />
              Overview
            </button>

            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === "assignments"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              }`}
            >
              <ClipboardList size={16} />
              Assignments ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === "groups"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              }`}
            >
              <Users size={16} />
              Groups ({groups.length})
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === "students"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-primary hover:bg-gray-50"
              }`}
            >
              <GraduationCap size={16} />
              Students ({students.length})
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess("")} className="text-green-400 hover:text-green-600">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Key Statistic Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-primary mb-2">
              <GraduationCap size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Students
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-secondary mt-1">
              {totalStudents}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-primary mb-2">
              <Users size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Groups
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-secondary mt-1">
              {totalGroups}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-primary mb-2">
              <ClipboardList size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Assignments
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-secondary mt-1">
              {totalAssignments}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-green-600 mb-2">
              <CheckCircle size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Confirmed
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-green-700 mt-1">
              {confirmedCount}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 col-span-2 md:col-span-1">
            <div className="text-amber-600 mb-2">
              <Clock size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">
              {pendingCount}
            </p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Overall Completion Rate Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary">
                    Overall Project Submission Completion
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Percentage of confirmed group submissions across all assignments
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-primary">
                  {overallRate}%
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                <div
                  className="bg-primary h-3.5 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, overallRate)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>{confirmedCount} Confirmed Submissions</span>
                <span>{pendingCount} Pending Submissions</span>
              </div>
            </div>

            {/* Group-wise Progress Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-secondary">
                  Group-wise Assignment Completion Progress
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  {analytics?.group_stats?.length || groups.length} Groups
                </span>
              </div>

              {(!analytics?.group_stats || analytics.group_stats.length === 0) ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No group submission analytics available.
                </p>
              ) : (
                <div className="space-y-4">
                  {analytics.group_stats.map((g) => (
                    <div
                      key={g.id}
                      className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-secondary text-sm">
                            {g.group_name}
                          </h4>
                          <span className="text-xs text-gray-500">
                            (Leader: {g.leader_name})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-semibold text-gray-700">
                            {g.submitted_count} / {g.assigned_count} Submitted
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold ${
                              g.completion_percentage === 100
                                ? "bg-green-100 text-green-800"
                                : g.completion_percentage > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {g.completion_percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            g.completion_percentage === 100
                              ? "bg-green-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${g.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignment-wise Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-secondary">
                  Assignment Completion Breakdown
                </h3>
                <span className="text-xs font-semibold text-gray-500">
                  {analytics?.assignment_stats?.length || assignments.length} Assignments
                </span>
              </div>

              {(!analytics?.assignment_stats || analytics.assignment_stats.length === 0) ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No assignments created yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.assignment_stats.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 border border-gray-200 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-secondary text-sm">
                            {a.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              a.completion_percentage === 100
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {a.completion_percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Deadline: {a.deadline ? new Date(a.deadline).toLocaleDateString() : "None"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                          <span>
                            {a.submitted_groups} of {a.target_groups} groups submitted
                          </span>
                          <span>{a.pending_groups} pending</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              a.completion_percentage === 100 ? "bg-green-500" : "bg-primary"
                            }`}
                            style={{ width: `${a.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENT MANAGEMENT */}
        {activeTab === "assignments" && (
          <div className="space-y-8">
            {/* Create / Edit Assignment Form */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-2">
                {editingId ? (
                  <Pencil size={20} className="text-primary" />
                ) : (
                  <Plus size={20} className="text-primary" />
                )}
                <h3 className="text-lg font-bold text-secondary">
                  {editingId ? "Edit Assignment" : "Create a New Assignment"}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Specify assignment details, OneDrive reference folder, deadline, and target student groups.
              </p>

              <form onSubmit={handleSaveAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Assignment Title *
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Milestone 2 – Database Design & Schema Implementation"
                    required
                    maxLength={200}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Description & Instructions
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide clear project instructions, guidelines, and deliverables for student teams..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      OneDrive Submission Link
                    </label>
                    <input
                      name="onedrive_link"
                      type="url"
                      value={form.onedrive_link}
                      onChange={handleChange}
                      placeholder="https://onedrive.live.com/..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Submission Deadline
                    </label>
                    <input
                      name="deadline"
                      type="datetime-local"
                      value={form.deadline}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      name="target_all_students"
                      checked={form.target_all_students}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <div>
                      <span className="text-sm font-semibold text-secondary">
                        Assign to all students and groups
                      </span>
                      <p className="text-xs text-gray-500">
                        When enabled, all current and future student groups will receive this assignment.
                      </p>
                    </div>
                  </label>
                </div>

                {!form.target_all_students && (
                  <div className="p-4 border border-gray-200 rounded-lg bg-slate-50">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                      Select Target Groups ({form.group_ids.length} selected):
                    </p>

                    {groups.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No groups available. Groups created by students will appear here.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
                        {groups.map((group) => {
                          const isSelected = form.group_ids.includes(Number(group.id));
                          return (
                            <label
                              key={group.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                                isSelected
                                  ? "bg-blue-50 border-primary text-primary font-semibold"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleGroupSelection(group.id)}
                                className="w-3.5 h-3.5 text-primary rounded"
                              />
                              <span className="truncate">{group.group_name}</span>
                              <span className="text-gray-400 text-[11px] ml-auto">
                                ({group.member_count}m)
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingAssignment}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
                  >
                    {editingId ? <Pencil size={16} /> : <Plus size={16} />}
                    {savingAssignment
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Create Assignment"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Created Assignments List */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-secondary">
                    Created Assignments ({assignments.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Monitor submission progress, edit assignments, or delete unused records safely.
                  </p>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">
                  No assignments created yet. Use the form above to publish your first assignment!
                </div>
              ) : (
                <div className="space-y-5">
                  {assignments.map((assignment) => {
                    const targetCount = assignment.target_all_students
                      ? groups.length
                      : (assignment.group_ids || []).length;

                    const submittedCount = Number(assignment.submitted_groups || 0);
                    const progress =
                      targetCount > 0
                        ? Math.round((submittedCount / targetCount) * 100)
                        : 0;

                    const isExpanded = Boolean(expandedSubmissions[assignment.id]);
                    const isSubmissionLoading = Boolean(
                      loadingSubmissions[assignment.id]
                    );
                    const submissionData =
                      expandedSubmissions[assignment.id] || [];

                    return (
                      <div
                        key={assignment.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {assignment.target_all_students
                                  ? `All Groups (${targetCount})`
                                  : `${targetCount} Selected Group${targetCount === 1 ? "" : "s"}`}
                              </span>

                              {progress === 100 && targetCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-800 bg-green-100 px-2.5 py-0.5 rounded-full border border-green-200">
                                  <CheckCircle size={12} /> Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  <Clock size={12} /> In Progress
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-lg text-secondary">
                              {assignment.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 self-start">
                            <button
                              onClick={() => handleEditAssignment(assignment)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-primary hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                              title="Edit Assignment"
                            >
                              <Pencil size={14} />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => setDeleteTarget(assignment)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                              title="Delete Assignment"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                          {assignment.description || "No description provided."}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            Deadline:{" "}
                            <strong className="text-gray-700">
                              {assignment.deadline
                                ? new Date(assignment.deadline).toLocaleString()
                                : "Not specified"}
                            </strong>
                          </span>

                          {assignment.onedrive_link && (
                            <a
                              href={assignment.onedrive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                            >
                              <span>OneDrive Link</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                            <span className="text-gray-600">
                              Group Submission Progress: {submittedCount} / {targetCount} groups
                            </span>
                            <span className="text-primary font-bold">
                              {progress}%
                            </span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${
                                progress === 100 ? "bg-green-500" : "bg-primary"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Submissions Toggle Button */}
                        <div className="mt-4 flex justify-between items-center">
                          <button
                            onClick={() => toggleSubmissions(assignment.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-primary transition"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={16} /> Hide Group Submissions
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} /> View Group Submissions ({submittedCount} submitted, {Math.max(0, targetCount - submittedCount)} pending)
                              </>
                            )}
                          </button>
                        </div>

                        {/* Expanded Group Submission Monitoring Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {isSubmissionLoading ? (
                              <div className="py-4 text-center text-xs text-gray-500">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                                Loading group submission details...
                              </div>
                            ) : submissionData.length === 0 ? (
                              <p className="text-xs text-gray-500 py-2">
                                No groups assigned to this assignment.
                              </p>
                            ) : (
                              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                {submissionData.map((item) => {
                                  const isDone = item.status === "submitted";

                                  return (
                                    <div
                                      key={item.group_id}
                                      className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                        isDone ? "bg-green-50/20" : "bg-white"
                                      }`}
                                    >
                                      <div>
                                        <p className="font-bold text-secondary text-sm">
                                          {item.group_name}
                                        </p>
                                        {isDone ? (
                                          <p className="text-gray-500 mt-0.5">
                                            Confirmed by:{" "}
                                            <strong className="text-gray-700">
                                              {item.confirmed_by_name || "Student"}
                                            </strong>{" "}
                                            {item.confirmed_by_email && (
                                              <span>({item.confirmed_by_email})</span>
                                            )}
                                          </p>
                                        ) : (
                                          <p className="text-amber-600 mt-0.5">
                                            Awaiting submission from group members
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3">
                                        {isDone && item.confirmed_at && (
                                          <span className="text-gray-400 text-[11px]">
                                            {new Date(item.confirmed_at).toLocaleString()}
                                          </span>
                                        )}

                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                            isDone
                                              ? "bg-green-100 text-green-800 border border-green-200"
                                              : "bg-amber-100 text-amber-800 border border-amber-200"
                                          }`}
                                        >
                                          {isDone ? (
                                            <>
                                              <CheckCircle size={12} /> Submitted
                                            </>
                                          ) : (
                                            <>
                                              <Clock size={12} /> Pending
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: GROUPS & MEMBERS */}
        {activeTab === "groups" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-secondary">
                  Student Project Groups ({groups.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Inspect all student groups, view leaders, and review individual group members.
                </p>
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No groups created yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-secondary text-base">
                          {group.group_name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-primary border border-blue-100">
                          {group.member_count} {group.member_count === 1 ? "member" : "members"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Crown size={14} className="text-amber-500" />
                          <span>
                            Leader:{" "}
                            <strong className="text-gray-800">
                              {group.leader_name || "Unknown"}
                            </strong>
                          </span>
                        </div>

                        {group.leader_email && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Mail size={13} className="text-gray-400" />
                            <span>{group.leader_email}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-gray-400 text-[11px] pt-1">
                          <Calendar size={13} />
                          <span>
                            Created {new Date(group.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleViewGroupMembers(group)}
                        className="w-full inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-primary font-semibold py-2 px-3 rounded-lg text-xs transition"
                      >
                        <Users size={14} />
                        View Individual Members
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REGISTERED STUDENTS */}
        {activeTab === "students" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-secondary">
                  Registered Students ({students.length})
                </h3>
                <p className="text-xs text-gray-500">
                  All student accounts registered in the Joineazy system.
                </p>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No registered students found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Groups Joined</th>
                      <th className="py-3 px-4">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-semibold text-secondary">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {student.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-primary">
                            Student
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-secondary">
                          {student.group_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {student.created_at
                            ? new Date(student.created_at).toLocaleDateString()
                            : "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* VIEW GROUP MEMBERS MODAL (ADMIN) */}
      {viewingGroup && (
        <div className="fixed inset-0 z-50 bg-secondary/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-200">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-primary">
                  Group Inspection
                </span>
                <h3 className="text-xl font-bold text-secondary mt-1">
                  {viewingGroup.group_name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Leader: {viewingGroup.leader_name} ({viewingGroup.leader_email || "N/A"})
                </p>
              </div>

              <button
                onClick={() => setViewingGroup(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Group Members ({groupMembers.length})
              </h4>

              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading members...
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  No members recorded for this group.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {groupMembers.map((member) => {
                    const isLeader =
                      member.member_role === "leader" || member.is_leader;

                    return (
                      <div
                        key={member.id}
                        className="p-3.5 flex items-center justify-between gap-3 text-sm bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isLeader
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                          </div>

                          <div>
                            <span className="font-semibold text-secondary block">
                              {member.name}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail size={12} className="text-gray-400" />
                              {member.email}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isLeader ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Crown size={12} className="text-amber-600" /> Leader
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              <User size={12} /> Member
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingGroup(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-secondary font-semibold rounded-lg text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-secondary/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={26} />
            </div>

            <h3 className="text-xl font-bold text-secondary">
              Delete Assignment?
            </h3>

            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-secondary font-semibold">
                "{deleteTarget.title}"
              </strong>
              ?
            </p>

            <div className="mt-4 p-3 bg-slate-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              <p>
                <strong>Safety Rule:</strong> Assignments with existing student submission confirmations cannot be deleted to preserve academic records.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAssignment}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © 2026 Joineazy – Student Assignment and Group Management System. All rights reserved.
      </footer>
    </div>
  );
}

export default AdminDashboard;
