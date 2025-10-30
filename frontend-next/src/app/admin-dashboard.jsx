"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import SummaryCards from "../components/dashboard/SummaryCards";
import AdminGrievanceManager from "../components/dashboard/AdminGrievanceManager";
import IssueBreakdownTable from "../components/dashboard/IssueBreakdownTable";
import LocationHotspotsChart from "../components/dashboard/LocationHotspotsChart";
import ResponseTimeChart from "../components/dashboard/ResponseTimeChart";
import QualityMetricsChart from "../components/dashboard/QualityMetricsChart";
import PerformanceBenchmark from "../components/dashboard/PerformanceBenchmark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  "Overview",
  "Team Performance",
  "Workflow",
  "Analytics",
  "My Cases",
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState(null);
  const [issueTypesLoading, setIssueTypesLoading] = useState(true);
  const [hotspots, setHotspots] = useState(null);
  const [hotspotsLoading, setHotspotsLoading] = useState(true);
  const [responseTime, setResponseTime] = useState(null);
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [qualityMetricsLoading, setQualityMetricsLoading] = useState(true);
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Get user_id from query params using Next.js
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("user_id");

  useEffect(() => {
    if (!userId) {
      router.push("/admin-login");
      return;
    }
    setUserLoading(true);
    axios.get(`/api/admins/${userId}`)
      .then(res => {
        setUser(res.data);
        setUserLoading(false);
      })
      .catch(() => {
        setUser(null);
        setUserLoading(false);
      });
  }, [userId, router]);

  useEffect(() => {
    if (!user) return;
  const params = {};
  if (user.department) params.department = user.department;
  if (user.municipality_id) params.municipality_id = user.municipality_id;
  // Only filter by ward_id if user is a ward_admin (not department_admin)
  if (user.role === "ward_admin" && user.ward_id) params.ward_id = user.ward_id;
    setStatsLoading(true);
    axios.get("/api/analytics/summary", { params }).then(res => {
      setStats(res.data?.data || res.data);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
    setIssueTypesLoading(true);
    axios.get("/api/analytics/by-department", { params }).then(res => {
      setIssueTypes(res.data?.data || res.data);
      setIssueTypesLoading(false);
    }).catch(() => setIssueTypesLoading(false));
    setHotspotsLoading(true);
    axios.get("/api/analytics/by-district", { params }).then(res => {
      setHotspots(res.data?.data || res.data);
      setHotspotsLoading(false);
    }).catch(() => setHotspotsLoading(false));
    setResponseTimeLoading(true);
    axios.get("/api/analytics/by-status", { params }).then(res => {
      setResponseTime(res.data?.data || res.data);
      setResponseTimeLoading(false);
    }).catch(() => setResponseTimeLoading(false));
    setQualityMetricsLoading(true);
    axios.get("/api/analytics/by-urgency", { params }).then(res => {
      setQualityMetrics(res.data?.data || res.data);
      setQualityMetricsLoading(false);
    }).catch(() => setQualityMetricsLoading(false));
    // For benchmark, you may need a custom endpoint or logic
    setBenchmarkLoading(false);
  }, [user]);

  const handleExport = async () => {
    await axios.get("/api/department/export");
    // Optionally show a toast or download file
  };

  if (userLoading) return <Skeleton className="h-96 w-full" />;
  if (!user) return <div className="text-center mt-20 text-red-600">Unauthorized. Please login as admin.</div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-inter">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b bg-white">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-[#D32F2F]">🇳🇵 नागरिक गुनासो प्रणाली</span>
          <span className="text-gray-600 font-medium ml-2">Citizen Grievance System</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-medium text-gray-700">{user?.name} ({user?.department})</span>
          <Button onClick={handleExport} className="bg-[#D32F2F] text-white rounded-lg px-4 py-2">Export Analytics</Button>
        </div>
      </div>
      {/* Department Info */}
      <div className="px-8 pt-8 pb-2">
        <div className="text-2xl font-bold text-[#D32F2F] mb-1">{user?.department || "Department"}</div>
        <div className="text-gray-500 text-base">{user?.department_description || ""}</div>
      </div>
      {/* Summary Cards */}
      <div className="px-8">
  <SummaryCards data={stats} loading={statsLoading} />
  <AdminGrievanceManager user={user} />
      </div>
      {/* Tabs */}
      <div className="px-8 mt-2">
        <div className="flex gap-8 border-b">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              className={`py-3 font-medium text-base ${activeTab === idx ? "text-[#D32F2F] border-b-2 border-[#D32F2F]" : "text-gray-500"}`}
              onClick={() => setActiveTab(idx)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {/* Overview Tab Content */}
      {activeTab === 0 && (
        <div className="px-8 py-8 grid grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col gap-6">
            <IssueBreakdownTable data={Array.isArray(issueTypes) ? issueTypes : (issueTypes ? Object.values(issueTypes) : [])} loading={issueTypesLoading} />
            <PerformanceBenchmark data={benchmark || {}} loading={benchmarkLoading} />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-6">
            <LocationHotspotsChart data={Array.isArray(hotspots) ? hotspots : (hotspots ? Object.values(hotspots) : [])} loading={hotspotsLoading} />
            <ResponseTimeChart data={Array.isArray(responseTime) ? responseTime : (responseTime ? Object.values(responseTime) : [])} loading={responseTimeLoading} />
            <QualityMetricsChart data={Array.isArray(qualityMetrics) ? qualityMetrics : (qualityMetrics ? Object.values(qualityMetrics) : [])} loading={qualityMetricsLoading} />
          </div>
          {(!issueTypes || issueTypes.length === 0) && !issueTypesLoading && (
            <div className="col-span-3 text-yellow-600 text-sm mt-4">No issue type analytics found. Please check backend filters or complaint data.</div>
          )}
        </div>
      )}
      {/* Other tabs can be filled similarly */}
    </div>
  );
}
