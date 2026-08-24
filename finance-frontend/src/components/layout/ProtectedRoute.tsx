import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Tampilkan loading screen estetik saat memverifikasi sesi di startup
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fa] font-inter">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div className="w-10 h-10 border-4 border-[#007aff]/30 border-t-[#007aff] rounded-full animate-spin"></div>
          <span className="text-[13px] text-[#64748b] font-medium animate-pulse">
            Verifying secure session...
          </span>
        </div>
      </div>
    );
  }

  // Jika belum login, tendang ke login page "/"
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Jika sudah login, tampilkan halaman anak
  return <Outlet />;
};

export default ProtectedRoute;
