import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

export default function LocationHotspotsChart({ data, loading }) {
  // Transform data if needed and ensure it's an array
  const chartData = React.useMemo(() => {
    if (!data) return [];
    
    // If data is already an array with location/count
    if (Array.isArray(data) && data.length > 0) {
      // Sort by count descending and take top 10
      return data
        .map(item => ({
          location: item.location || item.ward || item.name || 'Unknown',
          count: item.count || item.total || 0,
          resolved: item.resolved || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
    
    // If data is an object, convert to array
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data)
        .map(([location, count]) => ({
          location,
          count: typeof count === 'number' ? count : (count?.total || 0),
          resolved: typeof count === 'object' ? (count?.resolved || 0) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }
    
    return [];
  }, [data]);

  const COLORS = ['#DC143C', '#FF6B6B', '#FF8787', '#FFA3A3', '#FFBFBF'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{payload[0].payload.location}</p>
          <p className="text-sm text-[#DC143C] font-bold">Total: {payload[0].value}</p>
          {payload[0].payload.resolved > 0 && (
            <p className="text-sm text-green-600 font-semibold">Resolved: {payload[0].payload.resolved}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100" style={{ minWidth: 350, minHeight: 300 }}>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-[#DC143C]" />
        <h3 className="text-gray-800 font-semibold text-lg">Location Hotspots</h3>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No location data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280} minWidth={350} minHeight={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis 
              type="category" 
              dataKey="location" 
              width={100}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
