import React from 'react';

interface HeaderProps {
  isLoggedIn: boolean;
  userName: string;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ isLoggedIn, userName, onLogout, onNavigate }) => (
  <header className="w-full bg-white shadow flex items-center justify-between px-6 py-4">
    <div className="flex items-center gap-4">
      <span className="font-bold text-xl text-indigo-700 cursor-pointer" onClick={() => onNavigate('landing')}>SambodhanAI</span>
      {isLoggedIn && <span className="text-gray-600">Welcome, {userName}</span>}
    </div>
    <nav className="flex items-center gap-4">
      {!isLoggedIn && (
        <>
          <button className="text-indigo-600 hover:underline" onClick={() => onNavigate('auth')}>Citizen Login</button>
          <button className="text-indigo-600 hover:underline" onClick={() => onNavigate('admin-auth')}>Admin Login</button>
        </>
      )}
      {isLoggedIn && (
        <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={onLogout}>Logout</button>
      )}
    </nav>
  </header>
);
