import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function IssueBreakdownTable({ data, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-gray-800 font-semibold text-lg mb-4">Issue Type Breakdown</div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs">
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Total</th>
              <th className="text-left py-2">Resolved</th>
              <th className="text-left py-2">Avg. Time</th>
              <th className="text-left py-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row, idx) => (
              <tr key={row.type ? `${row.type}-${idx}` : idx} className="border-t">
                <td className="py-2 font-medium text-gray-700">{row.type}</td>
                <td className="py-2">{row.total}</td>
                <td className="py-2">{row.resolved}</td>
                <td className="py-2">{row.avgTime}</td>
                <td className="py-2">
                  <div className="bg-gray-200 rounded h-2 w-full">
                    <div className="bg-[#D32F2F] h-2 rounded" style={{ width: `${row.rate}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
