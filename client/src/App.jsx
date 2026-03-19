import { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    barcode: "",
  });

  const [cart, setCart] = useState([]);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const increaseQty = (id) => {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
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
  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
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

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    fetch("http://localhost:5000/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then(() => {
        alert("Product added!");

        // Refresh products
        fetch("http://localhost:5000/products")
          .then((res) => res.json())
          .then((data) => setProducts(data));
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetch("http://localhost:5000/products")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setProducts(data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Products</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <input
          type="text"
          name="category"
          placeholder="Category"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          type="number"
          name="price"
          placeholder="Price"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          type="text"
          name="barcode"
          placeholder="Barcode"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Product
        </button>
      </form>
      {products.length === 0 ? (
        <p>No products yet</p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id} className="p-4 bg-white shadow rounded">
              <p className="font-semibold">{product.name}</p>
              <p>GHS {product.price}</p>
              <p>Stock: {product.quantity}</p>

              <button
                onClick={() => addToCart(product)}
                className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
              >
                Add to Cart
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-2xl font-bold mt-8 mb-4">Cart</h2>

      {cart.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        <ul className="space-y-2">
          {cart.map((item) => (
            <li key={item.id} className="p-4 bg-gray-100 rounded">
              <p>{item.name}</p>
              <p>GHS {item.price}</p>
              <p>Qty: {item.quantity}</p>

              <button onClick={() => increaseQty(item.id)}>+</button>
              <button onClick={() => decreaseQty(item.id)}>-</button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="text-xl font-bold mt-4">Total: GHS {total}</h3>
    </div>
  );
}

export default App;
