"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Complaint {
  id: number;
  message: string;
  current_status: number;
  urgency: number;
  department: number;
  date_submitted: string;
  created_at: string;
  ward_id: number;
  municipality_id: number;
  district_id: number;
  // Optionally add more fields as needed
}

const statusLabels = ["Pending", "In Progress", "Resolved", "Rejected"];
const urgencyLabels = ["Unclassified", "Low", "Medium", "High"];
const departmentLabels = ["Unclassified", "Infrastructure", "Health", "Education", "Environment"];

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get(`/complaints/${id}`)
      .then((res) => setComplaint(res.data))
      .catch((err) => {
        setError(
          err.response?.data?.detail || err.message || "Failed to load complaint."
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mb-2" />
        <div className="text-gray-600">Loading complaint details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <div className="text-red-600 font-medium mb-2">{error}</div>
        <Link href="/dashboard/complaints" className="text-indigo-600 hover:underline">
          <ArrowLeft className="inline w-4 h-4 mr-1" /> Back to My Complaints
        </Link>
      </div>
    );
  }

  if (!complaint) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 mt-6">
      <Link href="/dashboard/complaints" className="text-indigo-600 hover:underline flex items-center mb-4">
        <ArrowLeft className="inline w-4 h-4 mr-1" /> Back to My Complaints
      </Link>
      <h2 className="text-2xl font-bold mb-2">Complaint #{complaint.id}</h2>
      <div className="mb-4 text-gray-600">
        <span className="font-medium">Status:</span> {statusLabels[complaint.current_status] || "Unknown"}
      </div>
      <div className="mb-4">
        <span className="font-medium text-gray-700">Message:</span>
        <div className="mt-1 text-gray-900 whitespace-pre-line border rounded p-3 bg-gray-50">
          {complaint.message}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <span className="font-medium text-gray-700">Urgency:</span> {urgencyLabels[complaint.urgency] || "-"}
        </div>
        <div>
          <span className="font-medium text-gray-700">Department:</span> {departmentLabels[complaint.department] || "-"}
        </div>
        <div>
          <span className="font-medium text-gray-700">Submitted:</span> {new Date(complaint.created_at).toLocaleString()}
        </div>
      </div>
      <div className="text-sm text-gray-500">
        <div>District ID: {complaint.district_id}</div>
        <div>Municipality ID: {complaint.municipality_id}</div>
        <div>Ward ID: {complaint.ward_id}</div>
      </div>
    </div>
  );
}
