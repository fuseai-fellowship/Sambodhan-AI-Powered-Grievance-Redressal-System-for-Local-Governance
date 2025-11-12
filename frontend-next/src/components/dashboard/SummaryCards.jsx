import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export default function SummaryCards({ data, loading }) {
  if (!loading) {
    console.log("SummaryCards data:", data);
  }

  const cards = [
    { 
      label: "Assigned to Me", 
      value: data?.assignedToMe ?? 0,
      icon: User,
      color: "blue",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      iconColor: "text-blue-500"
    },
    { 
      label: "Pending", 
      value: data?.by_status?.Pending ?? 0,
      icon: Clock,
      color: "yellow",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      iconColor: "text-yellow-500"
    },
    { 
      label: "In Process", 
      value: data?.by_status?.["In Process"] ?? 0,
      icon: TrendingUp,
      color: "blue",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      iconColor: "text-blue-500",
      sub: data?.inProcessChange 
    },
    { 
      label: "Resolved", 
      value: data?.by_status?.Resolved ?? 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      iconColor: "text-green-500",
      sub: data?.resolvedChange 
    },
    { 
      label: "Team Rating", 
      value: data?.teamRating ?? 0,
      icon: AlertCircle,
      color: "purple",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      iconColor: "text-purple-500",
      sub: data?.teamRatingChange 
    },
  ];

  const allZero = cards.every(card => card.value === 0);
  
  return (
    <>
      {allZero && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          No analytics data found for your department/municipality. Please check backend filters or complaint data.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.label} 
              className={`${card.bgColor} rounded-xl shadow-sm p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md border border-${card.color}-100`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.sub && (
                  <div className="text-green-600 text-xs font-semibold bg-green-100 px-2 py-1 rounded-full">
                    {card.sub}
                  </div>
                )}
              </div>
              <div>
                <div className="text-gray-600 text-xs font-medium mb-2">{card.label}</div>
                {loading ? (
                  <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                  <div className={`${card.textColor} font-bold text-3xl`}>
                    {card.value}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
