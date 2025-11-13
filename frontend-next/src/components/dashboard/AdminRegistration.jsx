"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { UserPlus, X, AlertCircle, CheckCircle } from 'lucide-react';

const ADMIN_ROLES = [
  { label: 'Department Admin', value: 'department_admin' },
  { label: 'Municipal Admin', value: 'municipal_admin' },
  { label: 'Super Admin', value: 'super_admin' },
];

const DEPARTMENT_LABELS = [
  "Municipal Governance & Community Services",
  "Education, Health & Social Welfare",
  "Infrastructure, Utilities & Natural Resources",
  "Security & Law Enforcement"
];

export default function AdminRegistration() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState('department_admin');
  const [department, setDepartment] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    // Fetch districts
    axios.get('/api/location/districts/')
      .then(res => setDistricts(res.data))
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (districtId) {
      axios.get(`/api/location/municipalities/?district_id=${districtId}`)
        .then(res => setMunicipalities(res.data))
        .catch(() => setMunicipalities([]));
    } else {
      setMunicipalities([]);
    }
  }, [districtId]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setAdminRole('department_admin');
    setDepartment('');
    setMunicipalityId('');
    setDistrictId('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // For Municipal Admin and Super Admin, set department to null
      const departmentValue = (adminRole === 'municipal_admin' || adminRole === 'super_admin') ? null : department;
      
      // For Super Admin, set municipality_id to null
      const municipalityValue = adminRole === 'super_admin' ? null : (municipalityId || null);
      
      const payload = {
        name,
        email,
        password,
        role: adminRole,
        department: departmentValue,
        municipality_id: municipalityValue,
        district_id: districtId || null,
      };

      await axios.post('/api/admins/register', payload);
      setSuccess('Admin registered successfully!');
      setTimeout(() => {
        resetForm();
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message;
      setError(typeof errMsg === 'string' ? errMsg : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003C88] to-[#0052b3] text-white rounded-lg hover:from-[#002a66] hover:to-[#003c88] transition-all shadow-md hover:shadow-lg"
      >
        <UserPlus className="w-5 h-5" />
        Register New Admin
      </button>

      {/* Modal - Rendered using Portal */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#003C88] to-[#0052b3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Register New Admin</h2>
                  <p className="text-sm text-blue-100">Create administrative account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl text-green-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{success}</p>
                    <p className="text-xs text-green-700 mt-1">Redirecting...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-300 rounded-xl text-red-800 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium text-sm flex-1">{error}</p>
                </div>
              )}

              {/* Form Grid - 2 columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g., Ram Bahadur Thapa"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Address
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Password
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    minLength={6}
                  />
                </div>

                {/* Admin Role */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Admin Role
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white cursor-pointer"
                    value={adminRole}
                    onChange={e => setAdminRole(e.target.value)}
                  >
                    {ADMIN_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    District
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white cursor-pointer"
                    value={districtId}
                    onChange={e => setDistrictId(e.target.value)}
                    required
                  >
                    <option value="">Select district</option>
                    {districts.map(dist => (
                      <option key={dist.id} value={dist.id}>{dist.name}</option>
                    ))}
                  </select>
                </div>

                {/* Municipality - Conditional */}
                {(adminRole === 'department_admin' || adminRole === 'municipal_admin') && (
                  <div>
                    <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Municipality
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white cursor-pointer"
                      value={municipalityId}
                      onChange={e => setMunicipalityId(e.target.value)}
                      required
                    >
                      <option value="">Select municipality</option>
                      {municipalities.map(mun => (
                        <option key={mun.id} value={mun.id}>{mun.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department - Only for Department Admin */}
                {adminRole === 'department_admin' && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Department
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 bg-gray-50 focus:bg-white cursor-pointer"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      required
                    >
                      <option value="">Select department</option>
                      {DEPARTMENT_LABELS.map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Info Messages */}
              {adminRole === 'municipal_admin' && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Municipal Admin Privileges</p>
                    <p className="text-xs text-blue-800">This role will have access to all departments within the selected municipality.</p>
                  </div>
                </div>
              )}

              {adminRole === 'super_admin' && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900 mb-1">Super Admin Privileges</p>
                    <p className="text-xs text-green-800">This role will have access to all municipalities and departments within the selected district.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                  className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold flex items-center justify-center gap-2 shadow-sm"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#003C88] to-[#0052b3] text-white rounded-xl hover:from-[#002a66] hover:to-[#003c88] transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Register Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
