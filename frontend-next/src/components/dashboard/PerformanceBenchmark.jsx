import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, Target, Star, Award } from "lucide-react";

export default function PerformanceBenchmark({ data, loading }) {
  const rows = [
    {
      label: "Avg. Response Time",
      icon: Clock,
      you: data?.avgResponseTime ?? 0,
      city: data?.cityAvgResponseTime ?? 0,
      youLabel: `${data?.avgResponseTime ?? "-"} hrs`,
      cityLabel: `${data?.cityAvgResponseTime ?? "-"} hrs`,
      unit: "hours",
      inverse: true, // Lower is better
    },
    {
      label: "Resolution Rate",
      icon: Target,
      you: data?.resolutionRate ?? 0,
      city: data?.cityResolutionRate ?? 0,
      youLabel: `${data?.resolutionRate ?? "-"}%`,
      cityLabel: `${data?.cityResolutionRate ?? "-"}%`,
      unit: "%",
    },
    {
      label: "Citizen Satisfaction",
      icon: Star,
      you: data?.citizenSatisfaction ?? 0,
      city: data?.cityCitizenSatisfaction ?? 0,
      youLabel: `${data?.citizenSatisfaction ?? "-"}/5`,
      cityLabel: `${data?.cityCitizenSatisfaction ?? "-"}/5`,
      unit: "/5",
    },
    {
      label: "First-Time Resolution",
      icon: Award,
      you: data?.firstTimeResolution ?? 0,
      city: data?.cityFirstTimeResolution ?? 0,
      youLabel: `${data?.firstTimeResolution ?? "-"}%`,
      cityLabel: `${data?.cityFirstTimeResolution ?? "-"}%`,
      unit: "%",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-5 h-5 text-[#DC143C]" />
        <h3 className="text-gray-800 font-semibold text-lg">Performance Benchmarking</h3>
      </div>
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-5">
          {rows.map((row) => {
            const Icon = row.icon;
            const percentage = row.city > 0 
              ? row.inverse 
                ? Math.min(100, (row.city / row.you) * 100) 
                : Math.min(100, (row.you / row.city) * 100)
              : 0;
            const isGood = row.inverse 
              ? row.you < row.city 
              : row.you >= row.city;

            return (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isGood ? 'text-green-600' : 'text-orange-600'}`}>
                        {row.youLabel}
                      </div>
                      <div className="text-xs text-gray-500">You</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-600">
                        {row.cityLabel}
                      </div>
                      <div className="text-xs text-gray-500">City Avg</div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-gray-200 rounded-full h-2.5 w-full overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isGood 
                          ? 'bg-gradient-to-r from-green-500 to-green-600' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}
                      style={{ width: `${percentage || 0}%` }}
                    />
                  </div>
                  {percentage > 0 && (
                    <div 
                      className="absolute -top-6 transform -translate-x-1/2 text-xs font-semibold text-gray-700"
                      style={{ left: `${Math.min(95, percentage)}%` }}
                    >
                      {Math.round(percentage)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
