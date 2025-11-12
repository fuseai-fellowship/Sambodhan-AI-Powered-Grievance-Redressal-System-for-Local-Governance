"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const ADMIN_ROLES = [
  { label: 'Department Admin', value: 'department_admin' },
  { label: 'Municipal Admin', value: 'municipal_admin' },
  { label: 'Super Admin', value: 'super_admin' },
];

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState('department_admin');
  const DEPARTMENT_LABELS = [
    "Municipal Governance & Community Services",
    "Education, Health & Social Welfare",
    "Infrastructure, Utilities & Natural Resources",
    "Security & Law Enforcement"
  ];
  const [department, setDepartment] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [districts, setDistricts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const token = Cookies.get('sambodhan_token');
    const userStr = Cookies.get('sambodhan_admin_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          // User already logged in, redirect to dashboard
          router.replace(`/admin-dashboard?role=${user.role}&user_id=${user.id}`);
        }
      } catch (err) {
        // Invalid cookie, clear it
        Cookies.remove('sambodhan_token');
        Cookies.remove('sambodhan_admin_user');
      }
    }
  }, [router]);


  useEffect(() => {
    // Fetch districts (with trailing slash)
    axios.get('/api/locations/districts/')
      .then(res => setDistricts(res.data))
      .catch(() => setDistricts([]));
    // No need to fetch departments, use static labels
  }, []);


  useEffect(() => {
    if (districtId) {
      axios.get(`/api/locations/municipalities/?district_id=${districtId}`)
        .then(res => setMunicipalities(res.data))
        .catch(() => setMunicipalities([]));
    } else {
      setMunicipalities([]);
    }
  }, [districtId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Use correct admin login endpoint and payload
      const res = await axios.post('/api/admins/login', {
        email,
        password,
      });
      const { access_token, admin } = res.data;
      if (!admin || !admin.id) {
        setError('Login failed.');
        return;
      }
      // Store token in cookie for api-client to use (use admin-specific cookie)
      Cookies.set('sambodhan_token', access_token, { expires: 7 });
      Cookies.set('sambodhan_admin_user', JSON.stringify(admin), { expires: 7 });
      router.replace(`/admin-dashboard?role=${admin.role}&user_id=${admin.id}`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail;
      setError(typeof errMsg === 'string' ? errMsg : 'Login failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: any = {
        name,
        email,
        password,
        role: adminRole,
        department,
        municipality_id: municipalityId || null,
        district_id: districtId || null,
      };
      // Register admin
      await axios.post('/api/admins/register', payload);
      // Auto-login after registration
      const loginRes = await axios.post('/api/admins/login', {
        email,
        password,
      });
      const { access_token, admin } = loginRes.data;
      if (!admin || !admin.id) {
        setError('Login failed after registration.');
        return;
      }
      Cookies.set('sambodhan_token', access_token, { expires: 7 });
      Cookies.set('sambodhan_admin_user', JSON.stringify(admin), { expires: 7 });
      router.replace(`/admin-dashboard?role=${admin.role}&user_id=${admin.id}`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message;
      setError(typeof errMsg === 'string' ? errMsg : 'Registration failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form className="bg-white p-8 rounded-lg shadow-md w-full max-w-md" onSubmit={isRegister ? handleRegister : handleLogin}>
        <h2 className="text-2xl font-semibold mb-2">Admin Access</h2>
        <p className="mb-6 text-gray-600">Sign in with your administrative credentials</p>
        <div className="flex mb-6">
          <button type="button" className={`flex-1 py-2 rounded-l-full font-medium ${!isRegister ? 'bg-gray-100' : ''}`} onClick={() => setIsRegister(false)}>Login</button>
          <button type="button" className={`flex-1 py-2 rounded-r-full font-medium ${isRegister ? 'bg-gray-100' : ''}`} onClick={() => setIsRegister(true)}>Register</button>
        </div>
        {isRegister && (
          <>
            <label className="block mb-2 text-sm font-medium">Full Name</label>
            <input type="text" className="w-full mb-4 px-4 py-2 border rounded" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your name" title="Full Name" />
          </>
        )}
        <label className="block mb-2 text-sm font-medium">Email</label>
        <input type="email" className="w-full mb-4 px-4 py-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" title="Email" />
        <label className="block mb-2 text-sm font-medium">Password</label>
        <input type="password" className="w-full mb-4 px-4 py-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" title="Password" />
        <label className="block mb-2 text-sm font-medium">Admin Role</label>
        <select className="w-full mb-4 px-4 py-2 border rounded" value={adminRole} onChange={e => setAdminRole(e.target.value)} title="Admin Role">
          {ADMIN_ROLES.map((role: {label: string, value: string}) => (
            <option key={role.value + '-' + role.label} value={role.value}>{role.label}</option>
          ))}
        </select>
        {isRegister && (
          <>
            <label className="block mb-2 text-sm font-medium">District</label>
            <select className="w-full mb-4 px-4 py-2 border rounded" value={districtId} onChange={e => setDistrictId(e.target.value)} required title="District">
              <option value="">Select your district</option>
              {districts.map((dist: any) => (
                <option key={dist.id || dist} value={dist.id || dist}>{dist.name || dist}</option>
              ))}
            </select>
            <label className="block mb-2 text-sm font-medium">Municipality</label>
            <select className="w-full mb-4 px-4 py-2 border rounded" value={municipalityId} onChange={e => setMunicipalityId(e.target.value)} required title="Municipality">
              <option value="">Select your municipality</option>
              {municipalities.map((mun: any) => (
                <option key={mun.id || mun} value={mun.id || mun}>{mun.name || mun}</option>
              ))}
            </select>
            <label className="block mb-2 text-sm font-medium">Department</label>
            <select className="w-full mb-4 px-4 py-2 border rounded" value={department} onChange={e => setDepartment(e.target.value)} required title="Department">
              <option value="">Select your department</option>
              {DEPARTMENT_LABELS.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </>
        )}
        <div className="flex items-center mb-4">
          <label className="flex items-center mr-2">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="mr-2" title="Remember me" />
            <span className="text-sm">Remember me</span>
          </label>
          <a href="#" className="ml-auto text-sm text-red-500">Forgot password?</a>
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="w-full py-2 bg-red-600 text-white rounded font-semibold">{isRegister ? 'Register as Admin' : 'Login as Admin'}</button>
        <div className="mt-6 text-center text-sm">
          Are you a citizen? <a href="/citizen/login" className="text-red-600">Citizen Login</a>
        </div>
      </form>
    </div>
  );
};

export default AdminLoginPage;
