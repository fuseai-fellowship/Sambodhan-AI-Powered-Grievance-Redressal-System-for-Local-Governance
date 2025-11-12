import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrendsChart({ data, loading, title }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#DC143C]" />
          <h3 className="font-semibold text-lg text-gray-800">{title || "Trends"}</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No trend data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total and trend
  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  const recentAvg = data.length >= 3 
    ? Math.round(data.slice(-3).reduce((sum, item) => sum + (item.count || 0), 0) / 3)
    : avg;
  const trend = recentAvg > avg ? "up" : recentAvg < avg ? "down" : "stable";

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="text-sm text-[#DC143C] font-bold">
            Cases: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#DC143C]" />
          <h3 className="font-semibold text-lg text-gray-800">{title || "Trends"}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-bold text-gray-900">{total}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Avg</div>
            <div className={`text-lg font-bold ${
              trend === "up" ? "text-green-600" : 
              trend === "down" ? "text-orange-600" : 
              "text-gray-600"
            }`}>
              {avg}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            trend === "up" ? "bg-green-100 text-green-700" :
            trend === "down" ? "bg-orange-100 text-orange-700" :
            "bg-gray-100 text-gray-700"
          }`}>
            {trend === "up" ? "↗ Trending Up" : 
             trend === "down" ? "↘ Trending Down" : 
             "→ Stable"}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC143C" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#DC143C" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#DC143C" 
            strokeWidth={3}
            fill="url(#colorCount)"
            dot={{ fill: '#DC143C', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#B91C1C' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
