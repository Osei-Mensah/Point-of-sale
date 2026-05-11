import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import { useNavigate } from "react-router-dom";

import { useLocation } from "react-router-dom";
import {
  Banknote,
  Boxes,
  Cpu,
  Flame,
  Hammer,
  LayoutGrid,
  Smartphone,
  Snowflake,
  Wallet,
} from "lucide-react";

const getProvider = (phone) => {
  if (
    phone.startsWith("024") ||
    phone.startsWith("054") ||
    phone.startsWith("055")
  )
    return "mtn";

  if (phone.startsWith("020") || phone.startsWith("050")) return "vod";

  if (phone.startsWith("027") || phone.startsWith("057")) return "tigo";

  return "mtn";
};

const formatPhone = (phone) => {
  if (phone.startsWith("0")) {
    return "233" + phone.slice(1);
  }

  return phone;
};

function Sales() {
  const [lastSale, setLastSale] = useState(null);
  const [verifiedRef, setVerifiedRef] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [momoNumber, setMomoNumber] = useState("");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = total;

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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    if (!user || !user.email) {
      alert("User not authenticated properly");
      return;
    }

    const finalTotal = total;

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
        })
        .finally(() => setLoading(false));

      return;
    }

    if (finalTotal <= 0) {
      alert("Invalid amount");
      return;
    }

    if (paymentMethod === "Mobile Money") {
      setLoading(true);

      try {
        const res = await apiFetch("/payments/initialize", {
          method: "POST",
          body: JSON.stringify({
            email: user.email,
            amount: finalTotal,
            cart,
            phone: formatPhone(momoNumber),
            provider: getProvider(momoNumber),
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

  return (
    <div className="flex h-full ">
      {/* LEFT: PRODUCTS */}
      <div className="flex-1 p-4 rounded flex flex-col">
        <h1 className="text-2xl font-bold mb-4">POINT OF SALE </h1>
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 p-2 border w-full rounded"
        />
        <div className="overflow-auto scroll-hidden">
          <div
            className={`mb-4 flex gap-2 flex-wrap ${search.trim() !== "" && "hidden"}`}
          >
            {[
              { icon: LayoutGrid, category: "All" },
              { icon: Cpu, category: "Electricals & Electronics" },
              { icon: Snowflake, category: "AC & Refrigeration" },
              { icon: Flame, category: "LPG Products" },
              { icon: Hammer, category: "Hardware" },
              { icon: Boxes, category: "General" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="flex flex-col aspect-square w-[5.6rem] p-3 rounded-lg shadow bg-white ">
                  <Icon />
                  <div className="mt-3">
                    <p className="text-sm leading-3 font-semibold line-clamp-1">
                      {item.category}
                    </p>
                    <p className="text-[0.69rem] font-normal text-wrap overflow-hidden text-blue-400">
                      103 items
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  if (product.quantity > 0) addToCart(product);
                }}
                className={`p-3 aspect-square rounded shadow transition flex flex-col justify-between cursor-pointer ${
                  product.quantity === 0
                    ? "bg-gray-200 cursor-not-allowed"
                    : product.quantity <= 5
                      ? "bg-yellow-100 border border-yellow-400"
                      : "bg-gray-50 hover:shadow-md"
                }`}
              >
                <div className="w-[100%] aspect-[16/12] rounded-lg bg-gray-100"></div>
                <div className="">
                  <p className="font-semibold text-base leading-4">
                    {product.name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    GH¢{Number(product.price).toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-xs font-medium">
                    Stock: {product.quantity}
                    {product.quantity > 0 && product.quantity <= 5 && (
                      <span className="ml-2 text-yellow-600 font-semibold">
                        (Low!)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: CART */}
      <div className="w-[19rem] bg-white p-4 rounded shadow flex flex-col ">
        <h2 className="text-xl font-bold mb-4">Cart</h2>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p>No items in cart</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="p-3 gap-2 bg-white rounded-lg border flex h-20 overflow-hidden items-center w-[100%]"
                >
                  <div className="bg-gray-100 rounded-xl aspect-square h-[100%]"></div>
                  {/* LEFT SIDE */}
                  <div className="flex flex-1 justify-between">
                    <div className="flex flex-col">
                      <p className="font-semibold text-sm line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-xs font-semibold text-blue-500 pt-[0.1rem]">
                        GH¢{Number(item.price).toFixed(2)}
                        <span className="text-gray-500 ml-1">
                          {item.quantity}x
                        </span>
                      </p>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex flex-col self-end">
                      {/* <div>
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
                      </div> */}
                      <p className="text-xs font-semibold text-blue-500 pt-[0.1rem]">
                        GH¢{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4 mt-2">
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-[0.82rem] font-medium text-gray-500 flex justify-between">
              Sub Total: <span>GH¢{Number(total).toFixed(2)}</span>
            </p>
            {/* <p className="text-[0.82rem] font-medium text-gray-500 flex justify-between">
              Discount: <span>GH¢{Number(total).toFixed(2)}</span>
            </p> */}
            <h3 className="text-sm font-bold flex justify-between border-t border-gray-300 pt-1 mt-2">
              Total Amount: <span>GH¢{Number(total).toFixed(2)}</span>
            </h3>
          </div>

          <div className="flex justify-center gap-2 mt-3">
            {[
              { paymentMethod: "Cash", icon: Banknote },
              { paymentMethod: "Mobile Money", icon: Smartphone },
              { paymentMethod: "Card", icon: Wallet },
            ].map((item) => {
              let Icon = item.icon;
              return (
                <div
                  key={item.paymentMethod}
                  onClick={() => {
                    setPaymentMethod(item.paymentMethod);
                  }}
                >
                  <div
                    className={`border border-blue-400 ${paymentMethod == item.paymentMethod && "bg-blue-100/70"} w-[4.8rem] aspect-[16/10] rounded-lg flex-1 flex justify-center items-center`}
                  >
                    <Icon color="#3b82f6" size={19} />
                  </div>
                  <p className="text-[0.7rem] font-semibold text-center overflow-hidden text-wrap">
                    {item.paymentMethod}
                  </p>
                </div>
              );
            })}
          </div>
          {/* <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-4 p-2 border w-full rounded"
          >
            <option>Cash</option>
            <option>Mobile Money</option>
            <option>Card</option>
          </select> */}

          {paymentMethod === "Mobile Money" && (
            <input
              type="text"
              placeholder="Enter MoMo number"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
              className="mt-2 p-2 border w-full rounded"
            />
          )}

          <input
            type="number"
            placeholder="Amount Paid"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="mt-2 p-2 border w-full rounded"
          />

          <button
            onClick={handleCheckout}
            disabled={loading}
            className={`mt-4 px-4 py-2 rounded-lg text-white w-full ${
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

      {/* <button
        onClick={() => window.open("http://localhost:5000/export/sales")}
        className="mt-4 bg-green-700 text-white px-4 py-2 rounded"
      >
        Export Sales (CSV)
      </button> */}
    </div>
  );
}

export default Sales;
