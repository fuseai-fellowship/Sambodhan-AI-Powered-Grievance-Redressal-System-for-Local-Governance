"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building2,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw
} from "lucide-react";

export default function MisclassificationManager({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [misclassifications, setMisclassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [misclassificationsLoading, setMisclassificationsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeView, setActiveView] = useState("complaints"); // "complaints" or "reports"
  
  const [reportForm, setReportForm] = useState({
    correctDepartment: "",
    correctUrgency: "",
  });

  const DEPARTMENTS = [
    "Municipal Governance & Community Services",
    "Education, Health & Social Welfare",
    "Infrastructure, Utilities & Natural Resources",
    "Security & Law Enforcement"
  ];

  const URGENCY_LEVELS = ["NORMAL", "URGENT", "HIGHLY URGENT"];

  // Fetch complaints
  useEffect(() => {
    if (!user) return;

    const params = {};
    if (user.role === "department_admin") {
      params.department = user.department;
      if (user.municipality_id) params.municipality_id = user.municipality_id;
    } else if (user.role === "municipal_admin" && user.municipality_id) {
      params.municipality_id = user.municipality_id;
    } else if (user.role === "super_admin" && user.district_id) {
      params.district_id = user.district_id;
    }

    setLoading(true);
    axios.get("/api/complaints/", { params })
      .then(res => {
        setComplaints(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching complaints:", err);
        setLoading(false);
      });
  }, [user]);

  // Fetch misclassification reports
  useEffect(() => {
    if (!user) return;

    const params = { reviewed: false };
    if (user.role === "department_admin" && user.department) {
      params.department = user.department;
    }

    setMisclassificationsLoading(true);
    axios.get("/api/misclassifications/", { params })
      .then(res => {
        setMisclassifications(res.data || []);
        setMisclassificationsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching misclassifications:", err);
        setMisclassificationsLoading(false);
      });
  }, [user]);

  const handleReportMisclassification = () => {
    if (!selectedComplaint) return;

    const payload = {
      complaint_id: selectedComplaint.id,
    };

    // Only include corrections that differ from current values
    if (reportForm.correctDepartment && reportForm.correctDepartment !== selectedComplaint.department) {
      payload.correct_department = reportForm.correctDepartment;
    }

    if (reportForm.correctUrgency && reportForm.correctUrgency !== selectedComplaint.urgency) {
      payload.correct_urgency = reportForm.correctUrgency;
    }

    if (!payload.correct_department && !payload.correct_urgency) {
      alert("Please select at least one correction that differs from the current classification.");
      return;
    }

    // Add reported_by_admin_id as query parameter
    axios.post(`/api/misclassifications/?reported_by_admin_id=${user.id}`, payload)
      .then(res => {
        alert("Misclassification reported successfully!");
        setShowReportModal(false);
        setSelectedComplaint(null);
        setReportForm({ correctDepartment: "", correctUrgency: "" });
        
        // Refresh misclassifications list
        axios.get("/api/misclassifications/", { params: { reviewed: false } })
          .then(res => setMisclassifications(res.data || []))
          .catch(err => console.error(err));
      })
      .catch(err => {
        console.error("Error reporting misclassification:", err);
        alert(err.response?.data?.detail || "Failed to report misclassification");
      });
  };

  const handleDeleteReport = (reportId) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    axios.delete(`/api/misclassifications/${reportId}?reported_by_admin_id=${user.id}`)
      .then(() => {
        alert("Report deleted successfully");
        setMisclassifications(prev => prev.filter(m => m.id !== reportId));
      })
      .catch(err => {
        console.error("Error deleting report:", err);
        alert(err.response?.data?.detail || "Failed to delete report");
      });
  };

  const filteredComplaints = complaints.filter(c => 
    c.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "HIGHLY URGENT": return "text-red-600 bg-red-100";
      case "URGENT": return "text-orange-600 bg-orange-100";
      case "NORMAL": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Classification Review</h2>
        <p className="text-gray-600">
          Report complaints with incorrect department or urgency classifications to improve model accuracy.
        </p>
      </div>

      {/* View Switcher */}
      <div className="flex gap-4">
        <Button
          onClick={() => setActiveView("complaints")}
          className={`flex-1 ${activeView === "complaints" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          <Eye className="w-4 h-4 mr-2" />
          Review Complaints ({filteredComplaints.length})
        </Button>
        <Button
          onClick={() => setActiveView("reports")}
          className={`flex-1 ${activeView === "reports" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          My Reports ({misclassifications.length})
        </Button>
      </div>

      {/* Complaints View */}
      {activeView === "complaints" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Complaints List */}
          {loading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No complaints found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map(complaint => (
                <div
                  key={complaint.id}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-600">Complaint #{complaint.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(complaint.urgency)}`}>
                          {complaint.urgency}
                        </span>
                      </div>
                      <p className="text-gray-900 mb-3 line-clamp-2">{complaint.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {complaint.department}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(complaint.date_submitted).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setReportForm({
                          correctDepartment: complaint.department,
                          correctUrgency: complaint.urgency
                        });
                        setShowReportModal(true);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports View */}
      {activeView === "reports" && (
        <div className="space-y-4">
          {misclassificationsLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : misclassifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending misclassification reports</p>
            </div>
          ) : (
            <div className="space-y-4">
              {misclassifications.map(report => (
                <div
                  key={report.id}
                  className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-gray-600">
                          Report #{report.id} - Complaint #{report.complaint_id}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Pending Review
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {report.model_predicted_department && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Model Predicted Department</p>
                            <p className="text-sm font-medium text-gray-900">{report.model_predicted_department}</p>
                          </div>
                        )}
                        {report.correct_department && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Correct Department</p>
                            <p className="text-sm font-medium text-green-600">{report.correct_department}</p>
                          </div>
                        )}
                        {report.model_predicted_urgency && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Model Predicted Urgency</p>
                            <p className="text-sm font-medium text-gray-900">{report.model_predicted_urgency}</p>
                          </div>
                        )}
                        {report.correct_urgency && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Correct Urgency</p>
                            <p className="text-sm font-medium text-green-600">{report.correct_urgency}</p>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        Reported on {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteReport(report.id)}
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Report Misclassification</h3>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedComplaint(null);
                    setReportForm({ correctDepartment: "", correctUrgency: "" });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Complaint Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Complaint #{selectedComplaint.id}</p>
                <p className="text-gray-900 mb-3">{selectedComplaint.message}</p>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Department: </span>
                    <span className="font-medium">{selectedComplaint.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Urgency: </span>
                    <span className="font-medium">{selectedComplaint.urgency}</span>
                  </div>
                </div>
              </div>

              {/* Correction Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Department
                  </label>
                  <select
                    value={reportForm.correctDepartment}
                    onChange={(e) => setReportForm({ ...reportForm, correctDepartment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select if different --</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Urgency Level
                  </label>
                  <select
                    value={reportForm.correctUrgency}
                    onChange={(e) => setReportForm({ ...reportForm, correctUrgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select if different --</option>
                    {URGENCY_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleReportMisclassification}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Report
                </Button>
                <Button
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedComplaint(null);
                    setReportForm({ correctDepartment: "", correctUrgency: "" });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
