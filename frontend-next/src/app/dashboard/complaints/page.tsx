'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '../../../lib/api-client';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

interface Complaint {
  id: number;
  message: string;
  current_status: number;
  urgency: number;
  department: number;
  date_submitted: string;
  created_at: string;
  ward_name?: string;
  municipality_name?: string;
  district_name?: string;
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const response = await apiClient.get('/chatbot/auth/complaints');
      setComplaints(response.data);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">Unknown</span>;
    }
  };

  // Unified urgency labels to match backend and detail page
  const urgencyLabels = ["Normal", "Urgent", "Highly Urgent"];
  const getUrgencyLabel = (urgency: number) => urgencyLabels[urgency] || "Unknown";

  // Unified department labels to match backend and detail page
  const departmentLabels = [
    'Municipal Governance',
    'Education, Health & Welfare',
    'Infrastructure & Utilities',
    'Security & Law Enforcement'
  ];
  const getDepartmentLabel = (department: number) => departmentLabels[department] || 'Unknown';

  const filteredComplaints = complaints.filter((complaint) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return complaint.current_status === 0;
    if (filter === 'in-progress') return complaint.current_status === 1;
    if (filter === 'resolved') return complaint.current_status === 2;
    if (filter === 'rejected') return complaint.current_status === 3;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Complaints</h2>
          <p className="text-gray-600 mt-1">Track and manage your filed grievances</p>
        </div>
        <Link
          href="/dashboard/file-complaint"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          File New Complaint
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({complaints.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({complaints.filter((c) => c.current_status === 0).length})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'in-progress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Progress ({complaints.filter((c) => c.current_status === 1).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'resolved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resolved ({complaints.filter((c) => c.current_status === 2).length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({complaints.filter((c) => c.current_status === 3).length})
          </button>
        </div>
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No complaints filed yet' : `No ${filter} complaints`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? 'Start by filing your first grievance'
              : 'Try changing the filter to see other complaints'}
          </p>
          {filter === 'all' && (
            <Link
              href="/dashboard/file-complaint"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-5 h-5 mr-2" />
              File Your First Complaint
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {filteredComplaints.map((complaint) => (
            <div
              key={complaint.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      #{complaint.id}
                    </span>
                    {getStatusBadge(complaint.current_status)}
                    <span className="text-xs text-gray-500">
                      {getDepartmentLabel(complaint.department)}
                    </span>
                  </div>
                  <p className="text-gray-900 mb-2 line-clamp-2">
                    {complaint.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>Urgency: {getUrgencyLabel(complaint.urgency)}</span>
                    {complaint.district_name && <span>{complaint.district_name}</span>}
                    <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/complaints/${complaint.id}`}
                  className="ml-4 flex-shrink-0 inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
