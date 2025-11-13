"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Mail, 
  Building2, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  UserCheck,
  BarChart3,
  Award,
  ChevronRight,
  ArrowLeft
} from "lucide-react";

export default function TeamManagement({ user }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterMunicipality, setFilterMunicipality] = useState("all");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedMunicipalAdmin, setSelectedMunicipalAdmin] = useState(null);
  const [departmentAdmins, setDepartmentAdmins] = useState([]);
  const [departmentAdminsLoading, setDepartmentAdminsLoading] = useState(false);
  const [adminStats, setAdminStats] = useState({});
  const [statsLoading, setStatsLoading] = useState({});
  const [municipalities, setMunicipalities] = useState([]);

  const DEPARTMENTS = [
    "Municipal Governance & Community Services",
    "Education, Health & Social Welfare",
    "Infrastructure, Utilities & Natural Resources",
    "Security & Law Enforcement"
  ];

  const isSuperAdmin = user?.role === "super_admin";
  const isMunicipalAdmin = user?.role === "municipal_admin";

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    if (isSuperAdmin) {
      // Super Admin: Fetch all municipal admins in their district
      axios.get("/api/admins/", {
        params: {
          district_id: user.district_id,
          role: "municipal_admin"
        }
      })
      .then(res => {
        setAdmins(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching municipal admins:", err);
        setLoading(false);
      });
      
      // Fetch municipalities for filter
      if (user.district_id) {
        axios.get(`/api/location/municipalities/?district_id=${user.district_id}`)
          .then(res => setMunicipalities(res.data || []))
          .catch(() => setMunicipalities([]));
      }
    } else if (isMunicipalAdmin && user.municipality_id) {
      // Municipal Admin: Fetch all department admins in their municipality
      axios.get("/api/admins/", {
        params: {
          municipality_id: user.municipality_id,
          role: "department_admin"
        }
      })
      .then(res => {
        setAdmins(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching department admins:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, isSuperAdmin, isMunicipalAdmin]);

  // Fetch department admins for a selected municipal admin (Super Admin only)
  const fetchDepartmentAdmins = (municipalAdmin) => {
    setSelectedMunicipalAdmin(municipalAdmin);
    setSelectedAdmin(null); // Reset department admin selection
    setDepartmentAdminsLoading(true);
    
    axios.get("/api/admins/", {
      params: {
        municipality_id: municipalAdmin.municipality_id,
        role: "department_admin"
      }
    })
    .then(res => {
      setDepartmentAdmins(res.data || []);
      setDepartmentAdminsLoading(false);
    })
    .catch(err => {
      console.error("Error fetching department admins:", err);
      setDepartmentAdminsLoading(false);
    });
  };

  // Go back to municipal admins list (Super Admin only)
  const goBackToMunicipalAdmins = () => {
    setSelectedMunicipalAdmin(null);
    setDepartmentAdmins([]);
    setSelectedAdmin(null);
  };

  // Fetch stats for a specific admin
  const fetchAdminStats = (admin) => {
    if (adminStats[admin.id]) {
      // Already loaded
      setSelectedAdmin(admin);
      return;
    }

    setStatsLoading(prev => ({ ...prev, [admin.id]: true }));
    
    const params = {};
    
    if (isSuperAdmin && selectedMunicipalAdmin) {
      // For Super Admin viewing a department admin
      params.department = admin.department;
      params.municipality_id = admin.municipality_id;
    } else if (isSuperAdmin && !selectedMunicipalAdmin) {
      // For Super Admin viewing a municipal admin
      params.municipality_id = admin.municipality_id;
    } else if (isMunicipalAdmin) {
      // For Municipal Admin viewing a department admin
      params.department = admin.department;
      params.municipality_id = admin.municipality_id;
    }

    axios.get("/api/analytics/summary", { params })
      .then(res => {
        const data = res.data?.data || res.data;
        setAdminStats(prev => ({
          ...prev,
          [admin.id]: data
        }));
        setSelectedAdmin(admin);
        setStatsLoading(prev => ({ ...prev, [admin.id]: false }));
      })
      .catch(err => {
        console.error("Error fetching admin stats:", err);
        setStatsLoading(prev => ({ ...prev, [admin.id]: false }));
      });
  };

  // Determine which admins to display based on role and state
  const getDisplayAdmins = () => {
    if (isSuperAdmin && selectedMunicipalAdmin) {
      // Show department admins for the selected municipal admin
      return departmentAdmins;
    }
    // Show municipal admins for Super Admin, or department admins for Municipal Admin
    return admins;
  };

  const displayAdmins = getDisplayAdmins();

  const filteredAdmins = displayAdmins.filter(admin => {
    const matchesSearch = admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For Super Admin viewing municipal admins
    if (isSuperAdmin && !selectedMunicipalAdmin) {
      const matchesMunicipality = filterMunicipality === "all" || 
                                 admin.municipality_id === parseInt(filterMunicipality);
      return matchesSearch && matchesMunicipality;
    }
    
    // For Municipal Admin or Super Admin viewing department admins
    const matchesDepartment = filterDepartment === "all" || admin.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Group admins by department (for department admins view)
  const adminsByDepartment = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = filteredAdmins.filter(admin => admin.department === dept);
    return acc;
  }, {});

  // Group admins by municipality (for municipal admins view)
  const adminsByMunicipality = municipalities.reduce((acc, mun) => {
    acc[mun.name] = filteredAdmins.filter(admin => admin.municipality_id === mun.id);
    return acc;
  }, {});

  const totalAdmins = filteredAdmins.length;
  const activeDepartments = Object.values(adminsByDepartment).filter(arr => arr.length > 0).length;
  const activeMunicipalities = Object.values(adminsByMunicipality).filter(arr => arr.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation (for Super Admin) */}
      {isSuperAdmin && selectedMunicipalAdmin && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <button
            onClick={goBackToMunicipalAdmins}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Municipal Admins
          </button>
          <div className="mt-2 text-sm text-gray-600">
            Viewing Department Admins in <span className="font-semibold text-gray-900">{selectedMunicipalAdmin.municipality_name}</span>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {isSuperAdmin && !selectedMunicipalAdmin ? "Municipal Admins" : "Team Members"}
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalAdmins}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {isSuperAdmin && !selectedMunicipalAdmin ? "Municipalities" : "Active Departments"}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {isSuperAdmin && !selectedMunicipalAdmin ? activeMunicipalities : activeDepartments}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Municipality</p>
              <p className="text-lg font-bold text-gray-900">
                {selectedMunicipalAdmin?.municipality_name || user?.municipality_name || "All"}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">District</p>
              <p className="text-lg font-bold text-gray-900">{user?.district_name}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Show Municipality filter for Super Admin viewing municipal admins */}
          {isSuperAdmin && !selectedMunicipalAdmin && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterMunicipality}
                onChange={(e) => setFilterMunicipality(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Municipalities</option>
                {municipalities.map(mun => (
                  <option key={mun.id} value={mun.id}>{mun.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Show Department filter when viewing department admins */}
          {(!isSuperAdmin || selectedMunicipalAdmin) && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {isSuperAdmin && !selectedMunicipalAdmin 
              ? `Municipal Admins (${filteredAdmins.length})`
              : `Department Admins (${filteredAdmins.length})`
            }
          </h3>
          
          {(loading || departmentAdminsLoading) ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : filteredAdmins.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {isSuperAdmin && !selectedMunicipalAdmin 
                  ? "No municipal admins found"
                  : "No department admins found"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredAdmins.map(admin => {
                const isMunicipalAdmin = admin.role === "municipal_admin";
                
                return (
                  <div
                    key={admin.id}
                    className={`bg-white rounded-xl shadow-sm p-5 border cursor-pointer transition-all hover:shadow-md ${
                      selectedAdmin?.id === admin.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                    }`}
                    onClick={() => {
                      if (isMunicipalAdmin && isSuperAdmin) {
                        // Super Admin clicking on Municipal Admin - show their department admins
                        fetchDepartmentAdmins(admin);
                      } else {
                        // Show stats for this admin
                        fetchAdminStats(admin);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{admin.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Mail className="w-4 h-4" />
                          {admin.email}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedAdmin?.id === admin.id 
                          ? 'bg-blue-600 text-white' 
                          : isMunicipalAdmin && isSuperAdmin
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedAdmin?.id === admin.id 
                          ? 'Selected' 
                          : isMunicipalAdmin && isSuperAdmin 
                          ? 'View Team' 
                          : 'View Stats'
                        }
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 font-medium">
                        {isMunicipalAdmin 
                          ? admin.municipality_name 
                          : admin.department
                        }
                      </span>
                    </div>
                    
                    {isMunicipalAdmin && isSuperAdmin && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm text-blue-600">
                        <ChevronRight className="w-4 h-4" />
                        <span>Click to view department admins</span>
                      </div>
                    )}
                    
                    {statsLoading[admin.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Performance Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Performance Analytics
          </h3>
          
          {!selectedAdmin ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a team member to view their performance</p>
            </div>
          ) : statsLoading[selectedAdmin.id] ? (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Admin Info Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{selectedAdmin.name}</h4>
                    <p className="text-blue-100 text-sm">
                      {selectedAdmin.role === "municipal_admin" 
                        ? `Municipal Admin - ${selectedAdmin.municipality_name}`
                        : selectedAdmin.department
                      }
                    </p>
                  </div>
                </div>
                <div className="text-blue-100 text-sm flex items-center justify-between">
                  <span>{selectedAdmin.email}</span>
                  {selectedAdmin.role === "municipal_admin" && (
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">All Departments</span>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-gray-600 font-medium">Total Cases</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminStats[selectedAdmin.id]?.total || 0}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-gray-600 font-medium">Resolved</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {adminStats[selectedAdmin.id]?.by_status?.Resolved || 0}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-gray-600 font-medium">In Process</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {adminStats[selectedAdmin.id]?.by_status?.["In Process"] || 0}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-gray-600 font-medium">Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {adminStats[selectedAdmin.id]?.by_status?.Pending || 0}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Performance Metrics
                </h4>
                
                <div className="space-y-4">
                  {/* Resolution Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-700">Resolution Rate</span>
                      <span className="text-sm font-bold text-gray-900">
                        {adminStats[selectedAdmin.id]?.total > 0
                          ? Math.round(((adminStats[selectedAdmin.id]?.by_status?.Resolved || 0) / adminStats[selectedAdmin.id].total) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5 w-full overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                        style={{
                          width: `${adminStats[selectedAdmin.id]?.total > 0
                            ? Math.round(((adminStats[selectedAdmin.id]?.by_status?.Resolved || 0) / adminStats[selectedAdmin.id].total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Active Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-700">Active Cases Rate</span>
                      <span className="text-sm font-bold text-gray-900">
                        {adminStats[selectedAdmin.id]?.total > 0
                          ? Math.round(((adminStats[selectedAdmin.id]?.by_status?.["In Process"] || 0) / adminStats[selectedAdmin.id].total) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5 w-full overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                        style={{
                          width: `${adminStats[selectedAdmin.id]?.total > 0
                            ? Math.round(((adminStats[selectedAdmin.id]?.by_status?.["In Process"] || 0) / adminStats[selectedAdmin.id].total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Urgency Breakdown */}
              {adminStats[selectedAdmin.id]?.by_urgency && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <h4 className="font-semibold text-gray-800 mb-4">Urgency Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-gray-700">Highly Urgent</span>
                      </div>
                      <span className="font-bold text-red-600">
                        {adminStats[selectedAdmin.id]?.by_urgency?.["HIGHLY URGENT"] || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm text-gray-700">Urgent</span>
                      </div>
                      <span className="font-bold text-orange-600">
                        {adminStats[selectedAdmin.id]?.by_urgency?.URGENT || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-gray-700">Normal</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {adminStats[selectedAdmin.id]?.by_urgency?.NORMAL || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Department/Municipality Summary */}
      {isSuperAdmin && !selectedMunicipalAdmin ? (
        // For Super Admin viewing municipal admins - show municipality summary
        municipalities.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Municipality Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {municipalities.map(mun => {
                const count = adminsByMunicipality[mun.name]?.length || 0;
                return (
                  <div key={mun.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <p className="text-2xl font-bold text-gray-900 mb-1">{count}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{mun.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Municipal Admins</p>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        // For Municipal Admin or Super Admin viewing department admins - show department summary
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Department Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {DEPARTMENTS.map(dept => {
              const count = adminsByDepartment[dept]?.length || 0;
              return (
                <div key={dept} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <p className="text-2xl font-bold text-gray-900 mb-1">{count}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{dept}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
