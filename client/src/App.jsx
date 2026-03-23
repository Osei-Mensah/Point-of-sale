import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { login } from "./services/authService";

import Sales from "./pages/Sales";
import Products from "./pages/Products";

function LoginPage() {
  const handleLogin = async () => {
    const res = await login("admin@test.com", "123456");

    if (res.accessToken) {
      window.location.href = "/sales"; // 🔥 force full reload
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Login</h1>
      <button onClick={handleLogin}>Login</button>
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
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={["admin", "cashier"]}>
            <Sales />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Products />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
