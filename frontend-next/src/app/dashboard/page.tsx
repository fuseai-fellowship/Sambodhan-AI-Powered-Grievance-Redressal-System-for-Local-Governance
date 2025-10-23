'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { FileText, Clock, CheckCircle, XCircle, PlusCircle, TrendingUp } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
}

interface Complaint {
  id: number;
  message: string;
  status: number;
  urgency: number;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, resolved: 0 });
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const response = await apiClient.get('/chatbot/auth/complaints');
        const complaints = response.data;

        // Calculate stats
        const stats: Stats = {
          total: complaints.length,
          pending: complaints.filter((c: Complaint) => c.status === 0).length,
          in_progress: complaints.filter((c: Complaint) => c.status === 1).length,
          resolved: complaints.filter((c: Complaint) => c.status === 2).length,
        };

        setStats(stats);
        setRecentComplaints(complaints.slice(0, 5)); // Show 5 most recent
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 1:
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">In Progress</span>;
      case 2:
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Resolved</span>;
      case 3:
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  const getUrgencyBadge = (urgency: number) => {
    switch (urgency) {
      case 0:
        return <span className="text-xs text-gray-600">Low</span>;
      case 1:
        return <span className="text-xs text-yellow-600 font-medium">Medium</span>;
      case 2:
        return <span className="text-xs text-red-600 font-bold">High</span>;
      default:
        return <span className="text-xs text-gray-600">-</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Complaints</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.in_progress}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard/file-complaint"
            className="flex items-center justify-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            File New Complaint
          </Link>
          <Link
            href="/dashboard/complaints"
            className="flex items-center justify-center px-6 py-3 bg-indigo-700 text-white font-medium rounded-lg hover:bg-indigo-800 transition-colors"
          >
            <FileText className="h-5 w-5 mr-2" />
            View All Complaints
          </Link>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Complaints</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentComplaints.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No complaints filed yet</p>
              <Link
                href="/dashboard/file-complaint"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                File Your First Complaint
              </Link>
            </div>
          ) : (
            recentComplaints.map((complaint) => (
              <div key={complaint.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {complaint.message.substring(0, 80)}
                      {complaint.message.length > 80 ? '...' : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      {getStatusBadge(complaint.status)}
                      <span className="text-xs text-gray-500">
                        Urgency: {getUrgencyBadge(complaint.urgency)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/complaints/${complaint.id}`}
                    className="ml-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        {recentComplaints.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 text-center">
            <Link href="/dashboard/complaints" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all complaints →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
