import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { LandingPage } from '../components/LandingPage';
import { AuthPage } from '../components/AuthPage';
import { AdminAuthPage } from '../components/AdminAuthPage';
import { CitizenDashboard } from '../components/CitizenDashboard';
import { MunicipalAdminDashboard } from '../components/MunicipalAdminDashboard';
import { DepartmentAdminDashboard } from '../components/DepartmentAdminDashboard';
import { SuperAdminDashboard } from '../components/SuperAdminDashboard';

export default function MainApp() {
  type PageType = 'landing' | 'auth' | 'admin-auth' | 'citizen' | 'municipal' | 'department' | 'super';
  type UserType = 'citizen' | 'municipal' | 'department' | 'super' | null;

  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [userType, setUserType] = useState<UserType>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'admin-login') {
        setCurrentPage('admin-auth');
      } else if (hash === 'citizen-login') {
        setCurrentPage('auth');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCitizenLogin = (type: string) => {
    setUserType('citizen');
    setIsLoggedIn(true);
    setCurrentPage('citizen');
  };

  const handleAdminLogin = (type: string, department?: string) => {
    setUserType(type as UserType);
    setIsLoggedIn(true);
    if (department) {
      setSelectedDepartment(department);
    }
    setCurrentPage(type as PageType);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType(null);
    setSelectedDepartment('');
    setCurrentPage('landing');
    window.location.hash = '';
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as PageType);
    if (page === 'auth' || page === 'admin-auth') {
      window.location.hash = page === 'admin-auth' ? 'admin-login' : 'citizen-login';
    } else {
      window.location.hash = '';
    }
  };

  const getUserName = () => {
    switch (userType) {
      case 'citizen':
        return 'Ram Sharma';
      case 'municipal':
        return 'Municipal Admin';
      case 'department':
        const deptNames: { [key: string]: string } = {
          'public-works': 'John Doe (Public Works)',
          'sanitation': 'Jane Smith (Sanitation)',
          'electricity': 'Mike Johnson (Electricity)',
          'water-supply': 'Sarah Williams (Water Supply)',
          'health': 'David Brown (Health)',
        };
        return deptNames[selectedDepartment] || 'Department Admin';
      case 'super':
        return 'Super Admin';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        isLoggedIn={isLoggedIn}
        userName={getUserName()}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
      <main className="flex-1">
        {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
        {currentPage === 'auth' && <AuthPage onLogin={handleCitizenLogin} />}
        {currentPage === 'admin-auth' && <AdminAuthPage onLogin={handleAdminLogin} />}
        {currentPage === 'citizen' && <CitizenDashboard />}
        {currentPage === 'municipal' && <MunicipalAdminDashboard />}
        {currentPage === 'department' && <DepartmentAdminDashboard department={selectedDepartment} />}
        {currentPage === 'super' && <SuperAdminDashboard />}
      </main>
      <Footer />
    </div>
  );
}
