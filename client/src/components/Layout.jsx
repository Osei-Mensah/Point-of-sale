import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShoppingCart, Package, History, BarChart3, User2 } from "lucide-react";

const navItems = [
  {
    name: "Sales",
    path: "/sales",
    roles: ["admin", "cashier"],
    icon: ShoppingCart,
  },
  {
    name: "Products",
    path: "/products",
    roles: ["admin"],
    icon: Package,
  },
  {
    name: "Sales History",
    path: "/sales-history",
    roles: ["admin"],
    icon: History,
  },
  {
    name: "Reports",
    path: "/reports",
    roles: ["admin"],
    icon: BarChart3,
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
      <div className="w-52 bg-gray-900 text-white flex flex-col justify-between">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-6">POS System</h1>

          {/* NAVIGATION */}
          <nav className="space-y-3">
            {navItems.map((item) => {
              if (!user || !item.roles.includes(user.role)) return null;

              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                    location.pathname === item.path
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {/* LOGOUT */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <User2
              className="bg-gray-50 rounded-full p-[0.18rem]"
              size={28}
              color="#111827"
            />
            <div>
              <h3 className="text-sm font-semibold leading-3">{user.email}</h3>
              <p className="text-xs font-light">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-5 bg-red-500 hover:bg-red-600 p-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* HEADER */}
        {/* <div className="bg-white shadow p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{title || "Dashboard"}</h2>
          <div className="text-sm text-gray-600">
            {user && (
              <>
                <span className="mr-4">Role: {user.role}</span>
                <span>User ID: {user.id}</span>
              </>
            )}
          </div>
        </div> */}

        {/* PAGE CONTENT */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>{" "}
    </div>
  );
}

export default Layout;
