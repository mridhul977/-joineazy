import { useState, useEffect } from "react";
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import {
  Users,
  ClipboardList,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import api from "./services/api";

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    return token && saved ? "dashboard" : "home";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Verify stored token if on dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && page === "dashboard") {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          // Token expired or invalid
          logout();
        });
    }
  }, [page]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setSuccess(
        response.data.message || "Registration successful! You can now log in."
      );
      setForm({ name: "", email: "", password: "" });
      setPage("login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setUser(response.data.user);
      setSuccess("Login successful!");
      setForm({ name: "", email: "", password: "" });
      setPage("dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setForm({ name: "", email: "", password: "" });
    setPage("home");
    setSuccess("");
    setError("");
  };

  // Render Dashboard
  if (page === "dashboard" && user) {
    if (user.role === "admin") {
      return <AdminDashboard user={user} onLogout={logout} />;
    }
    return <StudentDashboard user={user} onLogout={logout} />;
  }

  // Render Login / Register Auth View
  if (page === "login" || page === "register") {
    const isRegister = page === "register";

    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-primary items-center justify-center text-white font-bold text-2xl shadow-sm mb-3">
              J
            </div>
            <h1 className="text-3xl font-extrabold text-secondary tracking-tight">
              Joineazy
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Student Assignment & Group Management System
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-secondary text-center">
              {isRegister ? "Create Student Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-gray-500 text-center mt-1">
              {isRegister
                ? "Register as a student to collaborate in project groups."
                : "Enter your registered credentials to sign in."}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={isRegister ? handleRegister : handleLogin}
            className="space-y-4"
          >
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Alex Johnson"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="name@university.edu"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-600">
            {isRegister ? "Already have an account?" : "Need a student account?"}{" "}
            <button
              onClick={() => {
                setPage(isRegister ? "login" : "register");
                setError("");
                setSuccess("");
              }}
              className="text-primary font-bold hover:underline"
            >
              {isRegister ? "Sign in" : "Register here"}
            </button>
          </div>

          <button
            onClick={() => {
              setPage("home");
              setError("");
              setSuccess("");
            }}
            className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-700 transition"
          >
            ← Back to Joineazy Home
          </button>
        </div>
      </div>
    );
  }

  // Render Landing Page
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 sm:px-12 py-5 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
            J
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Joineazy
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPage("login");
              setError("");
              setSuccess("");
            }}
            className="px-4 py-2 text-secondary font-semibold text-sm hover:text-primary transition"
          >
            Sign In
          </button>

          <button
            onClick={() => {
              setPage("register");
              setError("");
              setSuccess("");
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 sm:py-24 flex-1">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-6 text-xs font-semibold text-primary bg-blue-50 border border-blue-100 rounded-full">
            <Sparkles size={14} /> Student Assignment & Group Collaboration
          </span>

          <h2 className="text-4xl sm:text-6xl font-extrabold text-secondary leading-tight tracking-tight">
            Manage Academic Projects.
            <span className="text-primary block mt-1">Together with Ease.</span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
            Joineazy empowers university students to organize into project groups,
            track assignment deadlines, access shared OneDrive deliverables, and
            confirm group submissions with faculty transparency.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setPage("register")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition shadow-sm"
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => setPage("login")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-secondary rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
            >
              <span>Sign In to Dashboard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<Users size={28} />}
            title="Group Management"
            description="Create project teams, invite registered classmates by email, view individual group members, and collaborate seamlessly."
          />

          <FeatureCard
            icon={<ClipboardList size={28} />}
            title="Assignment Tracking"
            description="Stay on top of assignment instructions, OneDrive resource links, due dates, and real-time team submission status."
          />

          <FeatureCard
            icon={<ShieldCheck size={28} />}
            title="Faculty Administration"
            description="Faculty administrators can create assignments, target specific student groups, monitor submissions, and track group completion rates."
          />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-500 border-t border-gray-200 bg-white">
        © 2026 Joineazy – Student Assignment and Group Management System. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-7 bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition">
      <div className="mb-4 w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-secondary">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

export default App;
