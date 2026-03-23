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

    apiFetch("/products", {
      method: "POST",
      body: JSON.stringify(form),
    })
      .then(() => {
        alert("Product added!");
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
                onClick={() => deleteProduct(product.id)}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Products;
