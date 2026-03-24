import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    name: "Sales",
    path: "/sales",
    roles: ["admin", "cashier"],
  },
  {
    name: "Products",
    path: "/products",
    roles: ["admin"],
  },
  {
    name: "Sales History",
    path: "/sales-history",
    roles: ["admin"],
  },
];
function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/"); // redirect to login after logout
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-6">POS System</h1>

          {/* NAVIGATION */}
          <nav className="space-y-3">
            {navItems.map((item) => {
              // Check role access
              if (!user || !item.roles.includes(user.role)) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2 rounded transition ${
                    location.pathname === item.path
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* LOGOUT */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 p-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* HEADER */}
        <div className="bg-white shadow p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{title || "Dashboard"}</h2>
          <div className="text-sm text-gray-600">
            {user && (
              <>
                <span className="mr-4">Role: {user.role}</span>
                <span>User ID: {user.id}</span>
              </>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>{" "}
    </div>
  );
}

export default Layout;
