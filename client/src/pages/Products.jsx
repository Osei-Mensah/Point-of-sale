import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";

function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    barcode: "",
  });
  const [editingId, setEditingId] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const deleteProduct = (id) => {
    apiFetch(`/products/${id}`, {
      method: "DELETE",
    })
      .then(() => {
        setProducts(products.filter((p) => p.id !== id));
      })
      .catch((err) => console.error(err));
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/products/${editingId}` : "/products";

    apiFetch(url, {
      method,
      body: JSON.stringify(form),
    })
      .then(() => {
        alert(editingId ? "Product updated!" : "Product added!");

        // Reset form
        setForm({
          name: "",
          category: "",
          price: "",
          quantity: "",
          barcode: "",
        });

        setEditingId(null);

        return apiFetch("/products");
      })
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  };
  useEffect(() => {
    apiFetch("/products")
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
          value={form.name}
          placeholder="Product Name"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <input
          type="text"
          name="category"
          value={form.category}
          placeholder="Category"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          type="number"
          name="price"
          value={form.price}
          placeholder="Price"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <input
          type="number"
          name="quantity"
          value={form.quantity}
          placeholder="Quantity"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <input
          type="text"
          name="barcode"
          value={form.barcode}
          placeholder="Barcode"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <button
          type="submit"
          className={`px-4 py-2 rounded text-white ${
            editingId ? "bg-yellow-500" : "bg-blue-600"
          }`}
        >
          {editingId ? "Update Product" : "Add Product"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setForm({
                name: "",
                category: "",
                price: "",
                quantity: "",
                barcode: "",
              });
              setEditingId(null);
            }}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        )}
      </form>
      {products.length === 0 ? (
        <p>No products yet</p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li
              key={product.id}
              className={`p-4 rounded shadow ${
                product.quantity === 0
                  ? "bg-gray-200"
                  : product.quantity <= 5
                    ? "bg-yellow-100 border border-yellow-400"
                    : "bg-white"
              }`}
            >
              {" "}
              <p className="font-semibold">{product.name}</p>
              <p>GHS {product.price}</p>
              <p>
                Stock: {product.quantity}
                {product.quantity > 0 && product.quantity <= 5 && (
                  <span className="ml-2 text-yellow-600 font-semibold">
                    (Low!)
                  </span>
                )}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setForm({
                      name: product.name,
                      category: product.category || "",
                      price: product.price,
                      quantity: product.quantity,
                      barcode: product.barcode || "",
                    });
                    setEditingId(product.id);
                  }}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteProduct(product.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Products;
