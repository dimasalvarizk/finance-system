import React from 'react';
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
} from 'lucide-react';
import odstDashboardLogo from '../../assets/odstdahboard.png';
import { useAuth } from '../../context/AuthContext';
import { useMaintenance } from '../../context/MaintenanceContext';

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

  const isDimasOrAli = Boolean(
    user && (
      user.name?.toLowerCase().includes('dimas') ||
      user.name?.toLowerCase().includes('ali') ||
      user.email?.toLowerCase().includes('dimas') ||
      user.email?.toLowerCase().includes('ali')
    )
  );

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
        },
        {
          id: 'submit-expense',
          label: t('nav.submitExpense') || 'Submit Expense',
          path: '/submit-expense',
          aliasPaths: ['/internal/submit-expense'],
          icon: FilePlus,
          visible: true,
        },
        {
          id: 'approvals',
          label: t('nav.approvals') || 'Approvals',
          path: '/approvals',
          aliasPaths: ['/internal/approvals'],
          icon: CheckSquare,
          visible: true,
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

  return (
    <aside className="w-[260px] bg-[#242e69] text-white flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 select-none">
      {/* Top Logo Section */}
      <div className="flex-shrink-0">
        <div className="px-6 pt-7 pb-5 flex items-center justify-start">
          <img
            src={odstDashboardLogo}
            alt="DST Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="mx-6 border-b border-[#303c7c]" />
      </div>

      {/* Middle Navigation Section (Scrollable on small viewports) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-sidebar-scroll font-inter">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => item.visible !== false);
          if (visibleItems.length === 0 && !section.showIfEmpty) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold tracking-wider text-[#7e8dbd] uppercase">
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
                    className={`group relative flex items-center px-3 py-2.5 rounded-xl text-[13.5px] transition-all ${
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
    </aside>
  );
};

export default Sidebar;
