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
import TrendsChart from "../components/dashboard/TrendsChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, Users, Clock, CheckCircle, AlertCircle, BarChart3, LogOut } from "lucide-react";
import Cookies from "js-cookie";

const TABS = [
  { name: "Overview", icon: BarChart3 },
  { name: "Team Performance", icon: Users },
  { name: "Workflow", icon: TrendingUp },
  { name: "Analytics", icon: BarChart3 },
  { name: "My Cases", icon: CheckCircle },
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
  const [dailyTrends, setDailyTrends] = useState(null);
  const [dailyTrendsLoading, setDailyTrendsLoading] = useState(true);
  const [weeklyTrends, setWeeklyTrends] = useState(null);
  const [weeklyTrendsLoading, setWeeklyTrendsLoading] = useState(true);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [monthlyTrendsLoading, setMonthlyTrendsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get user_id from query params using Next.js
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("user_id");

  useEffect(() => {
    // Prevent redirect loops
    if (isInitialized) return;
    
    setIsInitialized(true);
    
    // First check if we have user_id in URL
    if (userId) {
      setUserLoading(true);
      axios.get(`/api/admins/${userId}`)
        .then(res => {
          setUser(res.data);
          // Store user data in cookie for persistence
          Cookies.set('sambodhan_admin_user', JSON.stringify(res.data), { expires: 7 });
          setUserLoading(false);
        })
        .catch(() => {
          setUser(null);
          setUserLoading(false);
          router.replace("/admin-login");
        });
    } else {
      // No userId in URL, try to get from cookie
      const cachedUser = Cookies.get('sambodhan_admin_user');
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          setUserLoading(false);
          // Update URL with user_id to maintain consistency
          router.replace(`/admin-dashboard?role=${parsedUser.role}&user_id=${parsedUser.id}`);
        } catch {
          setUserLoading(false);
          router.replace("/admin-login");
        }
      } else {
        setUserLoading(false);
        router.replace("/admin-login");
      }
    }
  }, [userId, router, isInitialized]);

  useEffect(() => {
    if (!user) return;
    const params = {};
    if (user.department) params.department = user.department;
    if (user.municipality_id) params.municipality_id = user.municipality_id;
    if (user.role === "ward_admin" && user.ward_id) params.ward_id = user.ward_id;
    
    // Fetch summary/stats
    setStatsLoading(true);
    axios.get("/api/analytics/summary", { params }).then(res => {
      const rawData = res.data?.data || res.data;
      console.log("Summary raw data:", rawData);
      setStats(rawData);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
    
    // Fetch by-department (for issue breakdown)
    setIssueTypesLoading(true);
    axios.get("/api/analytics/by-department", { params }).then(res => {
      const rawData = res.data?.data || res.data;
      console.log("By-department raw data:", rawData);
      
      // Transform backend data to array format for table
      const issueTypesArray = Object.entries(rawData).map(([dept, stats]) => ({
        type: dept,
        total: stats.total || 0,
        resolved: stats.resolved || 0,
        rate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
      }));
      
      setIssueTypes(issueTypesArray);
      setIssueTypesLoading(false);
    }).catch((err) => {
      console.error("Error fetching issue types:", err);
      setIssueTypesLoading(false);
    });
    
    // Fetch location hotspots
    setHotspotsLoading(true);
    axios.get("/api/analytics/location-hotspots", { params }).then(res => {
      const rawData = res.data?.chart || res.data?.data || res.data;
      console.log("Location Hotspots raw response:", res.data);
      
      // Transform to array if needed
      let hotspotsArray = [];
      if (Array.isArray(rawData)) {
        hotspotsArray = rawData;
      } else if (typeof rawData === 'object') {
        hotspotsArray = Object.entries(rawData).map(([location, count]) => ({
          location,
          count: count || 0
        }));
      }
      
      setHotspots(hotspotsArray);
      setHotspotsLoading(false);
    }).catch((err) => {
      console.error("Error fetching hotspots:", err);
      setHotspotsLoading(false);
    });
    
    // Fetch quality metrics
    setQualityMetricsLoading(true);
    axios.get("/api/analytics/quality-metrics", { params }).then(res => {
      const rawData = res.data?.chart || res.data?.data || res.data;
      console.log("Quality Metrics raw response:", res.data);
      
      // Transform to array if needed
      let metricsArray = [];
      if (Array.isArray(rawData)) {
        metricsArray = rawData;
      } else if (typeof rawData === 'object') {
        metricsArray = Object.entries(rawData).map(([month, value]) => ({
          month,
          value: value || 0
        }));
      }
      
      setQualityMetrics(metricsArray);
      setQualityMetricsLoading(false);
    }).catch((err) => {
      console.error("Error fetching quality metrics:", err);
      setQualityMetricsLoading(false);
    });
    
    // Fetch performance benchmark data
    setBenchmarkLoading(true);
    axios.get("/api/analytics/performance", { params }).then(res => {
      const rawData = res.data?.data || res.data;
      console.log("Performance benchmark raw data:", rawData);
      setBenchmark(rawData);
      setBenchmarkLoading(false);
    }).catch((err) => {
      console.error("Error fetching benchmark:", err);
      // Set default values if endpoint doesn't exist
      setBenchmark({
        avgResponseTime: 0,
        cityAvgResponseTime: 0,
        resolutionRate: 0,
        cityResolutionRate: 0,
        citizenSatisfaction: 0,
        cityCitizenSatisfaction: 0,
        firstTimeResolution: 0,
        cityFirstTimeResolution: 0
      });
      setBenchmarkLoading(false);
    });
    
    // Trends endpoints
    setDailyTrendsLoading(true);
    axios.get("/api/analytics/trends/daily", { params: { ...params, days: 30 } }).then(res => {
      setDailyTrends(res.data?.data || res.data);
      setDailyTrendsLoading(false);
    }).catch(() => setDailyTrendsLoading(false));
    
    setWeeklyTrendsLoading(true);
    axios.get("/api/analytics/trends/weekly", { params: { ...params, weeks: 12 } }).then(res => {
      setWeeklyTrends(res.data?.data || res.data);
      setWeeklyTrendsLoading(false);
    }).catch(() => setWeeklyTrendsLoading(false));
    
    setMonthlyTrendsLoading(true);
    axios.get("/api/analytics/trends/monthly", { params: { ...params, months: 12 } }).then(res => {
      setMonthlyTrends(res.data?.data || res.data);
      setMonthlyTrendsLoading(false);
    }).catch(() => setMonthlyTrendsLoading(false));
  }, [user]);

  const handleExport = async () => {
    try {
      // Build query params from user data
      const params = {};
      if (user.department) params.department = user.department;
      if (user.municipality_id) params.municipality_id = user.municipality_id;
      if (user.role === "ward_admin" && user.ward_id) params.ward_id = user.ward_id;
      
      // Create query string
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/analytics/export${queryString ? `?${queryString}` : ''}`;
      
      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob and create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `analytics_export_${new Date().toISOString().slice(0,10)}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Optional: Show success message
      console.log('Analytics exported successfully');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Failed to export analytics. Please try again.');
    }
  };

  const handleLogout = () => {
    // Clear admin cookies (use different cookie name from citizen)
    Cookies.remove('sambodhan_token');
    Cookies.remove('sambodhan_admin_user');
    // Redirect to admin login
    router.replace('/admin-login');
  };

  if (userLoading) return <Skeleton className="h-96 w-full" />;
  if (!user) return <div className="text-center mt-20 text-red-600">Unauthorized. Please login as admin.</div>;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-inter">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-10 w-10" />
              <div>
                <span className="text-xl font-bold text-[#DC143C] block">नागरिक गुनासो व्यवस्थापन</span>
                <span className="text-xs text-gray-600 font-medium">Citizen Grievance System</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="font-semibold text-gray-800">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.department}</div>
            </div>
            <Button onClick={handleExport} className="bg-[#DC143C] hover:bg-[#B91C1C] text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-md transition-all">
              <Download className="w-4 h-4" />
              Export Analytics
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-gray-300 hover:border-red-600 hover:text-red-600 rounded-lg px-4 py-2 flex items-center gap-2 transition-all">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Department Header */}
      <div className="px-8 pt-8 pb-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.department || "Department Dashboard"}</h1>
            <p className="text-gray-600">{user?.municipality_name || "Municipality"} • {user?.district_name || "District"}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#DC143C]">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500">Total Grievances</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{stats?.by_status?.Resolved || 0}</div>
              <div className="text-xs text-gray-500">Resolved</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{stats?.by_status?.["In Process"] || 0}</div>
              <div className="text-xs text-gray-500">In Process</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-8 pt-6">
        <SummaryCards data={stats} loading={statsLoading} />
      </div>

      {/* Tabs */}
      <div className="px-8 mt-6 bg-white border-b sticky top-16 z-10">
        <div className="flex gap-1">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                className={`py-4 px-6 font-medium text-sm flex items-center gap-2 transition-all ${
                  activeTab === idx
                    ? "text-[#DC143C] border-b-2 border-[#DC143C] bg-red-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab(idx)}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Metrics & Breakdown */}
            <div className="lg:col-span-1 space-y-6">
              <IssueBreakdownTable 
                data={issueTypes || []} 
                loading={issueTypesLoading} 
              />
              <PerformanceBenchmark data={benchmark || {}} loading={benchmarkLoading} />
            </div>

            {/* Right Column - Charts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LocationHotspotsChart
                  data={hotspots || []}
                  loading={hotspotsLoading}
                />
                <QualityMetricsChart
                  data={qualityMetrics || []}
                  loading={qualityMetricsLoading}
                />
              </div>
              <TrendsChart
                data={dailyTrends?.periods?.map(date => ({ date, count: dailyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
                loading={dailyTrendsLoading}
                title="Daily Trends (Last 30 Days)"
              />
            </div>
          </div>
        )}

        {/* Team Performance Tab */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PerformanceBenchmark data={benchmark || {}} loading={benchmarkLoading} />
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-700">Active Team Members</span>
                    <span className="font-bold text-blue-600">{stats?.team_members || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-700">Avg. Cases per Member</span>
                    <span className="font-bold text-green-600">
                      {stats?.team_members > 0 ? Math.round((stats?.total || 0) / stats.team_members) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-700">Resolution Rate</span>
                    <span className="font-bold text-purple-600">
                      {stats?.total > 0 ? Math.round(((stats?.by_status?.Resolved || 0) / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TrendsChart
                data={dailyTrends?.periods?.map(date => ({ date, count: dailyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
                loading={dailyTrendsLoading}
                title="Daily Performance"
              />
              <TrendsChart
                data={weeklyTrends?.periods?.map(date => ({ date, count: weeklyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
                loading={weeklyTrendsLoading}
                title="Weekly Performance"
              />
              <TrendsChart
                data={monthlyTrends?.periods?.map(date => ({ date, count: monthlyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
                loading={monthlyTrendsLoading}
                title="Monthly Performance"
              />
            </div>
          </div>
        )}

        {/* Workflow Tab */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Status Distribution
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-700">Pending</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_status?.Pending || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-700">In Process</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_status?.["In Process"] || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">Resolved</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_status?.Resolved || 0}</span>
                  </div>
                </div>
              </div>

              {/* Urgency Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Urgency Levels
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-700">Highly Urgent</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_urgency?.["HIGHLY URGENT"] || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm text-gray-700">Urgent</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_urgency?.URGENT || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-700">Normal</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.by_urgency?.NORMAL || 0}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Total Cases</span>
                    <span className="font-semibold text-gray-900">{stats?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">This Week</span>
                    <span className="font-semibold text-gray-900">{stats?.this_week || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">This Month</span>
                    <span className="font-semibold text-gray-900">{stats?.this_month || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <IssueBreakdownTable 
              data={issueTypes || []} 
              loading={issueTypesLoading} 
            />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LocationHotspotsChart
                data={hotspots || []}
                loading={hotspotsLoading}
              />
              <QualityMetricsChart
                data={qualityMetrics || []}
                loading={qualityMetricsLoading}
              />
            </div>
            <TrendsChart
              data={weeklyTrends?.periods?.map(date => ({ date, count: weeklyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
              loading={weeklyTrendsLoading}
              title="Weekly Trends (Last 12 Weeks)"
            />
            <TrendsChart
              data={monthlyTrends?.periods?.map(date => ({ date, count: monthlyTrends?.total_by_period?.[date] ?? 0 })) ?? []}
              loading={monthlyTrendsLoading}
              title="Monthly Trends (Last 12 Months)"
            />
          </div>
        )}

        {/* My Cases Tab */}
        {activeTab === 4 && (
          <div className="space-y-6">
            <AdminGrievanceManager user={user} />
          </div>
        )}
      </div>
    </div>
  );
}
