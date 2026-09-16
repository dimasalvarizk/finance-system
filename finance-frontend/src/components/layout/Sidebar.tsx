import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Building2,
  Home,
  Briefcase,
  FileText,
  Wallet,
  FilePlus,
  CheckSquare,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import odstDashboardLogo from '../../assets/odstdahboard.png';
import { useAuth } from '../../context/AuthContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useSidebar } from '../../context/SidebarContext';
import { isSuperAdminUser } from '../../utils/superAdminAuth';

interface NavItem {
  id: string;
  label: string;
  path: string;
  aliasPaths?: string[];
  icon: React.ElementType;
  visible?: boolean;
  isLocked?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  showIfEmpty?: boolean;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { locks } = useMaintenance();
  const { t } = useTranslation();
  const { isMobileOpen, closeSidebar } = useSidebar();

  const isDimasOrAli = isSuperAdminUser(user);

  // Automatically close mobile drawer when route changes
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navSections: NavSection[] = [
    {
      title: t('nav.overview') || 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: t('nav.dashboard') || 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          visible: user?.role !== 'Viewer',
          isLocked: locks.fullSystem || locks.dashboard,
        },
        {
          id: 'companies',
          label: t('nav.companies') || 'Companies',
          path: '/companies',
          icon: Building2,
          visible: ['Super Admin', 'Chief Accountant', 'Division Director'].includes(user?.role || ''),
          isLocked: locks.fullSystem || locks.companies,
        },
      ],
    },
    {
      title: t('nav.external') || 'EXTERNAL',
      items: [
        {
          id: 'hotel-reservations',
          label: t('nav.hotelReservations') || 'Hotel Reservations',
          path: '/hotel-reservations',
          icon: Home,
          visible: true,
          isLocked: locks.fullSystem || locks.hotelReservations,
        },
        {
          id: 'requests',
          label: t('nav.requests') || 'Requests',
          path: '/requests',
          icon: Briefcase,
          visible: true,
          isLocked: locks.fullSystem || locks.requests,
        },
        {
          id: 'invoices',
          label: t('nav.confirmations') || 'Confirmations',
          path: '/invoices',
          icon: FileText,
          visible: true,
          isLocked: locks.fullSystem || locks.invoices,
        },
      ],
    },
    {
      title: (import.meta.env.VITE_ENABLE_INTERNAL === 'true')
        ? (t('nav.internal') || 'INTERNAL')
        : `${t('nav.internal') || 'INTERNAL'} (${t('nav.comingSoon') || 'coming soon'})`,
      showIfEmpty: true,
      items: (import.meta.env.VITE_ENABLE_INTERNAL === 'true') ? [
        {
          id: 'my-expenses',
          label: t('nav.myExpenses') || 'My Expenses',
          path: '/my-expenses',
          aliasPaths: ['/internal/expenses', '/internal/my-expenses'],
          icon: Wallet,
          visible: true,
          isLocked: locks.fullSystem || locks.myExpenses,
        },
        {
          id: 'submit-expense',
          label: t('nav.submitExpense') || 'Submit Expense',
          path: '/submit-expense',
          aliasPaths: ['/internal/submit-expense'],
          icon: FilePlus,
          visible: true,
          isLocked: locks.fullSystem || locks.submitExpense,
        },
        {
          id: 'approvals',
          label: t('nav.approvals') || 'Approvals',
          path: '/approvals',
          aliasPaths: ['/internal/approvals'],
          icon: CheckSquare,
          visible: true,
          isLocked: locks.fullSystem || locks.approvals,
        },
      ] : [],
    },
    {
      title: t('nav.others') || 'OTHERS',
      items: [
        {
          id: 'settings',
          label: t('nav.settings') || 'Settings',
          path: '/settings',
          icon: SettingsIcon,
          visible: user?.role !== 'Viewer',
          isLocked: locks.fullSystem || locks.settings,
        },
        {
          id: 'super-admin',
          label: t('nav.superAdmin') || 'Super Admin',
          path: '/super-admin/dashboard',
          aliasPaths: ['/super-admin', '/system-audit-hidden'],
          icon: ShieldCheck,
          visible: isDimasOrAli,
        },
      ],
    },
  ];

  const renderNavContent = (isMobile: boolean = false) => (
    <>
      {/* Top Logo Section */}
      <div className="flex-shrink-0">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <img
            src={odstDashboardLogo}
            alt="DST Logo"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          {isMobile && (
            <button
              type="button"
              onClick={closeSidebar}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="mx-6 border-b border-[#303c7c]" />
      </div>

      {/* Middle Navigation Section */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-sidebar-scroll font-inter">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => item.visible !== false);
          if (visibleItems.length === 0 && !section.showIfEmpty) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] sm:text-[10.5px] font-bold tracking-wider text-[#7e8dbd] uppercase">
                {section.title}
              </div>

              {visibleItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.aliasPaths && item.aliasPaths.includes(location.pathname));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      if (isMobile) closeSidebar();
                    }}
                    className={`group relative flex items-center px-3 py-2.5 rounded-xl text-[13px] sm:text-[13.5px] transition-all ${
                      isActive
                        ? 'bg-[#f59e0b] text-white font-semibold shadow-sm'
                        : 'text-[#a6b0cf] hover:text-white hover:bg-[#303c7c]/50 font-medium'
                    }`}
                  >
                    {isActive ? (
                      <span className="w-1 h-4 bg-white rounded-full mr-2.5 flex-shrink-0" />
                    ) : (
                      <span className="w-1 mr-2.5 flex-shrink-0 invisible" />
                    )}

                    <Icon
                      className={`w-5 h-5 flex-shrink-0 mr-3 transition-colors ${
                        isActive ? 'text-white' : 'text-[#a6b0cf] group-hover:text-white'
                      }`}
                    />
                    
                    <span className="flex-1 truncate">{item.label}</span>

                    {item.isLocked && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 ${
                          isActive
                            ? 'bg-black/20 text-white border border-white/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        }`}
                      >
                        Maint
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom Profile Section */}
      <div className="flex-shrink-0 pb-5 pt-2">
        <div className="mx-6 mb-4 border-b border-[#303c7c]" />

        <div className="px-6 flex items-center justify-start font-inter">
          <div className="flex items-center space-x-3 min-w-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white text-[#242e69] font-bold flex items-center justify-center text-[14px] flex-shrink-0 shadow-sm">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-semibold text-white truncate" title={user?.name || 'Emad Moustafa'}>
                {user?.name || 'Emad Moustafa'}
              </span>
              <span className="text-[11.5px] text-[#a0a8cc] font-medium truncate" title={user?.role || 'Finance Director'}>
                {user?.role || 'Finance Director'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (Visible only on lg and above) */}
      <aside className="hidden lg:flex w-[260px] bg-[#242e69] text-white flex-col justify-between flex-shrink-0 h-screen sticky top-0 select-none z-30">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile / Tablet Off-Canvas Drawer (Visible when isMobileOpen is true on < lg) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileOpen
            ? 'opacity-100 pointer-events-auto visible'
            : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        {/* Backdrop Overlay */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
          onClick={closeSidebar}
        />

        {/* Slide-in Drawer Container */}
        <aside
          className={`fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[#242e69] text-white flex flex-col justify-between select-none shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderNavContent(true)}
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
