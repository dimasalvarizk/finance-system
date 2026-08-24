import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import ResetPassword from '../pages/Auth/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Invoices from '../pages/Invoices';
import Requests from '../pages/Requests';
import Companies from '../pages/Companies';
import Settings from '../pages/Settings';
import ProtectedRoute from '../components/layout/ProtectedRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rute Publik */}
      <Route path="/" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Rute Terproteksi */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
