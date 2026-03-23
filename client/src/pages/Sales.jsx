import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Sales() {
  const [lastSale, setLastSale] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
  useEffect(() => {
    const fetchProducts = async () => {
      const data = await apiFetch("/products");

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.error("Invalid products response:", data);
      }
    };

    fetchProducts();
  }, []);

  const increaseQty = (id) => {
    const product = products.find((p) => p.id === id);

    setCart(
      cart.map((item) => {
        if (item.id === id) {
          if (item.quantity >= product.quantity) {
            alert("Stock limit reached");
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      }),
    );
  };

  const decreaseQty = (id) => {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase()),
      )
    : [];
  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      // 🚫 Prevent exceeding stock
      if (existing.quantity >= product.quantity) {
        alert("Not enough stock!");
        return;
      }

      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleCheckout = () => {
    // 🚫 Prevent empty cart
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    setLoading(true);

    apiFetch("/sales", {
      method: "POST",
      body: JSON.stringify({ cart, total, paymentMethod }),
    })
      .then(() => {
        alert("Sale completed!");

        // ✅ Save receipt data
        setLastSale({
          items: cart,
          total: total,
          date: new Date().toLocaleString(),
        });

        setCart([]);

        // Refresh products
        return apiFetch("/products");
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Invalid products response:", data);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Something went wrong!");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* LEFT: PRODUCTS */}
      <div className="bg-white p-4 rounded shadow">
        <button
          onClick={handleLogout}
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
        <h1 className="text-2xl font-bold mb-4">POINT OF SALE </h1>
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 p-2 border w-full rounded"
        />
        <ul className="space-y-2">
          {filteredProducts.map((product) => (
            <li
              key={product.id}
              className="p-4 bg-white rounded shadow hover:shadow-md transition"
            >
              <p className="font-semibold text-lg">{product.name}</p>

              <p className="text-gray-600">GHS {product.price}</p>

              <p className="text-sm text-gray-500">Stock: {product.quantity}</p>
              <button
                onClick={() => addToCart(product)}
                disabled={product.quantity === 0}
                className={`mt-2 px-3 py-1 rounded text-white ${
                  product.quantity === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600"
                }`}
              >
                {product.quantity === 0 ? "Out of Stock" : "Add to Cart"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT: CART */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Cart</h2>

        {cart.length === 0 ? (
          <p>No items in cart</p>
        ) : (
          <ul className="space-y-2">
            {cart.map((item) => (
              <li
                key={item.id}
                className="p-4 bg-white rounded shadow flex justify-between items-center"
              >
                {/* LEFT SIDE */}
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    GHS {item.price} x {item.quantity}
                  </p>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="px-2 bg-red-500 text-white rounded"
                  >
                    -
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() => increaseQty(item.id)}
                    className="px-2 bg-green-500 text-white rounded"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="text-2xl font-bold mt-4 border-t pt-4">
          Total: GHS {total}
        </h3>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="mt-4 p-2 border w-full rounded"
        >
          <option>Cash</option>
          <option>Mobile Money</option>
          <option>Card</option>
        </select>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded text-white ${
            loading ? "bg-gray-400" : "bg-blue-700"
          }`}
        >
          {loading ? "Processing..." : "Checkout"}
        </button>
      </div>

      {lastSale && (
        <div className="mt-8 bg-white p-4 rounded shadow">
          <h2 className="text-2xl font-bold mb-2">Receipt</h2>

          <p className="text-sm text-gray-600 mb-2">{lastSale.date}</p>

          <ul className="space-y-1">
            {lastSale.items.map((item, index) => (
              <li key={index} className="flex justify-between">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>GHS {item.price * item.quantity}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-bold">Total: GHS {lastSale.total}</h3>
        </div>
      )}

      <button
        onClick={() => window.open("http://localhost:5000/export/sales")}
        className="mt-4 bg-green-700 text-white px-4 py-2 rounded"
      >
        Export Sales (CSV)
      </button>
    </div>
  );
}

export default Sales;
