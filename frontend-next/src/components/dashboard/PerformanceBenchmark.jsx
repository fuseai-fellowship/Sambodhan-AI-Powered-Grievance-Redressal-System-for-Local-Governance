import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceBenchmark({ data, loading }) {
  const rows = [
    {
      label: "Avg. Response Time",
      you: data?.avgResponseTime ?? 0,
      city: data?.cityAvgResponseTime ?? 0,
      youLabel: `You: ${data?.avgResponseTime ?? "-"} hours`,
      cityLabel: `City Avg: ${data?.cityAvgResponseTime ?? "-"} hours`,
    },
    {
      label: "Resolution Rate",
      you: data?.resolutionRate ?? 0,
      city: data?.cityResolutionRate ?? 0,
      youLabel: `You: ${data?.resolutionRate ?? "-"}%`,
      cityLabel: `City Avg: ${data?.cityResolutionRate ?? "-"}%`,
    },
    {
      label: "Citizen Satisfaction",
      you: data?.citizenSatisfaction ?? 0,
      city: data?.cityCitizenSatisfaction ?? 0,
      youLabel: `You: ${data?.citizenSatisfaction ?? "-"}/5`,
      cityLabel: `City Avg: ${data?.cityCitizenSatisfaction ?? "-"}/5`,
    },
    {
      label: "First-Time Resolution",
      you: data?.firstTimeResolution ?? 0,
      city: data?.cityFirstTimeResolution ?? 0,
      youLabel: `You: ${data?.firstTimeResolution ?? "-"}%`,
      cityLabel: `City Avg: ${data?.cityFirstTimeResolution ?? "-"}%`,
    },
  ];
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-gray-800 font-semibold text-lg mb-4">Performance Benchmarking</div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{row.label}</span>
                <span className="text-[#D32F2F] font-semibold">{row.youLabel}</span>
                <span className="text-gray-500">{row.cityLabel}</span>
              </div>
              <div className="bg-gray-200 rounded h-2 w-full">
                <div className="bg-[#D32F2F] h-2 rounded" style={{ width: `${row.you / row.city * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
