import React, { useState } from 'react';

interface AdminAuthPageProps {
  onLogin: (type: string, department?: string) => void;
}

export const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ onLogin }) => {
  const [adminType, setAdminType] = useState('municipal');
  const [department, setDepartment] = useState('');
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with backend API call
    if (adminId && password) {
      onLogin(adminType, department);
    } else {
      setError('Please enter all required fields.');
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4">Admin Login</h2>
      <form className="bg-white shadow rounded px-8 py-6 w-full max-w-sm" onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Admin Type</label>
          <select
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-indigo-500"
            value={adminType}
            onChange={e => setAdminType(e.target.value)}
          >
            <option value="municipal">Municipal Admin</option>
            <option value="department">Department Admin</option>
            <option value="super">Super Admin</option>
          </select>
        </div>
        {adminType === 'department' && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Department</label>
            <select
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-indigo-500"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              <option value="public-works">Public Works</option>
              <option value="sanitation">Sanitation</option>
              <option value="electricity">Electricity</option>
              <option value="water-supply">Water Supply</option>
              <option value="health">Health</option>
            </select>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Admin ID</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-indigo-500"
            value={adminId}
            onChange={e => setAdminId(e.target.value)}
            required
            placeholder="Enter Admin ID"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-indigo-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Enter Password"
          />
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Login</button>
      </form>
    </section>
  );
};
