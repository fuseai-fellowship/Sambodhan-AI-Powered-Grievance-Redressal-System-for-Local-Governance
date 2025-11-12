import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminGrievanceManager({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get("/api/complaints/", {
      params: {
        department: user.department,
        municipality_id: user.municipality_id,
      },
    })
      .then(res => {
        // Sort by ID descending (latest first)
        const sortedComplaints = (res.data?.data || res.data).sort((a, b) => b.id - a.id);
        setComplaints(sortedComplaints);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleUpdate = async (id) => {
    if (!newStatus) return;
    setUpdating(true);
    // Map status string to integer
    const statusMap = {
      "PENDING": 0,
      "IN PROCESS": 1,
      "RESOLVED": 2,
      "REJECTED": 3
    };
    const statusInt = statusMap[newStatus] ?? 0;
    await axios.patch(`/api/complaints/${id}`, { current_status: statusInt });
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, current_status: newStatus } : c));
    setUpdating(false);
    setSelectedId(null);
    setNewStatus("");
  };

  // Pagination logic
  const totalPages = Math.ceil(complaints.length / itemsPerPage);
  const paginatedComplaints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return complaints.slice(startIndex, endIndex);
  }, [complaints, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (pageNum) => {
    setCurrentPage(pageNum);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 mt-8">
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-800 font-semibold text-lg">Manage Grievance Progress</div>
        <div className="text-sm text-gray-500">
          Showing {complaints.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0} - {Math.min(currentPage * itemsPerPage, complaints.length)} of {complaints.length} grievances
        </div>
      </div>
      {loading ? (
        <div>Loading complaints...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">Message</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Update Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No complaints found</td>
                  </tr>
                ) : (
                  paginatedComplaints.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{c.id}</td>
                      <td className="py-3 px-2 max-w-xs truncate">{c.message}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          c.current_status === "RESOLVED" ? "bg-green-100 text-green-800" :
                          c.current_status === "IN PROCESS" ? "bg-blue-100 text-blue-800" :
                          c.current_status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {c.current_status === "IN PROCESS" ? "In Progress" : c.current_status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {selectedId === c.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newStatus}
                              onChange={e => setNewStatus(e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="">Select status</option>
                              <option value="PENDING">Pending</option>
                              <option value="IN PROCESS">In Process</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                            <Button 
                              onClick={() => handleUpdate(c.id)} 
                              disabled={updating || !newStatus} 
                              className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-3 py-1 text-xs"
                            >
                              {updating ? "Updating..." : "Update"}
                            </Button>
                            <Button 
                              onClick={() => { setSelectedId(null); setNewStatus(""); }} 
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => setSelectedId(c.id)} 
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 text-xs"
                          >
                            Change Status
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = pageNum === 1 || 
                                    pageNum === totalPages || 
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                    
                    if (!showPage && pageNum === currentPage - 2) {
                      return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                    }
                    if (!showPage && pageNum === currentPage + 2) {
                      return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                    }
                    if (!showPage) return null;

                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageClick(pageNum)}
                        className={`px-3 py-1 text-sm ${
                          currentPage === pageNum
                            ? "bg-[#D32F2F] text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
