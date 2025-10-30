"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api-client";
import DashboardInsights from "@/components/DashboardInsights";
import FileComplaintForm from './FileComplaintForm';

// Footer from LandingPage
function DashboardFooter() {
  return (
  <footer className="w-full bg-[#003C88] text-white pt-10 pb-3 border-l-0 border-r-0">
  <div className="w-full pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="ml-8">
          <div className="flex items-center gap-2 mb-3">
            <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-7 w-7 object-contain rounded shadow" />
            <h3 className="font-semibold text-lg">Citizen Grievance System</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">A modern platform for citizens to voice their concerns and for local governance to respond efficiently.</p>
  </div>
        <div className="md:ml-20">
          <h4 className="font-semibold text-lg mb-3">Contact Information</h4>
          <ul className="space-y-2 text-sm text-gray-200">
            <li>
              <span className="inline-block align-middle mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 4.5a1 1 0 011-1H6.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" />
                </svg>
              </span>
              +977-1-XXXXXXX
            </li>
            <li>
              <span className="inline-block align-middle mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18">
                  <rect width="512" height="512" rx="80" fill="#ECEFF1"/>
                  <polygon points="256,296 32,144 32,432 480,432 480,144" fill="#D32F2F"/>
                  <polygon points="256,296 32,144 256,296 480,144" fill="#F44336"/>
                  <polygon points="256,296 32,432 256,296 480,432" fill="#FFFFFF"/>
                </svg>
              </span>
              info@grievance.gov.np
            </li>
            <li>
              <span className="inline-block align-middle mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18">
                  <circle cx="256" cy="256" r="256" fill="#D2A4BC"/>
                  <circle cx="256" cy="342" r="80" fill="#E6E6E6" stroke="#222" strokeWidth="8"/>
                  <path d="M256 352c-44-80-80-144-80-184a80 80 0 01160 0c0 40-36 104-80 184z" fill="#F44336" stroke="#222" strokeWidth="8"/>
                  <circle cx="256" cy="172" r="32" fill="#FFF" stroke="#222" strokeWidth="8"/>
                  <circle cx="256" cy="172" r="16" fill="#F44336" stroke="#222" strokeWidth="8"/>
                </svg>
              </span>
              Kathmandu, Nepal
            </li>
          </ul>
  </div>
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
      <div className="mt-10 border-t border-gray-400/20 pt-6 text-center text-sm text-gray-300">
        © 2025 Government of Nepal. All rights reserved.
      </div>
    </footer>
  );
}
import { User, Clock, CheckCircle2, TrendingUp, FileText, CheckCircle, Info, MapPin, Zap, Wrench, Trash2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import axios from "axios";


// Types for dropdowns
type District = { id: string | number; name: string };
type Municipality = { id: string | number; name: string };
type Ward = { id: string | number; ward_number: string | number };

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
  // Dropdown states
  const [districts, setDistricts] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [wards, setWards] = useState([]);

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
      icon: <CheckCircle2 className="w-6 h-6 text-gray-500" />,
      title: "Resolved",
      value: stats.resolved,
      subtitle: `${Math.round((stats.resolved / (stats.total || 1)) * 100)}% success rate`,
      valueColor: "text-green-600",
    },
    {
      icon: <Clock className="w-6 h-6 text-gray-500" />,
      title: "Active Cases",
      value: stats.active,
      subtitle: "In progress",
      valueColor: "text-blue-600",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-gray-500" />,
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
    Electricity: <Zap className="w-4 h-4" />,
    Infrastructure: <Wrench className="w-4 h-4" />,
    Sanitation: <Trash2 className="w-4 h-4" />,
  };

  // Map real complaints to grievance cards (fallback to demo if none)
  const grievanceCards = (complaints.length > 0 ? complaints.slice(0, 3) : [
    {
      id: "GRV-2025-001",
      title: "Street Light Not Working",
      date: "2025-10-15",
      ward: "Ward 12, Thamel",
      category: "Electricity",
      status: "Resolved",
      priority: "Medium",
    },
    {
      id: "GRV-2025-045",
      title: "Road Repair Needed",
      date: "2025-10-20",
      ward: "Ward 12, Main Road",
      category: "Infrastructure",
      status: "In Progress",
      priority: "High",
    },
    {
      id: "GRV-2025-062",
      title: "Garbage Collection Delay",
      date: "2025-10-25",
      ward: "Ward 12, Residential Area",
      category: "Sanitation",
      status: "Pending",
      priority: "Medium",
    },
  ]).map((g, idx) => (
    <div key={g.id || idx} className="flex justify-between items-center border rounded-xl p-4 hover:shadow-md transition bg-white">
      <div>
        <h3 className="font-medium text-gray-900">{g.title}</h3>
        <p className="text-sm text-gray-500">{g.id} • {g.date}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
          <MapPin className="w-4 h-4" /> {g.ward}
          <span className="flex items-center gap-1 ml-3">{icons[g.category] || null} {g.category}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={g.status} />
        <PriorityBadge priority={g.priority} />
      </div>
    </div>
  ));

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
  <div className="min-h-screen bg-gray-50 font-inter w-full">
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
          <User className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-700">{user?.name || "User"}</span>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md font-medium transition"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Welcome Section */}
  <main className="w-full px-10 py-8">
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
                onClick={() => setActiveTab(tab)}
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
              <DashboardInsights complaints={complaints} />
              {/* Recent Grievances Section */}
              <section className="bg-white p-6 rounded-xl shadow-sm border mt-12">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-semibold text-lg text-gray-800">Recent Grievances</h2>
                    <p className="text-sm text-gray-500">Your latest submissions</p>
                  </div>
                  <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {grievanceCards}
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {complaints.map((g) => {
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
                    if (g.ward && (g.ward.ward_number || g.ward.ward_number === 0)) {
                      const wNum = g.ward.ward_number;
                      if (typeof wNum === 'number' && wNum > 0) wardDisplay = `Ward ${wNum}`;
                      else if (typeof wNum === 'string' && wNum.trim() !== '' && wNum !== '0') wardDisplay = `Ward ${wNum}`;
                    } else if (g.ward_number && g.ward_number !== '0' && g.ward_number !== 0) {
                      wardDisplay = `Ward ${g.ward_number}`;
                    }

                    return (
                      <div key={g.id} className="flex flex-col justify-between border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">ID: {g.id}</span>
                          <span className="text-xs text-gray-400">{new Date(g.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mb-2">
                          <span className="inline-block text-sm font-medium text-blue-700 mr-2">{g.department}</span>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${g.urgency === 'HIGHLY URGENT' ? 'bg-red-100 text-red-700' : g.urgency === 'URGENT' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{g.urgency}</span>
                        </div>
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Ward:</span> {wardDisplay}
                        </div>
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded text-xs font-medium ${statusLabel === 'Resolved' ? 'bg-green-100 text-green-700' : statusLabel === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{statusLabel}</span>
                        </div>
                        <div className="mb-2 text-sm text-gray-600">
                          <span className="font-semibold">Message:</span> {g.message.length > 80 ? g.message.slice(0, 80) + '...' : g.message}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-medium transition" title="View Details">View</button>
                          <button className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-medium transition" title="Delete">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                <Info className="w-5 h-5 text-gray-600" />
                <h2 className="font-semibold text-gray-800 text-lg">Community Updates</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Latest news from Ward 12</p>
              <div className="space-y-5">
                {updates.map((u, i) => (
                  <div key={i} className="flex items-start gap-3 border-t pt-3 first:border-t-0 first:pt-0">
                    {u.type === "success" ? (
                      <CheckCircle className="text-green-600 w-5 h-5 mt-0.5" />
                    ) : (
                      <Info className="text-blue-500 w-5 h-5 mt-0.5" />
                    )}
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
            <div className="bg-white p-8 rounded-xl shadow-sm border mt-8">
              <h2 className="font-semibold text-lg text-gray-800 mb-2">Support</h2>
              <p className="text-gray-600">Contact support or find help resources here.</p>
              {/* TODO: Add support/help content */}
            </div>
          )}
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
};

export default Dashboard;

