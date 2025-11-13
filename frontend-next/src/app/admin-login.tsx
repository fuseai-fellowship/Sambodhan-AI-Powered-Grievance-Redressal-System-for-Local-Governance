"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <form className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200" onSubmit={handleLogin}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#003C88] to-[#0052b3] rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h2>
          <p className="text-gray-600">Sign in to access the administrative dashboard</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="admin@example.com" 
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="Enter your password" 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" 
              />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Forgot password?</a>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
          
          <button 
            type="submit" 
            className="w-full py-3 bg-gradient-to-r from-[#003C88] to-[#0052b3] text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:from-[#002a66] hover:to-[#003c88] transition-all transform hover:scale-[1.02]"
          >
            Sign In
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Are you a citizen?{' '}
            <a href="/citizen/login" className="text-blue-600 hover:text-blue-800 font-semibold">
              Citizen Login
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Admin registration is restricted to Super Admins only
          </p>
        </div>
      </form>
    </div>
  );
};

export default AdminLoginPage;
