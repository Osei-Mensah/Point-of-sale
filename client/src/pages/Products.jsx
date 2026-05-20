import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import Papa from "papaparse";

function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const deleteProduct = async (id) => {
    try {
      const res = await apiFetch(`/products/${id}`, {
        method: "DELETE",
      });

      if (res.error) {
        alert(res.error);
        return;
      }

      setProducts(products.filter((p) => p.id !== id));

      alert("Product deleted successfully");
    } catch (err) {
      console.error(err);

      alert(err?.error || "Failed to delete product");
    }
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
        });

        setEditingId(null);

        return apiFetch("/products");
      })
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setValidationErrors([]);
    setPreviewData([]);
    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;

        if (!data.length) {
          alert("CSV is empty");
          return;
        }

        // ✅ Required headers
        const requiredHeaders = ["name", "price"];

        const headers = Object.keys(data[0]);
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h),
        );

        if (missingHeaders.length > 0) {
          alert(`Missing headers: ${missingHeaders.join(", ")}`);
          setPreviewData([]);
          return;
        }

        const errors = [];

        data.forEach((row, index) => {
          const name = row.name?.trim();
          const price = Number(row.price);

          if (!name || isNaN(price)) {
            errors.push(`Row ${index + 1}: Invalid name or price`);
          }
        });

        setValidationErrors(errors);

        // Show first 5 rows
        setPreviewData(data.slice(0, 5));
      },
    });
  };

  const handleImport = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    if (validationErrors.length > 0) {
      alert("Fix CSV errors before uploading");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiFetch("/products/import", {
        method: "POST",
        body: formData,
      });

      if (data.error) {
        alert(data.error);
        return;
      }

      alert(
        `Import done!\nInserted: ${data.inserted}\nSkipped: ${data.skipped}`,
      );

      // Refresh products
      const updated = await apiFetch("/products");
      setProducts(updated);
    } catch (err) {
      console.error(err);
      alert("Import failed");
    }
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
    <div className=" flex h-full overflow-hidden">
      <div className="flex-1 overflow-auto scroll-hidden p-4">
        <h1 className="text-3xl font-bold mb-4">Products</h1>
        {/* <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input
          type="text"
          name="name"
          value={form.name}
          placeholder="Product Name"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              setShowNewCategoryInput(true);

              setForm({
                ...form,
                category: "",
              });

              return;
            }

            setShowNewCategoryInput(false);
            handleChange(e);
          }}
          className="border p-2 w-full"
        >
          <option value="">Select Category</option>
          <option value="__new__">+ Add New Category</option>

          {[
            ...new Set(
              products
                .map((product) => product.category?.trim().toLowerCase())
                .filter(Boolean),
            ),
          ].map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
        {showNewCategoryInput && (
          <input
            type="text"
            placeholder="Enter new category"
            value={newCategory}
            onChange={(e) => {
              const value = e.target.value;

              setNewCategory(value);

              setForm({
                ...form,
                category: value.trim(),
              });
            }}
            className="border p-2 w-full"
          />
        )}

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
              });
              setEditingId(null);
            }}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        )}
      </form> */}

        {/* <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Import Products (CSV)</h2>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-2"
        />

        <button
          onClick={handleImport}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Upload CSV
        </button>

        {previewData.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Preview (first 5 rows)</h3>
            <p className="text-sm text-gray-600">
              Total rows: {previewData.length}
            </p>

            <table className="w-full border text-sm">
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map((key) => (
                    <th key={key} className="border p-1">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="border p-1">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mt-4 text-red-600">
            <h3 className="font-bold">Validation Errors:</h3>
            <ul>
              {validationErrors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <p>Fix errors before uploading.</p>
          </div>
        )}
      </div> */}

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
      <div className="w-[20rem] bg-white px-5 py-8 rounded shadow">
        <h2 className="text-lg font-bold mb-1">
          {editingId ? "Edit Product" : "New Product"}
        </h2>
        <form onSubmit={handleSubmit} className="mb-5 space-y-2">
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
                });
                setEditingId(null);
              }}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          )}
        </form>
        <div className="">
          <h2 className="text-lg font-bold mb-1">Import Products (CSV)</h2>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mb-2 border p-2 w-full"
          />

          <button
            onClick={handleImport}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Upload CSV
          </button>

          {previewData.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Preview (first 5 rows)</h3>
              <p className="text-sm text-gray-600">
                Total rows: {previewData.length}
              </p>

              <table className="w-full border text-sm">
                <thead>
                  <tr>
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="border p-1">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="border p-1">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mt-4 text-red-600">
              <h3 className="font-bold">Validation Errors:</h3>
              <ul>
                {validationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p>Fix errors before uploading.</p>
            </div>
          )}
        </div>
        <hr className="my-4" />
        <h2 className="text-lg font-bold mb-1">Low Stock Products</h2>
        {/* Paginate */}
        <div>
          {products
            .filter((product) => product.quantity <= 5)
            .sort((a, b) => a.quantity - b.quantity)
            .map((product) => (
              <div
                key={product.id}
                className="p-3 border-b flex justify-between"
              >
                <div className="overfl">
                  <p className="text-base leading-4 font-medium capitalize text-black">
                    {product.name}
                  </p>

                  <p className="text-sm text-gray-600">
                    {product.quantity} left
                  </p>
                </div>
                <button
                  className="text-xs font-semibold bg-blue-600 px-2 rounded-md text-white"
                  onClick={() => {
                    setForm({
                      name: product.name,
                      category: product.category || "",
                      price: product.price,
                      quantity: product.quantity,
                    });
                    setEditingId(product.id);
                  }}
                >
                  Restock
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Products;
