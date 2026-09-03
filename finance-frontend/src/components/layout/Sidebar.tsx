import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Briefcase,
  Settings as SettingsIcon,
  Bed,
} from 'lucide-react';
import odstDashboardLogo from '../../assets/odstdahboard.png';
import { useAuth } from '../../context/AuthContext';
import { useMaintenance } from '../../context/MaintenanceContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { locks } = useMaintenance();
  const { t } = useTranslation();

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-[260px] bg-[#242e69] text-white flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
      {/* Top Section */}
      <div>
        {/* Logo container */}
        <div className="px-6 pt-8 pb-6 flex items-center justify-start">
          <img
            src={odstDashboardLogo}
            alt="DST Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        {/* Divider line */}
        <div className="mx-6 border-b border-[#303c7c]" />

        {/* Navigation Menu */}
        <nav className="mt-6 px-4 space-y-2 font-inter">
          {user?.role !== 'Viewer' && (
            <Link
              to="/dashboard"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-[#f59e0b] text-white font-semibold'
                  : 'text-white hover:bg-[#303c7c] font-normal'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="flex-1">{t('nav.dashboard')}</span>
              {(locks.fullSystem || locks.dashboard) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Maint
                </span>
              )}
            </Link>
          )}

          <Link
            to="/invoices"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
              location.pathname === '/invoices'
                ? 'bg-[#f59e0b] text-white font-semibold'
                : 'text-white hover:bg-[#303c7c] font-normal'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="flex-1">{t('nav.confirmations')}</span>
            {(locks.fullSystem || locks.invoices) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Maint
              </span>
            )}
          </Link>

          <Link
            to="/requests"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
              location.pathname === '/requests'
                ? 'bg-[#f59e0b] text-white font-semibold'
                : 'text-white hover:bg-[#303c7c] font-normal'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="flex-1">{t('nav.requests')}</span>
            {(locks.fullSystem || locks.requests) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Maint
              </span>
            )}
          </Link>

          {['Super Admin', 'Chief Accountant', 'Division Director'].includes(user?.role || '') && (
            <Link
              to="/companies"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
                location.pathname === '/companies'
                  ? 'bg-[#f59e0b] text-white font-semibold'
                  : 'text-white hover:bg-[#303c7c] font-normal'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="flex-1">{t('nav.companies')}</span>
              {(locks.fullSystem || locks.companies) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Maint
                </span>
              )}
            </Link>
          )}

          <Link
            to="/hotel-reservations"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
              location.pathname === '/hotel-reservations'
                ? 'bg-[#f59e0b] text-white font-semibold'
                : 'text-white hover:bg-[#303c7c] font-normal'
            }`}
          >
            <Bed className="w-5 h-5" />
            <span className="flex-1">{t('nav.hotelReservations')}</span>
            {(locks.fullSystem || locks.hotelReservations) && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Maint
              </span>
            )}
          </Link>

          {user?.role !== 'Viewer' && (
            <Link
              to="/settings"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[14px] transition-all ${
                location.pathname === '/settings'
                  ? 'bg-[#f59e0b] text-white font-semibold'
                  : 'text-white hover:bg-[#303c7c] font-normal'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="flex-1">{t('nav.settings')}</span>
              {(locks.fullSystem || locks.settings) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Maint
                </span>
              )}
            </Link>
          )}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="pb-6">
        {/* Divider line */}
        <div className="mx-6 mb-5 border-b border-[#303c7c]" />

        {/* Footer Profile Card */}
        <div className="px-6 flex items-center justify-start font-inter">
          <div className="flex items-center space-x-3 min-w-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white text-[#242e69] font-bold flex items-center justify-center text-[15px] flex-shrink-0">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-semibold text-white truncate" title={user?.name || 'Guest User'}>
                {user?.name || 'Guest User'}
              </span>
              <span className="text-[12px] text-[#a0a8cc] font-medium truncate" title={user?.role || 'Guest'}>
                {user?.role || 'Guest'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
