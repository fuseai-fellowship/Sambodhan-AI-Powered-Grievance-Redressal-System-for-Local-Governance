import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResponseTimeChart({ data, loading }) {
  const chartData = Array.isArray(data) ? data : (data ? Object.values(data) : []);
  return (
    <div className="bg-white rounded-2xl shadow p-5" style={{ minWidth: 350, minHeight: 300 }}>
      <div className="text-gray-800 font-semibold text-lg mb-4">Response Time Distribution</div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={180} minWidth={350} minHeight={300}>
          <AreaChart data={chartData}>
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="cases" stroke="#D32F2F" fill="#F28B82" fillOpacity={0.7} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
