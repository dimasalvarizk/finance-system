import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';

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
              Settings
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium font-sans">
              Configure system roles, notifications, and profile details
            </p>
          </div>

          {/* Navigation Tabs bar */}
          <div className="border-b border-[#e2e8f0] flex flex-wrap gap-x-8 gap-y-2 pt-2 flex-shrink-0 text-[14px]">
            {[
              ...(isAuthorizedBackup ? [{ id: 'System Backup', label: 'System Backup' }] : []),
              ...(isSuperAdmin ? [{ id: 'Manage Team', label: 'Manage Team' }] : []),
              ...(isAdminOrDirector ? [{ id: 'Branch / Office', label: 'Branch / Office' }] : []),
              { id: 'Notifications', label: 'Notifications' },
              { id: 'Edit Profile', label: 'Edit Profile' },
              { id: 'Security', label: 'Security' },
              ...(isAdminOrDirector ? [
                { id: 'Exchange Rate', label: 'Exchange Rate' },
                { id: 'Services', label: 'Services' },
                { id: 'Company Info', label: 'Company Info' },
                { id: 'HB Management', label: 'HB Management' }
              ] : []),
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 font-medium transition-all relative cursor-pointer ${
                    active ? 'text-[#f59e0b]' : 'text-[#64748b] hover:text-[#0c0d0f]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b] rounded-full" />
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
