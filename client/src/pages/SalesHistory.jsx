import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await apiFetch("/sales");

        if (Array.isArray(data)) {
          setSales(data);
        } else {
          console.error("Invalid sales response:", data);
        }
      } catch (err) {
        console.error("Failed to fetch sales:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sales History</h1>

      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        {loading ? (
          <p>Loading sales...</p>
        ) : sales.length === 0 ? (
          <p>No sales found</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Total</th>
                <th className="text-left p-2">Paid</th>
                <th className="text-left p-2">Change</th>
                <th className="text-left p-2">Payment</th>
                <th className="text-left p-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={async () => {
                    try {
                      setDetailsLoading(true);
                      setSaleItems([]);

                      const data = await apiFetch(`/sales/${sale.id}`);

                      setSelectedSale(data);
                      setSaleItems(data.items || []);
                    } catch (err) {
                      console.error("Failed to fetch sale details:", err);
                    } finally {
                      setDetailsLoading(false);
                    }
                  }}
                  className="border-b hover:bg-gray-100 cursor-pointer"
                >
                  <td className="p-2">{sale.id}</td>
                  <td className="p-2">GHS {sale.total_amount}</td>
                  <td className="p-2">GHS {sale.amount_paid || 0}</td>
                  <td className="p-2">GHS {sale.change || 0}</td>
                  <td className="p-2">{sale.payment_method || "—"}</td>
                  <td className="p-2">{sale.created_at || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedSale && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-2">
            Sale Details (ID: {selectedSale.id})
          </h2>

          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <p>Date: {selectedSale.created_at || "—"}</p>
            <p>Payment: {selectedSale.payment_method || "—"}</p>
            <p>Amount Paid: GHS {selectedSale.amount_paid || 0}</p>
            <p>Change: GHS {selectedSale.change || 0}</p>
            <p className="font-semibold">
              Total: GHS {selectedSale.total_amount}
            </p>
          </div>

          {detailsLoading ? (
            <p>Loading sale details...</p>
          ) : saleItems.length === 0 ? (
            <p>No items found for this sale</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {saleItems.map((item, index) => (
                  <tr key={`${item.product_id}-${index}`} className="border-b">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">{item.price}</td>
                    <td className="p-2">{item.quantity * item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 text-right font-bold">
            Total: GHS {selectedSale.total_amount}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHistory;
