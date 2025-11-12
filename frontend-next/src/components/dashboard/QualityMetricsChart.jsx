import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function QualityMetricsChart({ data, loading }) {
  // Transform data if needed and ensure it's an array
  const chartData = React.useMemo(() => {
    if (!data) return [];
    
    // If data is already an array
    if (Array.isArray(data) && data.length > 0) {
      return data.map(item => ({
        month: item.month || item.date || item.period || 'Unknown',
        firstTimeResolution: item.firstTimeResolution || item.first_time_resolution || item.value || 0,
        satisfactionScore: item.satisfactionScore || item.satisfaction_score || item.score || 0
      }));
    }
    
    // If data is an object, convert to array
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data).map(([month, value]) => ({
        month,
        firstTimeResolution: typeof value === 'object' ? (value.firstTimeResolution || value.first_time_resolution || 0) : 0,
        satisfactionScore: typeof value === 'object' ? (value.satisfactionScore || value.satisfaction_score || 0) : (typeof value === 'number' ? value : 0)
      }));
    }
    
    return [];
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'satisfactionScore' ? '/5' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-[#DC143C]" />
        <h3 className="text-gray-800 font-semibold text-lg">Quality Metrics Trend</h3>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No quality metrics data available</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => value.length > 10 ? value.substring(0, 10) : value}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{ value: 'Resolution %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{ value: 'Satisfaction', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#6b7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Bar 
              yAxisId="left" 
              dataKey="firstTimeResolution" 
              fill="#34A853" 
              name="First-Time Resolution"
              barSize={20} 
              radius={[8, 8, 0, 0]} 
            />
            <Line 
              yAxisId="right" 
              dataKey="satisfactionScore" 
              stroke="#DC143C" 
              strokeWidth={3}
              name="Satisfaction Score"
              dot={{ fill: '#DC143C', r: 4 }} 
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
