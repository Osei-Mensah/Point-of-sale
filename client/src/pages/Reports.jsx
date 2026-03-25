import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

function Reports() {
  const [data, setData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalItemsSold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/reports/daily")
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to fetch report:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Daily Report</h1>

      {loading ? (
        <p>Loading report...</p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg text-gray-500">Total Sales</h2>
            <p className="text-3xl font-bold">{data.totalSales}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg text-gray-500">Total Revenue</h2>
            <p className="text-3xl font-bold">GHS {data.totalRevenue}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg text-gray-500">Items Sold</h2>
            <p className="text-3xl font-bold">{data.totalItemsSold}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
