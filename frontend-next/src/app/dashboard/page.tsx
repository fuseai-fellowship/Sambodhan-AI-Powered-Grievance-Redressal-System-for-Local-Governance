"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "../lib/api-client";
import DashboardInsights from "@/components/DashboardInsights";
import FileComplaintForm from './FileComplaintForm';
import SummaryCards from "@/components/dashboard/SummaryCards";
import PerformanceBenchmark from "@/components/dashboard/PerformanceBenchmark";
import QualityMetricsChart from "@/components/dashboard/QualityMetricsChart";
import LocationHotspotsChart from "@/components/dashboard/LocationHotspotsChart";
import IssueBreakdownTable from "@/components/dashboard/IssueBreakdownTable";
import ResponseTimeChart from "@/components/dashboard/ResponseTimeChart";
import AdminGrievanceManager from "@/components/dashboard/AdminGrievanceManager";

// Admin Analytics Dashboard Section
function AdminAnalyticsDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [locationHotspots, setLocationHotspots] = useState<any>(null);
  const [issueBreakdown, setIssueBreakdown] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, performanceRes, qualityRes, hotspotsRes, breakdownRes, responseRes] = await Promise.all([
          apiClient.get('/api/analytics/summary'),
          apiClient.get('/api/analytics/performance'),
          apiClient.get('/api/analytics/quality-metrics'),
          apiClient.get('/api/analytics/location-hotspots'),
          apiClient.get('/api/analytics/issue-breakdown'),
          apiClient.get('/api/analytics/response-time'),
        ]);
        setSummary(summaryRes.data);
        setPerformance(performanceRes.data);
        setQualityMetrics(qualityRes.data);
        setLocationHotspots(hotspotsRes.data);
        setIssueBreakdown(breakdownRes.data);
        setResponseTime(responseRes.data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="mb-12 px-2 md:px-0">
      <h2 className="text-2xl font-bold mb-6">Admin Analytics Dashboard</h2>
      {/* Overview & Team Performance */}
      <SummaryCards data={summary} loading={loading} />

      {/* Workflow & Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <PerformanceBenchmark data={performance} loading={loading} stats={{}} statsLoading={false} />
        <QualityMetricsChart data={qualityMetrics} loading={loading} />
      </div>

      {/* My Cases & Issue Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Replace with actual user prop if needed */}
        <AdminGrievanceManager user={summary?.user} />
        <IssueBreakdownTable data={issueBreakdown} loading={loading} />
      </div>

      {/* Location Hotspots & Response Time Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <LocationHotspotsChart data={locationHotspots} loading={loading} />
        <ResponseTimeChart data={responseTime} loading={loading} />
      </div>
    </div>
  );
}

// Footer from LandingPage
// ...existing DashboardFooter code...
import { FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import axios from "axios";



// Main Dashboard Page
const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!user) return <div className="p-8 text-center text-red-500">You must be logged in to view the dashboard.</div>;

  // Debug: Log user object to console
  console.log("Dashboard - Current user:", user);
  console.log("Dashboard - User role:", user.role);

  // Show admin analytics if user is admin, otherwise show citizen dashboard
  if (user.role === 'admin') {
    return <AdminAnalyticsDashboard />;
  }
  
  // Show citizen dashboard for all other users (including 'citizen' role)
  return <Dashboard />;
};

const Dashboard = () => {
  // Get user and logout from AuthContext
  const { user, logout } = useAuth ? useAuth() : { user: null, logout: () => {} };
  // Loading state for dashboard
  const [loading, setLoading] = useState(false);
  // Auth error state for login/session issues
  const [authError, setAuthError] = useState("");
  // Location dropdown states for grievance form
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Add react-hook-form for grievance submission (must be before any use of watch)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({});

  // Sync selected district/municipality with form values
  const selectedDistrictId = watch('district_id');
  const selectedMunicipalityId = watch('municipality_id');

  // Load districts on mount
  useEffect(() => {
    setLoadingDistricts(true);
    apiClient.get('/locations/districts/')
      .then(res => setDistricts(res.data))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false));
  }, []);

  // Load municipalities when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      setLoadingMunicipalities(true);
      apiClient.get(`/locations/municipalities/?district_id=${selectedDistrictId}`)
        .then(res => setMunicipalities(res.data))
        .catch(() => setMunicipalities([]))
        .finally(() => setLoadingMunicipalities(false));
    } else {
      setMunicipalities([]);
      setWards([]);
    }
  }, [selectedDistrictId]);

  // Load wards when municipality changes
  useEffect(() => {
    if (selectedMunicipalityId) {
      setLoadingWards(true);
      apiClient.get(`/locations/wards/?municipality_id=${selectedMunicipalityId}`)
        .then(res => setWards(res.data))
        .catch(() => setWards([]))
        .finally(() => setLoadingWards(false));
    } else {
      setWards([]);
    }
  }, [selectedMunicipalityId]);
  // Add react-hook-form for grievance submission

  // Grievance form submission handler
  const onSubmit = async (data: any) => {
    setLoadingForm(true);
    setError('');
    setSuccess('');
    try {
      // 1. Call HuggingFace API for urgency classification
      const urgencyRes = await fetch('https://kar137-sambodhan-urgency-classifier-space.hf.space/predict_urgency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.description })
      });
      const urgencyData = await urgencyRes.json();
      const urgency = urgencyData?.label || 'unknown';

      // 2. Call HuggingFace API for department classification
      const deptRes = await fetch('https://mr-kush-sambodhan-department-classifier.hf.space/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.description })
      });
      const deptData = await deptRes.json();
      const department = deptData?.label || 'unknown';

      // 3. Build FormData payload including all fields, urgency, department, and file
      const payload = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'file' && value && (value as FileList).length > 0) {
          payload.append('file', (value as FileList)[0]);
        } else if (value !== null && value !== undefined) {
          payload.append(key, value as string);
        }
      });
      payload.append('urgency', urgency);
      payload.append('department', department);

      // 4. Send to backend/database
      await apiClient.post('/chatbot/auth/complaints', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Grievance submitted successfully!');
      setShowConfirm(false);
    } catch (err) {
      setError('Failed to submit grievance. Please try again.');
    } finally {
      setLoadingForm(false);
    }
  };
  const [activeTab, setActiveTab] = useState('Dashboard');
  // Enhanced grievance form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ward_id: '',
    location: '',
    phone: '+977-9841234567',
    category: '',
    file: undefined as FileList | undefined,
  });
  type Category = { id: number; name: string };
  type Ward = { id: number; ward_number: number };
  const [categories, setCategories] = useState<Category[]>([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);
  type Complaint = {
    id: number;
    status_name: string;
    [key: string]: any;
  };
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    active: 0,
    avgResolution: 0,
  });
  // Pagination state for My Grievances
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  // Dropdown states
  const [districts, setDistricts] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [wards, setWards] = useState([]);
  
  // Modal state for viewing complaint details
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Handle quick action clicks
  const handleQuickAction = (actionName: string) => {
    setActiveTab('Submit Grievance');
    // Pre-fill the form with the action name
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        title: actionName,
        description: `I want to report: ${actionName}`,
      }));
    }, 100);
  };

  // View complaint details
  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailsModal(true);
  };

  // Delete complaint
  const handleDeleteClick = (complaintId: number) => {
    setComplaintToDelete(complaintId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!complaintToDelete) return;
    
    setDeleting(true);
    try {
      await apiClient.delete(`/api/complaints/${complaintToDelete}`);
      // Remove from local state
      setComplaints(prev => prev.filter(c => c.id !== complaintToDelete));
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
      }));
      setShowDeleteConfirm(false);
      setComplaintToDelete(null);
    } catch (err) {
      alert('Failed to delete complaint. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Load categories and wards (simulate API)
  useEffect(() => {
  apiClient.get('/chatbot/departments').then(res => setCategories(res.data)).catch(() => setCategories([]));
    apiClient.get('/locations/wards/').then(res => setWards(res.data)).catch(() => setWards([]));
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files : value
    }));
  };


  const handleFormPreview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowConfirm(true);
  };


  const handleFormSubmit = async () => {
    setLoadingForm(true);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'file' && value && (value as FileList).length > 0) {
          payload.append('file', (value as FileList)[0]);
        } else if (key === 'ward_id' && value) {
          payload.append('ward_id', String(value));
        } else if (value !== null && value !== undefined) {
          payload.append(key, value as string);
        }
      });
      await apiClient.post('/chatbot/auth/complaints', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Grievance submitted successfully!');
  setFormData({ title: '', description: '', ward_id: '', location: '', phone: '+977-9841234567', category: '', file: undefined });
      setShowConfirm(false);
    } catch (err) {
      setError('Failed to submit grievance. Please try again.');
    } finally {
      setLoadingForm(false);
    }
  };
    // if (loading) return;
    // if (!user) {
    //   setAuthError("You are not logged in. Please login to view your dashboard.");
    //   return;
    // }
    // Fetch complaints only once on mount
    useEffect(() => {
      apiClient.get("/chatbot/auth/complaints")
        .then(res => {
          console.log("Complaints API Response:", res.data);
          if (res.data.length > 0) {
            console.log("First complaint sample:", res.data[0]);
          }
          setComplaints(res.data);
          // Calculate stats
          const total = res.data.length;
          const resolved = res.data.filter((c: Complaint) => c.status_name === "Resolved").length;
          const active = res.data.filter((c: Complaint) => c.status_name === "In Progress").length;
          setStats({
            total,
            resolved,
            active,
            avgResolution: 6.5, // Replace with actual calculation
          });
        })
        .catch(err => {
          if (err.response?.status === 401) {
            setAuthError("Session expired or unauthorized. Please login again.");
          }
        });
    }, []);
  // ...existing code...

  const cards = [
    {
      icon: <FileText className="w-6 h-6 text-gray-500" />,
      title: "Total Submissions",
      value: stats.total,
      subtitle: "All time",
      valueColor: "text-red-600",
    },
    {
      icon: null,
      title: "Resolved",
      value: stats.resolved,
      subtitle: `${Math.round((stats.resolved / (stats.total || 1)) * 100)}% success rate`,
      valueColor: "text-green-600",
    },
    {
      icon: null,
      title: "Active Cases",
      value: stats.active,
      subtitle: "In progress",
      valueColor: "text-blue-600",
    },
    {
      icon: null,
      title: "Avg. Resolution",
      value: `${stats.avgResolution} days`,
      subtitle: "Better than average",
      valueColor: "text-green-600",
    },
  ];

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-inter">
        <div className="bg-white rounded-xl border p-8 shadow-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Authentication Error</h2>
          <p className="text-gray-700 mb-4">{authError}</p>
          <a href="/auth/login" className="text-blue-600 underline font-semibold">Go to Login</a>
  </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter">
        <span className="text-lg text-gray-700">Loading...</span>
      </div>
    );
  }

  // Helper components for new sections
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Resolved: "bg-green-100 text-green-700",
      "In Progress": "bg-blue-100 text-blue-700",
      Pending: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-md ${styles[status]}`}>{status}</span>
    );
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      High: "bg-red-600",
      Medium: "bg-blue-900",
    };
    return (
      <span className={`text-white text-xs font-semibold px-3 py-1 rounded-md ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  const icons: Record<string, React.ReactNode> = {
    Electricity: null,
    Infrastructure: null,
    Sanitation: null,
  };

  // Map real complaints to recent grievances (top 3 latest)
  const recentGrievances = complaints.slice(0, 3).map((g) => {
    // Map status
    const statusMap: Record<string | number, string> = {
      0: 'Pending', 1: 'In Progress', 2: 'Resolved', 3: 'Rejected',
      'Pending': 'Pending', 'In Progress': 'In Progress', 'Resolved': 'Resolved', 'Rejected': 'Rejected',
    };
    let statusLabel = statusMap[g.current_status] || statusMap[g.status_name] || 'Pending';

    // Extract location info
    let municipalityName = '';
    let districtName = '';
    let wardNumber = null;

    // Try municipality_name and district_name from top level first
    if (g.municipality_name && g.municipality_name.trim() !== '') {
      municipalityName = g.municipality_name;
    }
    if (g.district_name && g.district_name.trim() !== '') {
      districtName = g.district_name;
    }

    // Fallback to nested ward object
    if (!municipalityName && g.ward?.municipality) {
      municipalityName = g.ward.municipality.name || '';
      if (!districtName && g.ward.municipality.district) {
        districtName = g.ward.municipality.district.name || '';
      }
    }
    
    // Get ward number/name
    if (g.ward_name && g.ward_name.trim() !== '') {
      wardNumber = g.ward_name;
    } else if (g.ward && (g.ward.ward_number || g.ward.ward_number === 0)) {
      wardNumber = g.ward.ward_number;
    }

    const location = municipalityName && districtName 
      ? `${municipalityName}, ${districtName}` 
      : municipalityName || districtName || 'Location not specified';
    
    const wardDisplay = (wardNumber && (typeof wardNumber === 'string' ? wardNumber.trim() !== '' : wardNumber > 0)) 
      ? `Ward ${wardNumber}` 
      : (g.ward_id && g.ward_id > 0 ? `Ward ID: ${g.ward_id}` : '-');

    // Department - use department_name from API
    const department = (g.department_name && g.department_name.trim() !== '') 
      ? g.department_name 
      : 'General';

    // Urgency - use urgency_name from API
    const urgency = (g.urgency_name && g.urgency_name.trim() !== '') 
      ? g.urgency_name.toUpperCase()  // Ensure uppercase for consistency
      : 'NORMAL';

    // Format date
    const formattedDate = g.created_at 
      ? new Date(g.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'short', day: 'numeric' 
        })
      : 'N/A';

    // Message preview (first 80 chars)
    const messagePreview = g.message 
      ? g.message.length > 80 ? g.message.substring(0, 80) + '...' : g.message
      : 'No description provided';

    return {
      id: g.id,
      complaintNumber: `#${g.id}`,
      department,
      urgency,
      status: statusLabel,
      date: formattedDate,
      location,
      ward: wardDisplay,
      message: messagePreview,
    };
  });

  // Community updates (static for now)
  const updates = [
    {
      type: "success",
      title: "Ward 12 - Road Maintenance Completed",
      desc: "Major road maintenance work completed on Main Road.",
      date: "2025-10-25",
    },
    {
      type: "info",
      title: "New Waste Collection Schedule",
      desc: "Updated schedule: Monday, Wednesday, Friday - 6:00 AM",
    },
  ];

  return (
  <div className="min-h-screen bg-gray-50 font-inter w-full flex flex-col">
      {/* Navbar from Landing Page, but with only required content */}
  <nav className="w-full flex justify-between items-center px-8 py-2 shadow-sm bg-white/70 backdrop-blur-lg sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center gap-3">
          <img
            src="/nepal-flag.gif"
            alt="Nepal Flag"
            className="h-10 w-10 object-contain rounded shadow-[0_0_4px_#e5e7eb]"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-red-700 leading-tight">
              नागरिक गुनासो व्यवस्थापन
            </span>
            <span className="text-sm text-blue-700">Citizen Grievance System</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            {/* Removed missing icon: User */}
            <span className="text-base font-semibold">{user?.name || "User"}</span>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Welcome Section */}
  <main className="flex-1 w-full px-10 py-8">
        <div className="mb-2">
          <span className="block text-lg font-semibold text-red-700">Welcome, {user?.name || "User"}!</span>
        </div>
        <p className="text-gray-600 mt-1">
          Track, submit, and manage your grievances efficiently
        </p>

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center space-x-3">
                {card.icon}
                <p className="text-gray-700 font-medium">{card.title}</p>
              </div>
              <div className={`mt-3 text-2xl font-semibold ${card.valueColor}`}>{card.value}</div>
              <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="mt-10 flex flex-wrap gap-2">
          {["Dashboard", "My Grievances", "Submit Grievance", "Community", "Support"].map(
            (tab, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(tab);
                  // Reset to first page when switching to My Grievances
                  if (tab === "My Grievances") {
                    setCurrentPage(1);
                  }
                }}
                className={`border rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition ${
                  activeTab === tab
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "Dashboard" && (
            <>
              <DashboardInsights complaints={complaints} onQuickAction={handleQuickAction} />
              {/* Recent Grievances Section */}
              <section className="bg-white p-6 rounded-xl shadow-sm border mt-12">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="font-semibold text-lg text-gray-800">Recent Grievances</h2>
                    <p className="text-sm text-gray-500">Your latest submissions</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('My Grievances')}
                    className="text-sm text-red-600 font-medium hover:text-red-700 hover:underline transition"
                  >
                    View All →
                  </button>
                </div>
                {complaints.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No grievances submitted yet</p>
                    <p className="text-sm text-gray-400 mb-4">Start by submitting your first complaint</p>
                    <button
                      onClick={() => setActiveTab('Submit Grievance')}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
                    >
                      Submit Grievance
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentGrievances.map((g) => {
                      // Status badge styling
                      const statusStyles: Record<string, string> = {
                        'Resolved': 'bg-green-100 text-green-700 border-green-200',
                        'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
                        'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        'Rejected': 'bg-red-100 text-red-700 border-red-200',
                      };

                      // Urgency badge styling
                      const urgencyStyles: Record<string, string> = {
                        'HIGHLY URGENT': 'bg-red-100 text-red-700 border-red-200',
                        'URGENT': 'bg-orange-100 text-orange-700 border-orange-200',
                        'NORMAL': 'bg-gray-100 text-gray-600 border-gray-200',
                      };

                      return (
                        <div 
                          key={g.id} 
                          className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-gray-300 transition-all bg-gray-50"
                        >
                          {/* Header Row */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-gray-900">{g.complaintNumber}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{g.date}</span>
                              </div>
                              <h3 className="text-base font-semibold text-gray-800 mb-2">{g.department}</h3>
                              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{g.message}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusStyles[g.status] || statusStyles['Pending']}`}>
                                {g.status}
                              </span>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${urgencyStyles[g.urgency] || urgencyStyles['NORMAL']}`}>
                                {g.urgency}
                              </span>
                            </div>
                          </div>

                          {/* Footer Row */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-1">
                              {/* Removed missing icon: MapPin */}
                              <span>{g.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Removed missing icon: Info */}
                              <span>{g.ward}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
          {activeTab === "My Grievances" && (
            <div className="bg-white p-8 rounded-xl shadow-sm border mt-8">
              <h2 className="font-semibold text-lg text-gray-800 mb-2">My Grievances</h2>
              <p className="text-gray-600 mb-6">List and manage your submitted grievances here.</p>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading grievances...</div>
              ) : complaints.length === 0 ? (
                <div className="py-8 text-center text-gray-400">No grievances submitted yet.</div>
              ) : (
                <>
                  {/* Pagination Info */}
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, complaints.length)} of {complaints.length} grievances
                    </p>
                    <p className="text-sm text-gray-500">
                      Page {currentPage} of {Math.ceil(complaints.length / itemsPerPage)}
                    </p>
                  </div>

                  {/* Grievances Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {complaints
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((g) => {
                        // Map status code to label
                        const statusMap: Record<string | number, string> = {
                          0: 'Pending',
                          1: 'In Progress',
                          2: 'Resolved',
                          3: 'Rejected',
                          'Pending': 'Pending',
                          'In Progress': 'In Progress',
                          'Resolved': 'Resolved',
                          'Rejected': 'Rejected',
                        };
                        // Try all possible status fields
                        let statusLabel = statusMap[g.current_status];
                        if (!statusLabel && g.status_name) statusLabel = statusMap[g.status_name] || g.status_name;
                        if (!statusLabel && typeof g.status === 'number') statusLabel = statusMap[g.status];
                        if (!statusLabel && typeof g.status === 'string') statusLabel = statusMap[g.status] || g.status;
                        if (!statusLabel) statusLabel = 'Pending';

                        // Ward display: handle missing, zero, or string cases
                        let wardDisplay = '-';
                        let wardNumber = null;
                        
                        // Try ward_name first (from the API response we see ward_name: "")
                        if (g.ward_name && g.ward_name.trim() !== '') {
                          wardDisplay = g.ward_name;
                        } else if (g.ward && (g.ward.ward_number || g.ward.ward_number === 0)) {
                          // Check nested ward object
                          wardNumber = g.ward.ward_number;
                          if (typeof wardNumber === 'number' && wardNumber > 0) {
                            wardDisplay = `Ward ${wardNumber}`;
                          } else if (typeof wardNumber === 'string' && wardNumber.trim() !== '' && wardNumber !== '0') {
                            wardDisplay = `Ward ${wardNumber}`;
                          }
                        } else if (g.ward_number && g.ward_number !== '0' && g.ward_number !== 0) {
                          // Check top-level ward_number
                          wardDisplay = `Ward ${g.ward_number}`;
                          wardNumber = g.ward_number;
                        } else if (g.ward_id && g.ward_id > 0) {
                          // If we have ward_id but no name/number, just show the ID
                          wardDisplay = `Ward ID: ${g.ward_id}`;
                        }

                        // Department display - use department_name from API
                        const departmentDisplay = (g.department_name && g.department_name.trim() !== '') 
                          ? g.department_name 
                          : 'General';

                        // Urgency display - use urgency_name from API
                        const urgencyDisplay = (g.urgency_name && g.urgency_name.trim() !== '') 
                          ? g.urgency_name.toUpperCase()  // Ensure uppercase for consistency
                          : 'NORMAL';

                        // Format date
                        const formattedDate = g.created_at 
                          ? new Date(g.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : 'N/A';

                        // Location display (Municipality/District)
                        let locationDisplay = '';
                        let municipalityName = '';
                        let districtName = '';
                        
                        // Try municipality_name and district_name from top level first
                        if (g.municipality_name && g.municipality_name.trim() !== '') {
                          municipalityName = g.municipality_name;
                        }
                        if (g.district_name && g.district_name.trim() !== '') {
                          districtName = g.district_name;
                        }
                        
                        // Fallback to nested ward.municipality.district structure
                        if (!municipalityName && g.ward?.municipality) {
                          municipalityName = g.ward.municipality.name || '';
                          if (!districtName && g.ward.municipality.district) {
                            districtName = g.ward.municipality.district.name || '';
                          }
                        }
                        
                        // Build location string
                        if (municipalityName && districtName) {
                          locationDisplay = `${municipalityName}, ${districtName}`;
                        } else if (municipalityName) {
                          locationDisplay = municipalityName;
                        } else if (districtName) {
                          locationDisplay = districtName;
                        } else {
                          locationDisplay = 'Not specified';
                        }

                        return (
                          <div key={g.id} className="flex flex-col justify-between border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
                            {/* Header with ID and Date */}
                            <div className="mb-3 pb-3 border-b border-gray-100">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-gray-700">Complaint #{g.id}</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusLabel === 'Resolved' ? 'bg-green-100 text-green-700' : statusLabel === 'Pending' ? 'bg-yellow-100 text-yellow-700' : statusLabel === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">{formattedDate}</span>
                            </div>

                            {/* Department and Urgency */}
                            <div className="mb-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Department:</span>
                                <span className="text-sm font-medium text-[#E8214A]">{departmentDisplay}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Priority:</span>
                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${urgencyDisplay === 'HIGHLY URGENT' ? 'bg-red-100 text-red-700' : urgencyDisplay === 'URGENT' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {urgencyDisplay}
                                </span>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="mb-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Location:</span>
                                <span className="text-sm text-gray-700">{locationDisplay}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Ward:</span>
                                <span className="text-sm text-gray-700">{wardDisplay}</span>
                              </div>
                            </div>

                            {/* Message */}
                            <div className="mb-4 grow">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Description:</p>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {g.message && g.message.trim() !== '' 
                                  ? g.message 
                                  : 'No description provided'}
                              </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                              <button 
                                onClick={() => handleViewDetails(g)}
                                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-sm"
                                title="View Details"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(g.id)}
                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-sm"
                                title="Delete Complaint"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Pagination Controls */}
                  {complaints.length > itemsPerPage && (
                    <div className="mt-6 flex items-center justify-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.ceil(complaints.length / itemsPerPage) }, (_, i) => i + 1).map((pageNum) => {
                          // Show first page, last page, current page, and pages around current
                          const totalPages = Math.ceil(complaints.length / itemsPerPage);
                          const showPage = 
                            pageNum === 1 || 
                            pageNum === totalPages || 
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                          
                          const showEllipsis = 
                            (pageNum === 2 && currentPage > 3) || 
                            (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                          if (showEllipsis) {
                            return <span key={pageNum} className="px-2 py-2 text-gray-400">...</span>;
                          }

                          if (!showPage) return null;

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${
                                currentPage === pageNum
                                  ? 'bg-[#E8214A] text-white border-[#E8214A]'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(complaints.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(complaints.length / itemsPerPage)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === "Submit Grievance" && (
            <div className="max-w-3xl mx-auto">
              <FileComplaintForm />
            </div>
          )}
          {activeTab === "Community" && (
            <section className="bg-white p-6 rounded-xl shadow-sm border mt-8">
              <div className="flex items-center gap-2 mb-2">
                {/* Removed missing icon: Info */}
                <h2 className="font-semibold text-gray-800 text-lg">Community Updates</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Latest news from Ward 12</p>
              <div className="space-y-5">
                {updates.map((u, i) => (
                  <div key={i} className="flex items-start gap-3 border-t pt-3 first:border-t-0 first:pt-0">
                    {u.type === "success" ? null : null}
                    <div>
                      <h3 className="font-medium text-gray-800">{u.title}</h3>
                      <p className="text-sm text-gray-600">{u.desc}</p>
                      {u.date && <p className="text-xs text-gray-400 mt-1">{u.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {activeTab === "Support" && (
            <div className="mt-8 space-y-6">
              {/* Header */}
              <div className="bg-linear-to-r from-red-600 to-red-700 rounded-xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
                <p className="text-red-100">We're here to assist you with your grievances and questions.</p>
              </div>

              {/* Contact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Support */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Support</h3>
                      <p className="text-sm text-gray-600 mb-3">Get help via email within 24 hours</p>
                      <a 
                        href="mailto:info@grievance.gov.np" 
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                      >
                        info@grievance.gov.np
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone Support */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Phone Support</h3>
                      <p className="text-sm text-gray-600 mb-3">Call us: Mon-Fri, 9 AM - 5 PM</p>
                      <a 
                        href="tel:+9779800000000" 
                        className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1"
                      >
                        +977 980-0000000
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Office Visit */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Visit Office</h3>
                      <p className="text-sm text-gray-600 mb-3">Walk-in support available</p>
                      <p className="text-sm text-gray-700">
                        Municipal Office, Ward 12<br />
                        Kathmandu, Nepal
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Chat */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Live Chat</h3>
                      <p className="text-sm text-gray-600 mb-3">Chat with our support team</p>
                      <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                        Start Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-800">How do I track my complaint?</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 text-sm text-gray-600 leading-relaxed">
                      You can track your complaint by going to the "My Grievances" section. Each complaint shows its current status and you can click "View Details" for more information.
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-800">How long does it take to resolve a complaint?</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 text-sm text-gray-600 leading-relaxed">
                      The average resolution time is 6-7 days. However, this varies depending on the complexity and urgency of your complaint. Urgent issues are prioritized and addressed faster.
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-800">Can I update my complaint after submission?</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 text-sm text-gray-600 leading-relaxed">
                      Currently, you cannot edit a submitted complaint directly. However, you can add additional information by contacting our support team via email or phone with your complaint ID.
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-800">What information do I need to file a complaint?</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 text-sm text-gray-600 leading-relaxed">
                      You need to provide your location details (District, Municipality, Ward), a clear description of your issue, and optionally attach any supporting documents or photos.
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-800">How will I be notified about updates?</span>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="p-4 text-sm text-gray-600 leading-relaxed">
                      You will receive notifications via email and SMS when your complaint status changes. Make sure your contact information is up to date in your profile.
                    </div>
                  </details>
                </div>
              </div>

              {/* Help Resources */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Helpful Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a href="#" className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition group">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">User Guide</p>
                      <p className="text-xs text-gray-600">Learn how to use the system</p>
                    </div>
                  </a>

                  <a href="#" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition group">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">Documentation</p>
                      <p className="text-xs text-gray-600">View complete docs</p>
                    </div>
                  </a>

                  <a href="#" className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition group">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900">Video Tutorials</p>
                      <p className="text-xs text-gray-600">Watch step-by-step guides</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* View Details Modal */}
      {showDetailsModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Complaint Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
                title="Close modal"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Complaint ID and Status */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <span className="text-sm text-gray-500">Complaint ID</span>
                  <p className="text-lg font-bold text-gray-900">#{selectedComplaint.id}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  selectedComplaint.status_name === 'Resolved' ? 'bg-green-100 text-green-700' :
                  selectedComplaint.status_name === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  selectedComplaint.status_name === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedComplaint.status_name || selectedComplaint.current_status || 'Pending'}
                </span>
              </div>

              {/* Department and Urgency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Department</span>
                  <p className="text-base font-semibold text-gray-900">{selectedComplaint.department_name || selectedComplaint.department || 'General'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Priority</span>
                  <p className={`text-base font-semibold ${
                    (selectedComplaint.urgency_name || selectedComplaint.urgency) === 'HIGHLY URGENT' ? 'text-red-600' :
                    (selectedComplaint.urgency_name || selectedComplaint.urgency) === 'URGENT' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {selectedComplaint.urgency_name || selectedComplaint.urgency || 'NORMAL'}
                  </p>
                </div>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Location</span>
                  <p className="text-base text-gray-900">
                    {selectedComplaint.municipality_name && selectedComplaint.district_name
                      ? `${selectedComplaint.municipality_name}, ${selectedComplaint.district_name}`
                      : selectedComplaint.municipality_name || selectedComplaint.district_name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ward</span>
                  <p className="text-base text-gray-900">
                    {selectedComplaint.ward_name || (selectedComplaint.ward_number ? `Ward ${selectedComplaint.ward_number}` : '-')}
                  </p>
                </div>
              </div>

              {/* Date Submitted */}
              <div>
                <span className="text-sm text-gray-500">Date Submitted</span>
                <p className="text-base text-gray-900">
                  {selectedComplaint.created_at 
                    ? new Date(selectedComplaint.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })
                    : 'N/A'}
                </p>
              </div>

              {/* Full Message */}
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="text-base text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg leading-relaxed">
                  {selectedComplaint.message || 'No description provided'}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Complaint?</h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete complaint #{complaintToDelete}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setComplaintToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer - Same as Landing Page */}
      <footer className="bg-[#003C88] text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Logo & Description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-7 w-7 object-contain rounded shadow" />
              <h3 className="font-semibold text-lg">Citizen Grievance System</h3>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">A modern platform for citizens to voice their concerns and for local governance to respond efficiently.</p>
          </div>
          {/* Center: Contact Info */}
          <div className="md:ml-20">
            <h4 className="font-semibold text-lg mb-3">Contact Information</h4>
            <ul className="space-y-3 text-sm text-gray-200">
              <li className="flex items-center gap-2">
                {/* Removed missing icon: Phone */}
                <span>+977-1-4211000</span>
              </li>
              <li className="flex items-center gap-2">
                {/* Removed missing icon: Mail */}
                <span>support@sambodhan.gov.np</span>
              </li>
              <li className="flex items-center gap-2">
                {/* Removed missing icon: MapPin */}
                <span>Singha Durbar, Kathmandu, Nepal</span>
              </li>
            </ul>
          </div>
          {/* Right: Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-200">
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Help & Support</a></li>
              <li><a href="#" className="hover:text-white">Accessibility</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-10 border-t border-white/20 pt-6 text-center text-sm text-gray-200">
          © 2025 Government of Nepal. All rights reserved.
        </div>
      </footer>
  {/* <DashboardFooter /> */}
    </div>
  );
};

export default DashboardPage;

