import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { MapPin, Zap, Trash2, AlertTriangle } from "lucide-react";

type Complaint = {
  id: number;
  status_name: string;
  department_name?: string;
  urgency_name?: string;
  created_at?: string;
  [key: string]: any;
};

interface DashboardInsightsProps {
  complaints: Complaint[];
}

const DashboardInsights: React.FC<DashboardInsightsProps> = ({ complaints }) => {
  // Example: Build activityData from complaints by month
  const monthMap: { [key: string]: { Resolved: number; Submitted: number } } = {};
  complaints.forEach((c) => {
    const date = c.created_at ? new Date(c.created_at) : null;
    const month = date ? date.toLocaleString("default", { month: "short" }) : "Unknown";
    if (!monthMap[month]) monthMap[month] = { Resolved: 0, Submitted: 0 };
    monthMap[month].Submitted += 1;
    if (c.status_name === "Resolved") monthMap[month].Resolved += 1;
  });
  const activityData = Object.entries(monthMap).map(([month, vals]) => ({ month, ...vals }));

  // Example: Build categoryData from department_name
  const categoryCount: { [key: string]: number } = {};
  complaints.forEach((c) => {
    const cat = c.department_name || "Other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const colors = ["#dc2626", "#1e3a8a", "#16a34a", "#f59e0b", "#6366f1", "#0ea5e9", "#f43f5e"];
  const categoryData = Object.entries(categoryCount).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));

  const quickActions = [
    { name: "Report Pothole", icon: <MapPin className="w-5 h-5" /> },
    { name: "Street Light Issue", icon: <Zap className="w-5 h-5" /> },
    { name: "Garbage Collection", icon: <Trash2 className="w-5 h-5" /> },
    { name: "Water Problem", icon: <AlertTriangle className="w-5 h-5" /> },
  ];

  return (
    <div className="px-10 pb-12 mt-16">
      {/* Top Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">Your Activity</h3>
          <p className="text-gray-500 text-sm mb-4">Submission and resolution trends</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Resolved" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Submitted" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">Your Submissions by Category</h3>
          <p className="text-gray-500 text-sm mb-4">Distribution of grievance types</p>
          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-5 mt-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Quick Actions</h3>
        <p className="text-gray-500 text-sm mb-5">Common grievance types for faster submission</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className="flex flex-col items-center justify-center border rounded-xl py-6 hover:shadow-md transition"
            >
              <div className="text-gray-600 mb-2">{action.icon}</div>
              <span className="text-sm font-semibold text-gray-800">{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardInsights;
