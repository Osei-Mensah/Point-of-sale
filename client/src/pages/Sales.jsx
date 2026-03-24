import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import { useNavigate } from "react-router-dom";

function Sales() {
  const [lastSale, setLastSale] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      .then((res) => {
        alert("Sale completed!");

        setLastSale({
          id: res.saleId,
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
    <div className="flex h-full gap-6">
      {/* LEFT: PRODUCTS */}
      <div className="w-[70%] bg-white p-4 rounded shadow flex flex-col">
        <h1 className="text-2xl font-bold mb-4">POINT OF SALE </h1>
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 p-2 border w-full rounded"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-1">
          {" "}
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => {
                if (product.quantity > 0) addToCart(product);
              }}
              className={`p-4 rounded shadow transition flex flex-col justify-between cursor-pointer ${
                product.quantity === 0
                  ? "bg-gray-200 cursor-not-allowed"
                  : "bg-gray-50 hover:shadow-md"
              }`}
            >
              <p className="font-semibold text-lg">{product.name}</p>

              <p className="text-gray-600">GHS {product.price}</p>

              <p className="text-sm text-gray-500">Stock: {product.quantity}</p>
            </div>
          ))}
        </div>{" "}
      </div>

      {/* RIGHT: CART */}
      <div className="w-[30%] bg-white p-4 rounded shadow flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Cart</h2>

        <div className="flex-1 overflow-y-auto">
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
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="text-2xl font-bold">Total: GHS {total}</h3>

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
            className={`mt-4 px-4 py-2 rounded text-white w-full ${
              loading ? "bg-gray-400" : "bg-blue-700"
            }`}
          >
            {loading ? "Processing..." : "Checkout"}
          </button>
        </div>
        {lastSale && (
          <div
            id="receipt"
            className="mt-6 border-t pt-4 text-sm font-mono max-w-[300px] mx-auto"
          >
            <h2 className="text-center font-bold text-base">RECEIPT</h2>
            <p className="text-center text-xs">ID: {lastSale.id} </p>
            <p className="text-center text-xs mb-2">{lastSale.date}</p>
            <p className="text-center text-xs mb-2">
              Payment: {paymentMethod}
            </p>{" "}
            <div className="border-t border-dashed my-2"></div>
            <ul className="space-y-1">
              {lastSale.items.map((item, index) => (
                <li key={index} className="flex justify-between">
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span>{item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-dashed my-2"></div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>GHS {lastSale.total}</span>
            </div>
            <p className="text-center text-xs mt-3">
              Thank you for your purchase!
            </p>
            <button
              onClick={() => window.print()}
              className="mt-3 w-full bg-black text-white py-1 rounded text-xs"
            >
              Print Receipt
            </button>
          </div>
        )}
      </div>

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
