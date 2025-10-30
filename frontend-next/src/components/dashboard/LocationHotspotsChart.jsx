import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function LocationHotspotsChart({ data, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-gray-800 font-semibold text-lg mb-4">Location Hotspots</div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data || []} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="ward" />
            <Bar dataKey="resolved" fill="#34A853" barSize={16} radius={[8, 8, 8, 8]} />
            <Bar dataKey="total" fill="#D32F2F" barSize={16} radius={[8, 8, 8, 8]} />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
