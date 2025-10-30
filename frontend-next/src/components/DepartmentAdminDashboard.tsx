import React from 'react';

interface DepartmentAdminDashboardProps {
  department: string;
}

export const DepartmentAdminDashboard: React.FC<DepartmentAdminDashboardProps> = ({ department }) => (
  <section className="flex flex-col items-center justify-center min-h-[60vh] py-12">
    <h2 className="text-2xl font-bold text-indigo-700 mb-4">Department Admin Dashboard</h2>
    <div className="bg-white shadow rounded px-8 py-6 w-full max-w-2xl">
      {/* TODO: Replace with actual department admin dashboard features, connect to backend */}
      <p className="text-gray-700 mb-4">Welcome, Department Admin ({department}). Here you can manage grievances assigned to your department.</p>
    </div>
  </section>
);
