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
// Removed invalid Lucide icon imports

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
  onQuickAction?: (actionName: string) => void;
}

const DashboardInsights: React.FC<DashboardInsightsProps> = ({ complaints, onQuickAction }) => {
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

  // Dynamic quick actions based on common issue types
  const quickActions = [
    { 
      name: "Report Pothole", 
      icon: null,
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
      iconColor: "text-orange-600"
    },
    { 
      name: "Street Light Issue", 
      icon: null,
      color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
      iconColor: "text-yellow-600"
    },
    { 
      name: "Garbage Collection", 
      icon: null,
      color: "bg-green-50 hover:bg-green-100 border-green-200",
      iconColor: "text-green-600"
    },
    { 
      name: "Water Problem", 
      icon: null,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      iconColor: "text-blue-600"
    },
    { 
      name: "Road Damage", 
      icon: null,
      color: "bg-red-50 hover:bg-red-100 border-red-200",
      iconColor: "text-red-600"
    },
    { 
      name: "Tree Cutting Request", 
      icon: null,
      color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      iconColor: "text-emerald-600"
    },
    { 
      name: "Noise Complaint", 
      icon: null,
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
      iconColor: "text-purple-600"
    },
    { 
      name: "Community Issue", 
      icon: null,
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
      iconColor: "text-indigo-600"
    },
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
      <div className="bg-white rounded-xl border p-6 mt-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Quick Actions</h3>
        <p className="text-gray-500 text-sm mb-5">Common grievance types for faster submission</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onQuickAction?.(action.name)}
              className={`flex flex-col items-center justify-center border ${action.color} rounded-lg py-4 px-3 hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95`}
            >
              <div className={`${action.iconColor} mb-2`}>{action.icon}</div>
              <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardInsights;
