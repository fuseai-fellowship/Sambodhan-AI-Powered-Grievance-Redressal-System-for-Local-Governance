import React from 'react';

export const SuperAdminDashboard: React.FC = () => (
  <section className="flex flex-col items-center justify-center min-h-[60vh] py-12">
    <h2 className="text-2xl font-bold text-indigo-700 mb-4">Super Admin Dashboard</h2>
    <div className="bg-white shadow rounded px-8 py-6 w-full max-w-2xl">
      {/* TODO: Replace with actual super admin dashboard features, connect to backend */}
      <p className="text-gray-700 mb-4">Welcome, Super Admin. Here you can oversee all grievances, manage users, and view system analytics.</p>
    </div>
  </section>
);
