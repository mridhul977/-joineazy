
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { useState } from "react";
import { Users, ClipboardList, ShieldCheck, ArrowRight } from "lucide-react";
import api from "./services/api";

function App() {
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/register", form);

      setSuccess(response.data.message);
      setForm({ name: "", email: "", password: "" });
      setPage("login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setSuccess("Login successful!");

      // Dashboard navigation will be implemented next.
      setPage("dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setForm({ name: "", email: "", password: "" });
    setPage("home");
    setSuccess("");
    setError("");
  };

  const user = JSON.parse(localStorage.getItem("user") || "null");

if (page === "dashboard" && user) {
  if (user.role === "student") {
    return (
      <StudentDashboard
        user={user}
        onLogout={logout}
      />
    );
  }

  return (
  <AdminDashboard
    user={user}
    onLogout={logout}
  />
);
}

  if (page === "login" || page === "register") {
    const isRegister = page === "register";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-primary text-center">
            Joineazy
          </h1>

          <h2 className="text-2xl font-bold text-secondary text-center mt-6">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>

          <p className="text-gray-500 text-center mt-2">
            {isRegister
              ? "Register to start collaborating."
              : "Login to continue to your workspace."}
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

          <form
            onSubmit={isRegister ? handleRegister : handleLogin}
            className="mt-6 space-y-4"
          >
            {isRegister && (
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="password"
              name="password"
              placeholder="Password (minimum 8 characters)"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Login"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            {isRegister ? "Already have an account?" : "New to Joineazy?"}
            <button
              onClick={() => {
                setPage(isRegister ? "login" : "register");
                setError("");
                setSuccess("");
              }}
              className="ml-2 text-primary font-semibold"
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>

          <button
            onClick={() => {
              setPage("home");
              setError("");
              setSuccess("");
            }}
            className="block mx-auto mt-5 text-gray-500 hover:text-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-5 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-primary">Joineazy</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage("login")}
            className="px-5 py-2 text-secondary font-medium hover:text-primary"
          >
            Login
          </button>

          <button
            onClick={() => setPage("register")}
            className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block px-4 py-2 mb-6 text-sm font-medium text-primary bg-blue-100 rounded-full">
            Simplify Your Academic Projects
          </span>

          <h2 className="text-4xl md:text-6xl font-bold text-secondary leading-tight">
            Manage Your Projects.
            <span className="text-primary"> Together.</span>
          </h2>

          <p className="mt-6 text-lg text-gray-600">
            Joineazy helps students collaborate in groups, track assignments,
            and manage project submissions — all in one place.
          </p>

          <button
            onClick={() => setPage("register")}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Explore Joineazy <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<Users size={30} />}
            title="Group Management"
            description="Create project groups and collaborate with your classmates."
          />

          <FeatureCard
            icon={<ClipboardList size={30} />}
            title="Assignment Tracking"
            description="View assignments, deadlines, and submission progress."
          />

          <FeatureCard
            icon={<ShieldCheck size={30} />}
            title="Admin Dashboard"
            description="Manage assignments and monitor student submissions."
          />
        </div>
      </main>

      <footer className="text-center py-6 text-gray-500 border-t bg-white">
        © 2026 Joineazy. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="mb-5 text-primary">{icon}</div>
      <h3 className="text-xl font-bold text-secondary">{title}</h3>
      <p className="mt-3 text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

export default App;
