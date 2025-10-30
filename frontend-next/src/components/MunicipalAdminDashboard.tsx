import React from 'react';

export const MunicipalAdminDashboard: React.FC = () => (
  <section className="flex flex-col items-center justify-center min-h-[60vh] py-12">
    <h2 className="text-2xl font-bold text-indigo-700 mb-4">Municipal Admin Dashboard</h2>
    <div className="bg-white shadow rounded px-8 py-6 w-full max-w-2xl">
      {/* TODO: Replace with actual municipal admin dashboard features, connect to backend */}
      <p className="text-gray-700 mb-4">Welcome, Municipal Admin. Here you can manage grievances, assign departments, and view analytics.</p>
    </div>
  </section>
);
