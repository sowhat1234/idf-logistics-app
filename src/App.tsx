import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/components/Login';
import SignUp from '@/components/SignUp';
import Dashboard from '@/components/Dashboard';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import RequestManager from '@/components/RequestManager';
import PersonnelManager from '@/components/PersonnelManager';
import ConflictManager from '@/components/ConflictManager';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import Profile from '@/components/Profile';
import { Toaster } from '@/components/ui/toaster';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSignUp, setShowSignUp] = useState(false);

  if (!isAuthenticated) {
    if (showSignUp) {
      return <SignUp onBackToLogin={() => setShowSignUp(false)} />;
    }
    return <Login onShowSignUp={() => setShowSignUp(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'schedule':
        return <ScheduleCalendar />;
      case 'availability':
        return <RequestManager />;
      case 'personnel':
        return <PersonnelManager />;
      case 'conflicts':
        return <ConflictManager />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AppContent />
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
