import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function QualityMetricsChart({ data, loading }) {
  const chartData = Array.isArray(data) ? data : (data ? Object.values(data) : []);
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-gray-800 font-semibold text-lg mb-4">Quality Metrics Trend</div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="firstTimeResolution" fill="#34A853" barSize={16} radius={[8, 8, 8, 8]} />
            <Line yAxisId="right" dataKey="satisfactionScore" stroke="#D32F2F" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
