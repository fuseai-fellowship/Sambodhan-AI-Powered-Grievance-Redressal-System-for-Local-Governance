import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function AdminGrievanceManager({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [newStatus, setNewStatus] = useState("");

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
        setComplaints(res.data?.data || res.data);
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

  return (
    <div className="bg-white rounded-2xl shadow p-5 mt-8">
      <div className="text-gray-800 font-semibold text-lg mb-4">Manage Grievance Progress</div>
      {loading ? (
        <div>Loading complaints...</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs">
              <th>ID</th>
              <th>Message</th>
              <th>Status</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id} className="border-t">
                <td>{c.id}</td>
                <td>{c.message}</td>
                <td>{c.current_status === "IN PROCESS" ? "In Progress" : c.current_status}</td>
                <td>
                  {selectedId === c.id ? (
                    <>
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        className="border rounded px-2 py-1 mr-2"
                      >
                        <option value="">Select status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN PROCESS">In Process</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      <Button onClick={() => handleUpdate(c.id)} disabled={updating || !newStatus} className="bg-[#D32F2F] text-white px-2 py-1">Update</Button>
                      <Button onClick={() => { setSelectedId(null); setNewStatus(""); }} className="ml-2 px-2 py-1">Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setSelectedId(c.id)} className="bg-gray-200 px-2 py-1">Change Status</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
