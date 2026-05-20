import React, { use, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

import { DollarSign, ShoppingBasket, ShoppingCart } from "lucide-react";

const generalData = {
  totalSales: 150000,
  totalRevenue: 1200,
  totalItemsSold: 500,
};
const monthlyTrend = [
  { monthName: "Jan", totalSales: 4000 },
  { monthName: "Feb", totalSales: 3000 },
  { monthName: "Mar", totalSales: 5000 },
  { monthName: "Apr", totalSales: 4000 },
  { monthName: "May", totalSales: 6000 },
];
const weeklyTrend = [
  { dayName: "Mon", totalSales: 1200 },
  { dayName: "Tue", totalSales: 2100 },
  { dayName: "Wed", totalSales: 1800 },
  { dayName: "Thu", totalSales: 2500 },
  { dayName: "Fri", totalSales: 3000 },
  { dayName: "Sat", totalSales: 2700 },
  { dayName: "Sun", totalSales: 3200 },
];

const topProductsData = [
  { name: "Product A", totalQuantity: 1000 },
  { name: "Product B", totalQuantity: 800 },
  { name: "Product C", totalQuantity: 1200 },
];

const categorySalesData = [
  { name: "Electricals & Electronics", totalSales: 3000 },
  { name: "AC & Refrigeration", totalSales: 2000 },
  { name: "LPG Products", totalSales: 1500 },
  { name: "Hardware", totalSales: 2500 },
  { name: "General", totalSales: 3500 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];

function Reports() {
  const [general, setGeneral] = useState(generalData);
  const [weeklySales, setWeeklySales] = useState(weeklyTrend);
  const [monthlySales, setMonthlySales] = useState(monthlyTrend);
  const [topProducts, setTopProducts] = useState(topProductsData);
  const [categorySales, setCategorySale] = useState(categorySalesData);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total Sales</p>
            <h2 className="text-2xl font-bold">{general?.totalSales || 0}</h2>
          </div>
          <ShoppingCart className="w-8 h-8 text-green-500" />
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total Revenue</p>
            <h2 className="text-2xl font-bold">
              GHS {general?.totalRevenue.toFixed(2) || (0.0).toFixed(2)}
            </h2>
          </div>
          <DollarSign className="w-8 h-8 text-blue-500" />
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between">
          <div>
            <p className="text-gray-500">Total Items Sold</p>
            <h2 className="text-2xl font-bold">
              {general?.totalItemsSold || 0}
            </h2>
          </div>
          <ShoppingBasket className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6">
        {monthlySales && (
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-4">Monthly Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="totalSales" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          {weeklySales && (
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-semibold mb-4">Weekly Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayName" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="totalSales" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar Chart */}
          {topProducts && (
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-semibold mb-4">Top Selling Products</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={({ x, y, payload }) => {
                      // Split name into two lines (adjust as needed)
                      const words = payload.value.split(" ");
                      const line1 = words
                        .slice(0, Math.ceil(words.length / 2))
                        .join(" ");
                      const line2 = words
                        .slice(Math.ceil(words.length / 2))
                        .join(" ");

                      return (
                        <g transform={`translate(${x}, ${y + 10})`}>
                          <text fontSize={10} textAnchor="middle">
                            {line1}
                          </text>
                          <text fontSize={10} textAnchor="middle" dy="12">
                            {line2}
                          </text>
                        </g>
                      );
                    }}
                    angle={-30}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Chart */}
          {categorySales && (
            <div className="bg-white p-4 rounded-xl shadow lg:col-span-2">
              <h3 className="font-semibold mb-4">Sales by Category</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    dataKey="totalSales"
                    nameKey="name"
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
