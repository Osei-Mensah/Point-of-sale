import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import { useNavigate } from "react-router-dom";

import { useLocation } from "react-router-dom";

const getProvider = (phone) => {
  if (
    phone.startsWith("024") ||
    phone.startsWith("054") ||
    phone.startsWith("055")
  )
    return "mtn";

  if (phone.startsWith("020") || phone.startsWith("050")) return "vod";

  if (phone.startsWith("027") || phone.startsWith("057")) return "tigo";

  return "mtn"; // fallback
};

const formatPhone = (phone) => {
  if (phone.startsWith("0")) {
    return "233" + phone.slice(1);
  }
  return phone;
};
function Sales() {
  const [audioCtx] = useState(
    () => new (window.AudioContext || window.webkitAudioContext)(),
  );
  const [lastSale, setLastSale] = useState(null);
  const [verifiedRef, setVerifiedRef] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [duplicateProducts, setDuplicateProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pointsToUse, setPointsToUse] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.floor(pointsToUse / 10);
  const finalTotal = total - discount;

  const change = amountPaid ? amountPaid - finalTotal : 0;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get("reference");

    // 🚫 Prevent duplicate verification
    if (!reference || reference === verifiedRef) return;

    setVerifiedRef(reference);

    console.log("Payment reference detected:", reference);

    setLoading(true);

    apiFetch("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ reference }),
    })
      .then((res) => {
        // 🔥 Fetch real sale from backend
        return apiFetch(`/sales/${res.saleId}`);
      })
      .then((sale) => {
        setLastSale({
          id: sale.id,
          items: sale.items,
          total: sale.total_amount,
          amountPaid: sale.amount_paid,
          change: sale.change,
          paymentMethod: sale.payment_method,
          date: new Date(sale.created_at).toLocaleString(),
        });

        setCart([]);
        setSelectedCustomer(null);
        setCustomerSearch("");
        setPointsToUse("");

        return apiFetch("/products");
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
        }

        // 🔴 Clean URL (remove reference param)
        navigate("/sales", { replace: true });
      })
      .catch((err) => {
        console.error("Verification error:", err);

        // 🔴 HANDLE ALREADY PROCESSED PAYMENT (VERY IMPORTANT)
        const errorMessage =
          err?.response?.error || err?.error || err?.message || "";

        if (errorMessage.includes("already been processed")) {
          console.warn("Payment already processed via webhook");

          setLastSale({
            id: "Already Processed",
            items: cart,
            total: total,
            amountPaid: total,
            change: 0,
            paymentMethod: "Paystack",
            date: new Date().toLocaleString(),
          });

          setCart([]);
          navigate("/sales", { replace: true });
          return;
        }
        alert("Payment verification failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location.search, verifiedRef]);
  const handleBarcodeScan = async (barcode) => {
    try {
      const products = await apiFetch(`/products/barcode/${barcode}`);

      if (!products || products.error) {
        alert("Product not found!");
        return;
      }

      // 🔴 MULTIPLE PRODUCTS
      if (products.length > 1) {
        setDuplicateProducts(products);
        return;
      }

      const product = products[0];

      if (product.quantity <= 0) {
        alert("Product out of stock!");
        return;
      }

      // 🔊 Beep
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);

      addToCart(product);
    } catch (err) {
      console.error("Barcode scan failed:", err);
      alert("Error scanning product");
    }
  };
  useEffect(() => {
    let buffer = "";

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "Enter") {
        if (buffer.length > 0) {
          handleBarcodeScan(buffer);
          buffer = "";
        }
        return;
      }

      // Accept letters and numbers
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  useEffect(() => {
    if (!customerSearch) {
      setCustomers([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      apiFetch(`/customers?search=${customerSearch}`)
        .then((data) => setCustomers(data))
        .catch((err) => console.error(err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    if (!user || !user.email) {
      alert("User not authenticated properly");
      return;
    }

    const discount = Math.floor(pointsToUse / 10);
    const finalTotal = total - discount;

    // ✅ CASH FLOW
    if (paymentMethod === "Cash") {
      if (Number(amountPaid) < finalTotal) {
        alert("Insufficient payment!");
        return;
      }

      setLoading(true);

      apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          cart,
          total,
          paymentMethod: "cash",
          amountPaid: Number(amountPaid),
          customer_id: selectedCustomer?.id || null,
          points_used: Number(pointsToUse) || 0,
        }),
      })
        .then((res) => apiFetch(`/sales/${res.saleId}`))
        .then((sale) => {
          setLastSale({
            id: sale.id,
            items: sale.items,
            total: sale.total_amount,
            amountPaid: sale.amount_paid,
            change: sale.change,
            paymentMethod: sale.payment_method,
            date: new Date(sale.created_at).toLocaleString(),
          });

          setCart([]);
          setSelectedCustomer(null);
          setCustomerSearch("");
          setPointsToUse("");
        })
        .finally(() => setLoading(false));

      return;
    }

    if (finalTotal <= 0) {
      alert("Invalid amount");
      return;
    }

    if (paymentMethod === "Mobile Money") {
      if (!selectedCustomer) {
        alert("Select a customer");
        return;
      }

      if (!selectedCustomer.phone) {
        alert("Customer must have a phone number");
        return;
      }

      setLoading(true);

      try {
        const res = await apiFetch("/payments/initialize", {
          method: "POST",
          body: JSON.stringify({
            email: selectedCustomer.email || user.email,
            amount: finalTotal,
            cart,
            customer_id: selectedCustomer.id,
            points_used: Number(pointsToUse) || 0,
            phone: formatPhone(selectedCustomer.phone),
            provider: getProvider(selectedCustomer.phone),
          }),
        });

        window.location.href = res.authorization_url;
      } catch (err) {
        alert("Payment failed");
        setLoading(false);
      }

      return;
    }
    // ✅ PAYSTACK FLOW
    setLoading(true);

    apiFetch("/payments/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: finalTotal,
        cart,
        customer_id: selectedCustomer?.id || null,
        points_used: Number(pointsToUse) || 0,
      }),
    })
      .then((res) => {
        console.log("PAYSTACK INIT RESPONSE:", res);
        if (!res.authorization_url) {
          console.error("Invalid Paystack response:", res);
          alert("Payment initialization failed");
          setLoading(false);
          return;
        }

        window.location.href = res.authorization_url;
      })
      .catch((err) => {
        console.error("Payment init error:", err);
        alert(err?.error || "Payment failed");
        setLoading(false);
      });
  };

  const handleCreateCustomer = async () => {
    try {
      const data = await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });

      // ✅ Auto-select new customer
      setSelectedCustomer(data.customer || newCustomer);
      setCustomerSearch(newCustomer.name);

      // Reset form
      setShowAddCustomer(false);
      setNewCustomer({ name: "", phone: "", email: "" });
      setCustomers([]);
    } catch (err) {
      console.error(err);
      alert("Failed to create customer");
    }
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
        <input
          type="text"
          placeholder="Scan or type barcode..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && barcodeInput.trim() !== "") {
              handleBarcodeScan(barcodeInput.trim());
              setBarcodeInput("");
            }
          }}
          className="mb-4 p-2 border w-full rounded bg-yellow-50"
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
                  : product.quantity <= 5
                    ? "bg-yellow-100 border border-yellow-400"
                    : "bg-gray-50 hover:shadow-md"
              }`}
            >
              <p className="font-semibold text-lg">{product.name}</p>
              <p className="text-gray-600">GHS {product.price}</p>
              <p className="text-sm text-gray-500">
                Stock: {product.quantity}
                {product.quantity > 0 && product.quantity <= 5 && (
                  <span className="ml-2 text-yellow-600 font-semibold">
                    (Low!)
                  </span>
                )}
              </p>{" "}
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

        <div className="mb-4">
          <label className="block font-semibold">Customer</label>

          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="border p-2 w-full"
          />

          {customers.length > 0 && (
            <div className="border bg-white max-h-40 overflow-y-auto">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setCustomerSearch(c.name);
                    setCustomers([]);
                  }}
                >
                  {c.name} — {c.phone}
                </div>
              ))}
            </div>
          )}

          {customerSearch && customers.length === 0 && (
            <div className="border p-2 bg-yellow-50">
              <p className="text-sm mb-2">No customer found</p>
              <button
                className="bg-blue-500 text-white px-2 py-1"
                onClick={() => setShowAddCustomer(true)}
              >
                Add New Customer
              </button>
            </div>
          )}

          {showAddCustomer && (
            <div className="border p-3 mt-2 bg-gray-50">
              <h4 className="font-semibold mb-2">New Customer</h4>

              <input
                type="text"
                placeholder="Name"
                className="border p-1 w-full mb-2"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Phone"
                className="border p-1 w-full mb-2"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />

              <input
                type="email"
                placeholder="Email"
                className="border p-1 w-full mb-2"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
              />

              <button
                className="bg-green-500 text-white px-3 py-1"
                onClick={handleCreateCustomer}
              >
                Save Customer
              </button>
            </div>
          )}
          {selectedCustomer && (
            <div className="mt-2 text-sm text-green-600">
              Selected: {selectedCustomer.name}
              <br />
              Points: {selectedCustomer.points || 0}
            </div>
          )}
        </div>
        {selectedCustomer && (
          <div className="mb-4">
            <label className="block font-semibold">Use Points</label>
            <input
              type="number"
              placeholder="Enter points to redeem"
              value={pointsToUse}
              onChange={(e) => {
                const value = Number(e.target.value);

                if (selectedCustomer && value > selectedCustomer.points) {
                  alert("Cannot use more points than available");
                  return;
                }

                setPointsToUse(value);
              }}
              className="border p-2 w-full"
            />
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h3 className="text-2xl font-bold">Total: GHS {total}</h3>
          <p className="mt-2 text-lg">
            Change
            <span className={change < 0 ? "text-red-500" : "text-green-600"}>
              GHS {change}
            </span>
          </p>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-4 p-2 border w-full rounded"
          >
            <option>Cash</option>
            <option>Mobile Money</option>
            <option>Card</option>
          </select>

          <input
            type="number"
            placeholder="Amount Paid"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="mt-2 p-2 border w-full rounded"
          />

          {selectedCustomer && pointsToUse > 0 && (
            <div className="text-sm text-blue-600 mt-2">
              Discount: GHS {Math.floor(pointsToUse / 10)} <br />
              Final Total: GHS {total - Math.floor(pointsToUse / 10)}
            </div>
          )}
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
            <h2 className="text-center font-bold text-base">NN VENTURES</h2>
            <p className="text-center text-xs">Point of Sale System</p>{" "}
            <p className="text-center text-xs">ID: {lastSale.id} </p>
            <p className="text-center text-xs mb-2">{lastSale.date}</p>
            <div className="border-t border-dashed my-2"></div>
            <p className="text-center text-xs mb-2">
              Payment: {lastSale.paymentMethod}
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
            <div className="border-t border-dashed my-2"></div>
            <div className="flex justify-between">
              <span>Total</span>
              <span>GHS {lastSale.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>GHS {lastSale.amountPaid}</span>
            </div>
            <div className="flex justify-between font-bold">
              {lastSale.paymentMethod === "cash" && (
                <div className="flex justify-between font-bold">
                  <span>Change</span>
                  <span>GHS {lastSale.change}</span>
                </div>
              )}
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

      {duplicateProducts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-[400px]">
            <h2 className="text-xl font-bold mb-4">Multiple products found</h2>

            <ul className="space-y-2">
              {duplicateProducts.map((p) => (
                <li
                  key={p.id}
                  onClick={() => {
                    addToCart(p);
                    setDuplicateProducts([]);
                  }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-100"
                >
                  {p.name} — GHS {p.price}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setDuplicateProducts([])}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
