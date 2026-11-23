import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Plus,
  LogOut,
  ExternalLink,
  CheckCircle,
  Clock,
  UserPlus,
  Crown,
  X,
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw,
  Shield,
  User,
} from "lucide-react";
import api from "../services/api";

function StudentDashboard({ user, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Group Members Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Assignment Submission Confirmation Modal State
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [confirmingSubmission, setConfirmingSubmission] = useState(false);

  // Fetch groups and assignments
  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Create Group
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

      setSuccess(response.data.message || "Group created successfully!");
      setGroupName("");
      await fetchDashboardData(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create group.");
    } finally {
      setCreating(false);
    }
  };

  // Open Members Modal
  const handleOpenMembersModal = async (group) => {
    setSelectedGroup(group);
    setMemberError("");
    setMemberSuccess("");
    setNewMemberEmail("");
    setLoadingMembers(true);

    try {
      const response = await api.get(`/groups/${group.id}/members`);
      setGroupMembers(response.data.members || []);
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Failed to load group members."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  // Refresh members in modal
  const refreshMembers = async (groupId) => {
    try {
      setLoadingMembers(true);
      const response = await api.get(`/groups/${groupId}/members`);
      setGroupMembers(response.data.members || []);

      // Also refresh dashboard groups to update member count
      const groupRes = await api.get("/groups/my-groups");
      setGroups(groupRes.data.groups || []);
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Failed to refresh group members."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle Add Member by Email
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !selectedGroup) return;

    setAddingMember(true);
    setMemberError("");
    setMemberSuccess("");

    try {
      const response = await api.post(
        `/groups/${selectedGroup.id}/members`,
        { email: newMemberEmail.trim() }
      );

      setMemberSuccess(
        response.data.message || "Member added successfully!"
      );
      setNewMemberEmail("");

      // Immediately refresh the member list and group count
      await refreshMembers(selectedGroup.id);
    } catch (err) {
      setMemberError(
        err.response?.data?.message || "Could not add student to group."
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Open 2-Step Confirmation Modal for Assignment Submission
  const handlePromptSubmission = (assignment) => {
    setPendingSubmission(assignment);
  };

  // Execute Submission Confirmation
  const handleConfirmSubmission = async () => {
    if (!pendingSubmission) return;

    setConfirmingSubmission(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/submissions/${pendingSubmission.id}/confirm`,
        { group_id: pendingSubmission.group_id }
      );

      setSuccess(
        response.data.message || "Assignment submission confirmed successfully!"
      );
      setPendingSubmission(null);
      await fetchDashboardData(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not confirm submission."
      );
      setPendingSubmission(null);
      await fetchDashboardData(true);
    } finally {
      setConfirmingSubmission(false);
    }
  };

  // Check if current user is leader of selected group
  const isCurrentUserLeader =
    selectedGroup &&
    (selectedGroup.created_by === user.id ||
      selectedGroup.member_role === "leader" ||
      selectedGroup.is_leader);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium mt-4">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
              J
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">Joineazy</h1>
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Student Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-secondary">{user.name}</span>
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
              <RefreshCw size={18} className={refreshing ? "animate-spin text-primary" : ""} />
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-primary">
                Student Account
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
              Welcome back, {user.name}!
            </h2>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage your project groups, collaborate with classmates, and submit assignments.
            </p>
          </div>

          <div className="text-sm text-gray-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <Mail size={16} className="text-gray-400" />
            <span>{user.email}</span>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
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
          <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess("")} className="text-green-400 hover:text-green-600">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">My Project Groups</p>
              <p className="text-3xl font-extrabold text-secondary mt-1">{groups.length}</p>
              <p className="text-xs text-gray-400 mt-1">Groups you currently belong to</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center">
              <Users size={28} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Available Assignments</p>
              <p className="text-3xl font-extrabold text-secondary mt-1">{assignments.length}</p>
              <p className="text-xs text-gray-400 mt-1">Assignments assigned to your groups</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList size={28} />
            </div>
          </div>
        </div>

        {/* Create Group Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <div className="flex items-center gap-2 mb-2">
            <Users size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-secondary">Create a New Group</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Create a project group. As the creator, you will be the group leader and can add other registered students.
          </p>

          <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Distributed Systems Team Alpha"
              maxLength={100}
              required
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />

            <button
              type="submit"
              disabled={creating || !groupName.trim()}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm whitespace-nowrap"
            >
              <Plus size={18} />
              {creating ? "Creating Group..." : "Create Group"}
            </button>
          </form>
        </section>

        {/* My Groups Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-secondary">My Project Groups</h3>
              <p className="text-sm text-gray-500">
                View individual group members or add students if you are the group leader.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
              {groups.length} {groups.length === 1 ? "Group" : "Groups"}
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Users size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-700">No Groups Found</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                You haven't created or joined any project groups yet. Create one above to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {groups.map((group) => {
                const isLeader =
                  group.created_by === user.id ||
                  group.member_role === "leader" ||
                  group.is_leader;

                return (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-lg text-secondary leading-snug">
                          {group.group_name}
                        </h4>

                        {isLeader ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                            <Crown size={12} className="text-amber-600" />
                            Group Leader
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                            <User size={12} />
                            Member
                          </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-gray-400" />
                          <span>
                            Members:{" "}
                            <strong className="text-secondary">
                              {group.member_count}
                            </strong>
                          </span>
                        </div>

                        {group.leader_name && (
                          <div className="flex items-center gap-2">
                            <Crown size={15} className="text-amber-500" />
                            <span>
                              Leader:{" "}
                              <span className="font-medium text-gray-800">
                                {group.leader_name}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={14} />
                          <span>
                            Created {new Date(group.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleOpenMembersModal(group)}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-primary font-semibold py-2.5 px-4 rounded-lg text-sm transition"
                      >
                        <Users size={16} />
                        View Members
                      </button>

                      {isLeader && (
                        <button
                          onClick={() => handleOpenMembersModal(group)}
                          className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-blue-700 text-white font-medium py-2.5 px-3.5 rounded-lg text-sm transition shadow-sm"
                          title="Add Member"
                        >
                          <UserPlus size={16} />
                          <span className="hidden sm:inline">Add Member</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Assignments Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-secondary">My Assignments</h3>
              <p className="text-sm text-gray-500">
                Track assignments targeted at your groups and confirm submissions.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
              {assignments.length} {assignments.length === 1 ? "Assignment" : "Assignments"}
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-700">No Assignments Available</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                No assignments have been assigned to your groups yet. Check back once your professor assigns work.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const isSubmitted = assignment.submission_status === "submitted";

                return (
                  <div
                    key={`${assignment.id}-${assignment.group_id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Group: {assignment.group_name}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-secondary">
                          {assignment.title}
                        </h4>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                          isSubmitted
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <CheckCircle size={14} /> Submitted
                          </>
                        ) : (
                          <>
                            <Clock size={14} /> Pending Submission
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                      {assignment.description || "No description provided for this assignment."}
                    </p>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <span>
                            Deadline:{" "}
                            <strong className="text-gray-700 font-semibold">
                              {assignment.deadline
                                ? new Date(assignment.deadline).toLocaleString()
                                : "No deadline specified"}
                            </strong>
                          </span>
                        </div>

                        {isSubmitted && assignment.confirmed_at && (
                          <div className="flex items-center gap-2 text-green-700 font-medium">
                            <CheckCircle size={14} />
                            <span>
                              Confirmed on {new Date(assignment.confirmed_at).toLocaleString()}
                              {assignment.confirmed_by_name && ` by ${assignment.confirmed_by_name}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {assignment.onedrive_link && (
                          <a
                            href={assignment.onedrive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-blue-700 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-200"
                          >
                            <span>Open OneDrive Link</span>
                            <ExternalLink size={14} />
                          </a>
                        )}

                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-4 py-2 rounded-lg text-sm font-semibold border border-green-200">
                            <CheckCircle size={16} />
                            Submission Confirmed
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromptSubmission(assignment)}
                            className="inline-flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-sm"
                          >
                            <CheckCircle size={16} />
                            Confirm Submission
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* VIEW MEMBERS & ADD MEMBER MODAL */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-secondary/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-2xl w-full my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-primary">
                    Project Group
                  </span>
                  {isCurrentUserLeader && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      You are Leader
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-secondary">
                  {selectedGroup.group_name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Group Members: {groupMembers.length} {selectedGroup.max_limit ? `/ ${selectedGroup.max_limit}` : ""}
                </p>
              </div>

              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Member Feedback Notifications */}
              {memberError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    <span>{memberError}</span>
                  </div>
                  <button onClick={() => setMemberError("")}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {memberSuccess && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <span>{memberSuccess}</span>
                  </div>
                  <button onClick={() => setMemberSuccess("")}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Add Member Form (Visible only to Group Leader) */}
              {isCurrentUserLeader ? (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-secondary flex items-center gap-2">
                    <UserPlus size={16} className="text-primary" />
                    Add a Student to This Group
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    Enter the student's registered email address. Only registered students can be added.
                  </p>

                  <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="e.g. student@test.com"
                      required
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />

                    <button
                      type="submit"
                      disabled={addingMember || !newMemberEmail.trim()}
                      className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50 shadow-sm"
                    >
                      <UserPlus size={16} />
                      {addingMember ? "Adding..." : "Add Member"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-500 flex items-center gap-2">
                  <Shield size={16} className="text-gray-400 flex-shrink-0" />
                  <span>
                    Only the group leader (
                    <strong className="text-gray-700">
                      {selectedGroup.leader_name || "Group Leader"}
                    </strong>
                    ) can add members to this group.
                  </span>
                </div>
              )}

              {/* Group Members List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-secondary uppercase tracking-wider">
                    Group Members ({groupMembers.length})
                  </h4>

                  <button
                    onClick={() => refreshMembers(selectedGroup.id)}
                    disabled={loadingMembers}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw size={12} className={loadingMembers ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>

                {loadingMembers ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading members...
                  </div>
                ) : groupMembers.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No members found in this group.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                    {groupMembers.map((member) => {
                      const isLeader =
                        member.member_role === "leader" || member.is_leader;
                      const isSelf = member.user_id === user.id;

                      return (
                        <div
                          key={member.id}
                          className={`p-4 flex items-center justify-between gap-3 ${
                            isSelf ? "bg-blue-50/30" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                isLeader
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-secondary text-sm">
                                  {member.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold bg-blue-100 text-primary px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Mail size={12} className="text-gray-400" />
                                {member.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isLeader ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Crown size={12} className="text-amber-600" />
                                Leader
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                <User size={12} />
                                Member
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-secondary font-semibold rounded-lg text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-STEP CONFIRMATION MODAL FOR ASSIGNMENT SUBMISSION */}
      {pendingSubmission && (
        <div className="fixed inset-0 z-50 bg-secondary/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertCircle size={26} />
            </div>

            <h3 className="text-xl font-bold text-secondary">
              Confirm Assignment Submission?
            </h3>

            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to confirm that group{" "}
              <strong className="text-secondary font-semibold">
                "{pendingSubmission.group_name}"
              </strong>{" "}
              has completed and submitted{" "}
              <strong className="text-secondary font-semibold">
                "{pendingSubmission.title}"
              </strong>
              ?
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-gray-500 border border-gray-100">
              <p>
                <strong>Note:</strong> Please make sure your team has uploaded the final project files to the provided OneDrive folder before confirming.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingSubmission(null)}
                disabled={confirmingSubmission}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmission}
                disabled={confirmingSubmission}
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
              >
                <CheckCircle size={16} />
                {confirmingSubmission ? "Confirming..." : "Yes, Confirm Submission"}
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

export default StudentDashboard;
