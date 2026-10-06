import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import AppRoutes from './routes/AppRoutes';
import api from './api/axios';

export default function App() {
  const location = useLocation();
  const [backendHealth, setBackendHealth] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  const fetchHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await api.get('/health');
      if (res && res.data) {
        setBackendHealth(res.data);
      } else {
        setBackendHealth({ status: 'degraded' });
      }
    } catch (err) {
      console.error('Failed to fetch backend health:', err);
      setBackendHealth({
        status: 'disconnected',
        error: err.message || 'Cannot reach API server',
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Periodically poll health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isDashboardRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/faculty') ||
    location.pathname.startsWith('/student');

  if (isDashboardRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <AppRoutes
          backendHealth={backendHealth}
          isChecking={isChecking}
          refetchHealth={fetchHealth}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header backendHealth={backendHealth} isChecking={isChecking} />
      <main className="flex-1">
        <AppRoutes
          backendHealth={backendHealth}
          isChecking={isChecking}
          refetchHealth={fetchHealth}
        />
      </main>
      <Footer />
    </div>
  );
}
