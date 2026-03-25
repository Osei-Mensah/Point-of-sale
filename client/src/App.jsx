import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { login } from "./services/authService";
import SalesHistory from "./pages/SalesHistory";
import Layout from "./components/Layout";
import Reports from "./pages/Reports";

import Sales from "./pages/Sales";
import Products from "./pages/Products";

function LoginPage() {
  const { isAuthenticated, setAuthData } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/sales");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);

      if (res.accessToken) {
        const base64Payload = res.accessToken.split(".")[1];
        const payload = JSON.parse(atob(base64Payload));

        setAuthData({
          user: payload,
          isAuthenticated: true,
        });

        navigate("/sales");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">POS Login</h1>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={["admin", "cashier"]}>
            <Layout title="Sales">
              <Sales />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Layout title="Products">
              <Products />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sales-history"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Layout title="Sales History">
              <SalesHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Layout title="Reports">
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
