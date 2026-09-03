import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

import ManageTeamTab from './components/ManageTeamTab';
import BranchOfficeTab from './components/BranchOfficeTab';
import NotificationsTab from './components/NotificationsTab';
import EditProfileTab from './components/EditProfileTab';
import SecurityTab from './components/SecurityTab';
import ExchangeRateTab from './components/ExchangeRateTab';
import ServicesTab from './components/ServicesTab';
import CompanyInfoTab from './components/CompanyInfoTab';
import HBManagementTab from './components/HBManagementTab';

import SystemBackupTab from './components/SystemBackupTab';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdminOrDirector = ['Super Admin', 'Chief Accountant', 'Division Director'].includes(user?.role || '');

  // Perizinan Khusus IT (Ali & Dimas) atau Super Admin (Mr. Emad Moustafa)
  const userNameLower = (user?.name || '').toLowerCase();
  const userEmailLower = (user?.email || '').toLowerCase();
  const isIT = userNameLower.includes('ali') || 
               userNameLower.includes('dimas') || 
               userEmailLower.includes('ali') || 
               userEmailLower.includes('dimas');

  const isAuthorizedBackup = isSuperAdmin || isIT;

  const [activeTab, setActiveTab] = useState(
    isSuperAdmin || isAuthorizedBackup ? 'System Backup' :
    isAdminOrDirector ? 'Branch / Office' : 'Edit Profile'
  );

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Content Dashboard */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        {/* Content Body */}
        <div className="flex-1 p-8 space-y-6 w-full">
          
          {/* Header Title */}
          <div className="flex flex-col space-y-1">
            <h1 className="text-[28px] font-bold text-[#0c0d0f] tracking-tight font-sans">
              {t('settings.title')}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium font-sans">
              {t('settings.subtitle')}
            </p>
          </div>

          {/* Navigation Tabs bar */}
          <div className="border-b border-[#e2e8f0] flex items-center w-full pt-1 flex-shrink-0 text-[13px] overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              ...(isAuthorizedBackup ? [{ id: 'System Backup', label: t('settings.dataBackup') }] : []),
              ...(isSuperAdmin ? [{ id: 'Manage Team', label: t('settings.team') }] : []),
              ...(isAdminOrDirector ? [{ id: 'Branch / Office', label: t('settings.branches') }] : []),
              { id: 'Notifications', label: t('settings.notifications') },
              { id: 'Edit Profile', label: t('settings.profile') },
              { id: 'Security', label: t('settings.security') },
              ...(isAdminOrDirector ? [
                { id: 'Exchange Rate', label: t('settings.exchangeRates') },
                { id: 'Services', label: t('settings.services') },
                { id: 'Company Info', label: t('settings.companyInfo') },
                { id: 'HB Management', label: t('settings.hbManagement') }
              ] : []),
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 pb-3 pt-1 text-center font-bold transition-all relative cursor-pointer whitespace-nowrap flex-shrink-0 border-none bg-transparent ${
                    active ? 'text-[#f59e0b]' : 'text-[#64748b] hover:text-[#0c0d0f]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#f59e0b] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Render Tab Contents */}
          <div className="pt-2">
            {activeTab === 'System Backup' && <SystemBackupTab />}
            {activeTab === 'Manage Team' && <ManageTeamTab />}
            {activeTab === 'Branch / Office' && <BranchOfficeTab />}
            {activeTab === 'Notifications' && <NotificationsTab />}
            {activeTab === 'Edit Profile' && <EditProfileTab />}
            {activeTab === 'Security' && <SecurityTab />}
            {activeTab === 'Exchange Rate' && <ExchangeRateTab />}
            {activeTab === 'Services' && <ServicesTab />}
            {activeTab === 'Company Info' && <CompanyInfoTab />}
            {activeTab === 'HB Management' && <HBManagementTab />}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Settings;
