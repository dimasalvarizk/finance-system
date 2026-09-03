import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../context/MaintenanceContext';
import MaintenanceScreen from '../components/ui/MaintenanceScreen';

// Lazy-loaded pages for fast initial bundle loading & high Lighthouse performance
const Login = lazy(() => import('../pages/Auth/Login'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Invoices = lazy(() => import('../pages/Invoices'));
const Requests = lazy(() => import('../pages/Requests'));
const Companies = lazy(() => import('../pages/Companies'));
const Settings = lazy(() => import('../pages/Settings'));
const HotelReservations = lazy(() => import('../pages/HotelReservations'));
const AuditLog = lazy(() => import('../pages/AuditLog'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#f4f6fa]">
    <div className="w-9 h-9 border-4 border-[#1d2857] border-t-transparent rounded-full animate-spin" />
  </div>
);

const routeSeoMap: Record<string, { title: string; desc: string }> = {
  '/': {
    title: 'Login - ODST Finance System | PT. ODST AIRLINES INDO',
    desc: 'Secure login portal for ODST Group & Manazil AL.Mukhtara Group Finance System.'
  },
  '/reset-password': {
    title: 'Reset Password - ODST Finance System',
    desc: 'Reset your password for ODST Group Finance Portal.'
  },
  '/dashboard': {
    title: 'Dashboard Analytics - ODST Finance System',
    desc: 'Real-time financial metrics, total confirmations, revenue analytics, and pending requests overview.'
  },
  '/invoices': {
    title: 'General Confirmations & Payment Tracking - ODST Finance System',
    desc: 'Track advance payments, deposit ledgers, installment breakdown, and overpayment credit balances.'
  },
  '/requests': {
    title: 'Service Requests Management - ODST Finance System',
    desc: 'Manage and review financial service requests, multi-level approvals, and status tracking.'
  },
  '/companies': {
    title: 'Client Company Directory - ODST Finance System',
    desc: 'Manage client company profiles, credit balances, payment ledgers, and contact information.'
  },
  '/hotel-reservations': {
    title: 'Hotel Reservations & Bookings - ODST Finance System',
    desc: 'Track hotel reservation vouchers, room allocations, check-in dates, and deposit tracking.'
  },
  '/settings': {
    title: 'System Settings & Data Backup - ODST Finance System',
    desc: 'System backup logs, team access roles, branch management, company info, and system configuration.'
  }
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const { isModuleLocked, locks } = useMaintenance();
  const location = useLocation();

  useEffect(() => {
    const seo = routeSeoMap[location.pathname] || {
      title: 'ODST Finance System | Financial Tracking & Hotel Reservations',
      desc: 'Official Financial Tracking, Payment Ledger, Advance Payment Management, and Hotel Reservation System.'
    };
    
    document.title = seo.title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', seo.desc);
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', seo.desc);
      document.head.appendChild(metaDesc);
    }
  }, [location.pathname]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rute Terproteksi */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              isModuleLocked('dashboard') ? (
                <MaintenanceScreen moduleName="Dashboard Analytics" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : user?.role === 'Viewer' ? (
                <Navigate to="/invoices" replace />
              ) : (
                <Dashboard />
              )
            }
          />
          <Route
            path="/invoices"
            element={
              isModuleLocked('invoices') ? (
                <MaintenanceScreen moduleName="Modul Confirmations (Faktur)" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : (
                <Invoices />
              )
            }
          />
          <Route
            path="/requests"
            element={
              isModuleLocked('requests') ? (
                <MaintenanceScreen moduleName="Modul Requests (Permintaan)" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : (
                <Requests />
              )
            }
          />
          <Route
            path="/companies"
            element={
              isModuleLocked('companies') ? (
                <MaintenanceScreen moduleName="Modul Companies (Direktori Klien)" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : user?.role === 'Viewer' ? (
                <Navigate to="/invoices" replace />
              ) : (
                <Companies />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isModuleLocked('settings') ? (
                <MaintenanceScreen moduleName="Modul Settings (Pengaturan Sistem)" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : user?.role === 'Viewer' ? (
                <Navigate to="/invoices" replace />
              ) : (
                <Settings />
              )
            }
          />
          <Route
            path="/hotel-reservations"
            element={
              isModuleLocked('hotelReservations') ? (
                <MaintenanceScreen moduleName="Modul Hotel Reservations (Reservasi Hotel)" message={locks.message} estimatedTime={locks.estimatedTime} />
              ) : (
                <HotelReservations />
              )
            }
          />
          <Route
            path="/system-audit-hidden"
            element={
              (user?.name?.includes('Dimas') || user?.name?.includes('Ali') || user?.name === 'Super Admin')
                ? <AuditLog />
                : <Navigate to="/dashboard" replace />
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
