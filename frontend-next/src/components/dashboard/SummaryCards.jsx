import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryCards({ data, loading }) {
  // Debug: log the stats object for troubleshooting
  if (!loading) {
    // eslint-disable-next-line no-console
    console.log("SummaryCards data:", data);
  }
  const cards = [
  { label: "Assigned to Me", value: data?.assignedToMe ?? 0 },
  { label: "Pending", value: data?.by_status?.Pending ?? 0 },
  { label: "In Process", value: data?.by_status?.["In Process"] ?? 0 },
  { label: "Resolved", value: data?.by_status?.Resolved ?? 0, sub: data?.resolvedChange },
  { label: "Team Rating", value: data?.teamRating ?? 0, sub: data?.teamRatingChange },
  ];
  const allZero = cards.every(card => card.value === 0);
  return (
    <>
      {allZero && !loading && (
        <div className="text-yellow-600 text-sm mb-2">No analytics data found for your department/municipality. Please check backend filters or complaint data.</div>
      )}
      <div className="grid grid-cols-5 gap-6 mb-6">
        {cards.map((card, i) => (
          <div key={card.label} className="bg-white rounded-2xl shadow p-5 flex flex-col items-start justify-center min-h-[90px]">
            <div className="text-gray-500 text-sm mb-1">{card.label}</div>
            {loading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-[#D32F2F] font-bold text-2xl">{card.value}</div>
            )}
            {card.sub && (
              <div className="text-green-600 text-xs font-medium mt-1">{card.sub}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
