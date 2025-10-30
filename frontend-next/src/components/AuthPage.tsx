import React, { useState } from 'react';

interface AuthPageProps {
  onLogin: (type: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with backend API call
    if (citizenId && password) {
      onLogin('citizen');
    } else {
      setError('Please enter both Citizen ID and Password.');
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4">Citizen Login</h2>
      <form className="bg-white shadow rounded px-8 py-6 w-full max-w-sm" onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Citizen ID</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-indigo-500"
            value={citizenId}
            onChange={e => setCitizenId(e.target.value)}
            required
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
          />
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Login</button>
      </form>
    </section>
  );
};
