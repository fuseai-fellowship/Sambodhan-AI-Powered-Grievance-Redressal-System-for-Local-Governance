import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function IssueBreakdownTable({ data, loading }) {
  // Calculate totals
  const totalCases = data?.reduce((sum, row) => sum + (row.total || 0), 0) || 0;
  const totalResolved = data?.reduce((sum, row) => sum + (row.resolved || 0), 0) || 0;
  const overallRate = totalCases > 0 ? Math.round((totalResolved / totalCases) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-[#DC143C]" />
        <h3 className="text-gray-800 font-semibold text-lg">Issue Type Breakdown</h3>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b">
                  <th className="text-left py-3 font-semibold">Type</th>
                  <th className="text-right py-3 font-semibold">Total</th>
                  <th className="text-right py-3 font-semibold">Resolved</th>
                  <th className="text-left py-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {data && data.length > 0 ? (
                  data.map((row, idx) => {
                    const rate = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0;
                    return (
                      <tr key={row.type ? `${row.type}-${idx}` : idx} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-700 max-w-[150px] truncate" title={row.type}>
                          {row.type || "Unknown"}
                        </td>
                        <td className="py-3 text-right font-semibold text-gray-900">{row.total || 0}</td>
                        <td className="py-3 text-right font-semibold text-green-600">{row.resolved || 0}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-gray-200 rounded-full h-2 flex-1">
                              <div 
                                className="bg-gradient-to-r from-[#DC143C] to-[#FF6B6B] h-2 rounded-full transition-all" 
                                style={{ width: `${rate}%` }} 
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 min-w-[35px] text-right">
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500 text-sm">
                      No issue type data available
                    </td>
                  </tr>
                )}
              </tbody>
              {data && data.length > 0 && (
                <tfoot className="border-t-2 bg-gray-50">
                  <tr className="font-semibold">
                    <td className="py-3 text-gray-800">Total</td>
                    <td className="py-3 text-right text-gray-900">{totalCases}</td>
                    <td className="py-3 text-right text-green-600">{totalResolved}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-300 rounded-full h-2 flex-1">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" 
                            style={{ width: `${overallRate}%` }} 
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 min-w-[35px] text-right">
                          {overallRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
