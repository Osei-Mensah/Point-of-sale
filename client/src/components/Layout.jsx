import { Link } from "react-router-dom";

function Layout({ children }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-6">POS System</h1>

        <nav className="space-y-3">
          <Link to="/" className="block hover:text-gray-300">
            Sales
          </Link>

          <Link to="/products" className="block hover:text-gray-300">
            Products
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">{children}</div>
    </div>
  );
}

export default Layout;
