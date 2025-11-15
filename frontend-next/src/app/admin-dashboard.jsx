"use client";
import React, { useEffect, useState, Suspense } from "react";
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
import TeamManagement from "../components/dashboard/TeamManagement";
import MisclassificationManager from "../components/dashboard/MisclassificationManager";
import AdminRegistration from "../components/dashboard/AdminRegistration";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, Users, Clock, CheckCircle, AlertCircle, BarChart3, LogOut, Building2, RefreshCw, Zap, Database, FolderKanban } from "lucide-react";
import Cookies from "js-cookie";

const TABS = [
  { name: "Overview", icon: BarChart3 },
  { name: "Team Performance", icon: Users },
  { name: "Team Management", icon: Users },
  { name: "Workflow", icon: TrendingUp },
  { name: "Analytics", icon: BarChart3 },
  { name: "Classification Review", icon: AlertCircle },
  { name: "My Cases", icon: CheckCircle },
];

function AdminDashboardInner() {
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
    
    // If user is super_admin and district_name is missing, fetch it
    if (user.role === 'super_admin' && !user.district_name && user.district_id) {
      axios.get(`/api/location/districts/${user.district_id}`)
        .then(res => {
          const updatedUser = { ...user, district_name: res.data.name };
          setUser(updatedUser);
          Cookies.set('sambodhan_admin_user', JSON.stringify(updatedUser), { expires: 7 });
        })
        .catch(err => console.error("Error fetching district name:", err));
    }
    
    // If user has municipality_id but missing municipality_name or district_name, fetch them
    if (user.municipality_id && (!user.municipality_name || !user.district_name)) {
      axios.get(`/api/location/municipalities/${user.municipality_id}`)
        .then(res => {
          const updatedUser = { 
            ...user, 
            municipality_name: res.data.name,
            district_name: res.data.district?.name || user.district_name 
          };
          setUser(updatedUser);
          Cookies.set('sambodhan_admin_user', JSON.stringify(updatedUser), { expires: 7 });
        })
        .catch(err => console.error("Error fetching municipality/district names:", err));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Build params based on user role
    const params = {};
    
    if (user.role === "super_admin") {
      // Super Admin: Include district_id to get ALL municipalities in that district
      // Do NOT include department or municipality_id - they see everything in the district
      if (user.district_id) {
        params.district_id = user.district_id;
      }
    } else if (user.role === "municipal_admin") {
      // Municipal Admin: Include municipality_id but NOT department (all departments in municipality)
      if (user.municipality_id) {
        params.municipality_id = user.municipality_id;
      }
    } else if (user.role === "department_admin") {
      // Department Admin: Include both municipality and department
      if (user.department) params.department = user.department;
      if (user.municipality_id) params.municipality_id = user.municipality_id;
    } else if (user.role === "ward_admin" && user.ward_id) {
      // Ward Admin: Include ward_id
      params.ward_id = user.ward_id;
    }
    
    console.log("Dashboard params for role", user.role, ":", params);
    
    // Clear cache first for fresh data (especially important for super admin)
    if (user.role === 'super_admin') {
      axios.post("/api/analytics/recompute").catch(() => {
        console.log("Cache clear failed or endpoint not available, continuing with cached data");
      });
    }
    
    // Fetch summary/stats
    setStatsLoading(true);
    axios.get("/api/analytics/summary", { params }).then(res => {
      console.log("=== SUMMARY API RESPONSE ===");
      console.log("Full response:", res);
      console.log("res.data:", res.data);
      console.log("res.data.data:", res.data?.data);
      
      const rawData = res.data?.data || res.data;
      console.log("Extracted rawData:", rawData);
      
      // For super admin, if municipality_details exists, calculate total from it
      if (user.role === 'super_admin' && rawData?.municipality_details) {
        const municipalityTotal = Object.values(rawData.municipality_details).reduce(
          (sum, munData) => sum + (munData.total || 0), 
          0
        );
        console.log("Calculated total from municipality_details:", municipalityTotal);
        if (municipalityTotal > 0 && (!rawData.total || rawData.total < municipalityTotal)) {
          rawData.total = municipalityTotal;
          rawData.total_complaints = municipalityTotal;
          console.log("Updated rawData.total to:", municipalityTotal);
        }
      }
      
      console.log("Summary stats breakdown:", {
        total: rawData?.total,
        total_complaints: rawData?.total_complaints,
        team_members: rawData?.team_members,
        by_status: rawData?.by_status,
        by_urgency: rawData?.by_urgency,
        by_department: rawData?.by_department
      });
      console.log("========================");
      setStats(rawData);
      setStatsLoading(false);
    }).catch((err) => {
      console.error("Error fetching stats:", err);
      setStatsLoading(false);
    });
    
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

  // Determine which tabs to show based on user role
  const getAvailableTabs = () => {
    const baseTabs = [
      { name: "Overview", icon: BarChart3 },
      { name: "Team Performance", icon: Users },
    ];

    // Only Municipal Admin and Super Admin can see Team Management
    if (user?.role === 'municipal_admin' || user?.role === 'super_admin') {
      baseTabs.push({ name: "Team Management", icon: Users });
    }

    baseTabs.push(
      { name: "Workflow", icon: TrendingUp },
      { name: "Analytics", icon: BarChart3 }
    );

    // Classification Review tab for all admins
    baseTabs.push({ name: "Classification Review", icon: AlertCircle });

    // Only Super Admin sees "Retrain Models" tab
    if (user?.role === 'super_admin') {
      baseTabs.push({ name: "Retrain Models", icon: RefreshCw });
    }

    // Only Department Admin sees "My Cases" tab
    if (user?.role === 'department_admin') {
      baseTabs.push({ name: "My Cases", icon: CheckCircle });
    }

    return baseTabs;
  };

  const availableTabs = user ? getAvailableTabs() : TABS;

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
              <div className="text-xs text-gray-500">
                {user?.role === 'municipal_admin' 
                  ? 'Municipal Admin' 
                  : user?.role === 'super_admin'
                  ? 'Super Admin'
                  : user?.role === 'department_admin'
                  ? `${user?.department}`
                  : user?.role}
              </div>
            </div>
            {/* Only show Admin Registration for Super Admin */}
            {user?.role === 'super_admin' && <AdminRegistration />}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {user?.role === 'municipal_admin' 
                ? "Municipal Admin Dashboard" 
                : user?.role === 'super_admin'
                ? "Super Admin Dashboard"
                : user?.department || "Department Dashboard"}
            </h1>
            <p className="text-gray-600">
              {user?.role === 'super_admin' 
                ? (user?.district_name || "District")
                : `${user?.municipality_name || "Municipality"} • ${user?.district_name || "District"}`
              }
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#DC143C]">
                {stats?.total ?? stats?.total_complaints ?? stats?.data?.total ?? stats?.data?.total_complaints ?? 0}
              </div>
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
          {availableTabs.map((tab, idx) => {
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
        {availableTabs[activeTab]?.name === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Metrics & Breakdown */}
            <div className="lg:col-span-1 space-y-6">
              <IssueBreakdownTable 
                data={issueTypes || []} 
                loading={issueTypesLoading} 
              />
              <PerformanceBenchmark 
                data={benchmark || {}} 
                loading={benchmarkLoading}
                stats={stats}
                statsLoading={statsLoading}
              />
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
        {availableTabs[activeTab]?.name === "Team Performance" && (
          <div className="space-y-6">
            <PerformanceBenchmark 
              data={benchmark || {}} 
              loading={benchmarkLoading}
              stats={stats}
              statsLoading={statsLoading}
            />
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

        {/* Team Management Tab */}
        {availableTabs[activeTab]?.name === "Team Management" && (
          <TeamManagement user={user} />
        )}

        {/* Workflow Tab */}
        {availableTabs[activeTab]?.name === "Workflow" && (
          <div className="space-y-6">
            {/* Check if user is Super Admin and we have municipality details */}
            {user?.role === "super_admin" && stats?.municipality_details && Object.keys(stats.municipality_details).length > 0 ? (
              // Super Admin View: Show data by municipality
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">District-Wide Overview by Municipality</h3>
                  <p className="text-sm text-blue-700">Data is organized by each municipality in your district</p>
                </div>
                
                {Object.entries(stats.municipality_details).map(([municipalityName, munData]) => (
                  <div key={municipalityName} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                      {municipalityName}
                      <span className="ml-auto text-sm font-normal text-gray-600">
                        Total Cases: <span className="font-bold text-gray-900">{munData.total || 0}</span>
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Status Distribution for this municipality */}
                      <div className="bg-gray-50 rounded-lg p-5">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          Status Distribution
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-gray-700">Pending</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_status?.Pending || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-gray-700">In Process</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_status?.["In Process"] || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm text-gray-700">Resolved</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_status?.Resolved || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Urgency Breakdown for this municipality */}
                      <div className="bg-gray-50 rounded-lg p-5">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          Urgency Levels
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm text-gray-700">Highly Urgent</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_urgency?.["HIGHLY URGENT"] || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span className="text-sm text-gray-700">Urgent</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_urgency?.URGENT || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-gray-700">Normal</span>
                            </div>
                            <span className="font-semibold text-gray-900">{munData.by_urgency?.NORMAL || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <IssueBreakdownTable 
                  data={issueTypes || []} 
                  loading={issueTypesLoading} 
                />
              </div>
            ) : (
              // Default View for Municipal Admin and Department Admin
              <>
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
            </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {availableTabs[activeTab]?.name === "Analytics" && (
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

        {/* Classification Review Tab */}
        {availableTabs[activeTab]?.name === "Classification Review" && (
          <div className="space-y-6">
            <MisclassificationManager user={user} />
          </div>
        )}

        {/* Retrain Models Tab - Super Admin Only */}
        {availableTabs[activeTab]?.name === "Retrain Models" && (
          <div className="space-y-6">
            <RetrainModelsSection />
          </div>
        )}

        {/* My Cases Tab */}
        {availableTabs[activeTab]?.name === "My Cases" && (
          <div className="space-y-6">
            <AdminGrievanceManager user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

// Page-level wrapper adding Suspense boundary required for useSearchParams()
export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading dashboard...</div>}>
      <AdminDashboardInner />
    </Suspense>
  );
}

// Retrain Models Section Component
function RetrainModelsSection() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0: idle, 1: dataset, 2: department, 3: urgency, 4: done
  const [result, setResult] = useState(null);

  const handleRetrainAll = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post('/api/orchestrator/trigger');
      setResult({
        success: true,
        message: response.data?.message || 'Workflow started. You may continue other work.',
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.detail || error.message || 'Failed to start workflow.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#003C88] to-[#0052b3] text-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <RefreshCw className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Model Retraining Center</h2>
        </div>
        <p className="text-blue-100">
          Retrain all models with updated data to improve classification accuracy for misclassified grievances
        </p>
      </div>

      {/* Info Alert */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-1">Important Information</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Retraining initiates Hugging Face Spaces which may take several minutes to start</li>
              <li>Models will be trained on the latest corrected data from the Classification Review section</li>
              <li>You can monitor the progress in the Hugging Face Spaces dashboard</li>
              <li>Once training completes, the new model will automatically be deployed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Single Retrain Button and Progress */}
      <div className="bg-white rounded-xl shadow-md border-2 border-blue-200 overflow-hidden transition-all p-6 flex flex-col items-center">
        <button
          onClick={handleRetrainAll}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Starting Workflow...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Trigger Orchestrator Workflow
            </>
          )}
        </button>
        {result && (
          <div className={`mb-4 p-3 rounded-lg border ${result.success ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-red-100 border-red-300 text-red-800'}`}>
            <p className="text-sm font-medium mb-1">{result.message}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-200 w-full">
          <p className="text-xs text-gray-500 font-mono">
            POST /api/orchestrator/trigger
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#003C88]" />
          Retraining Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Review & Correct</h4>
              <p className="text-xs text-gray-600">Use Classification Review tab to fix misclassified data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Prepare Dataset</h4>
              <p className="text-xs text-gray-600">Click "Retrain All Models" to update training data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Retrain Models</h4>
              <p className="text-xs text-gray-600">Department and Urgency classifiers retrained</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">4</div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Auto-Deploy</h4>
              <p className="text-xs text-gray-600">Updated models are automatically deployed when ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
