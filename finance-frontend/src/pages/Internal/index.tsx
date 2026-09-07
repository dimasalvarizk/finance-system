import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Wallet, FilePlus, CheckSquare, Sparkles, Clock } from 'lucide-react';

interface ModuleConfig {
  title: string;
  subtitle: string;
  category: string;
  icon: React.ElementType;
  description: string;
}

const moduleConfigMap: Record<string, ModuleConfig> = {
  '/my-expenses': {
    title: 'My Expenses',
    subtitle: 'Track and manage your submitted reimbursement and expense reports',
    category: 'INTERNAL EXPENSES',
    icon: Wallet,
    description: 'Modul pengelolaan riwayat pengeluaran dan klaim internal sedang dalam tahap pengembangan aktif.'
  },
  '/internal/expenses': {
    title: 'My Expenses',
    subtitle: 'Track and manage your submitted reimbursement and expense reports',
    category: 'INTERNAL EXPENSES',
    icon: Wallet,
    description: 'Modul pengelolaan riwayat pengeluaran dan klaim internal sedang dalam tahap pengembangan aktif.'
  },
  '/internal/my-expenses': {
    title: 'My Expenses',
    subtitle: 'Track and manage your submitted reimbursement and expense reports',
    category: 'INTERNAL EXPENSES',
    icon: Wallet,
    description: 'Modul pengelolaan riwayat pengeluaran dan klaim internal sedang dalam tahap pengembangan aktif.'
  },
  '/submit-expense': {
    title: 'Submit Expense',
    subtitle: 'Create a new internal operational expense claim with receipts',
    category: 'INTERNAL EXPENSES',
    icon: FilePlus,
    description: 'Modul formulir pengajuan bukti bayar dan klaim pengeluaran baru sedang dalam tahap pengembangan aktif.'
  },
  '/internal/submit-expense': {
    title: 'Submit Expense',
    subtitle: 'Create a new internal operational expense claim with receipts',
    category: 'INTERNAL EXPENSES',
    icon: FilePlus,
    description: 'Modul formulir pengajuan bukti bayar dan klaim pengeluaran baru sedang dalam tahap pengembangan aktif.'
  },
  '/approvals': {
    title: 'Approvals',
    subtitle: 'Review, approve, or reject pending internal team expense requests',
    category: 'INTERNAL EXPENSES',
    icon: CheckSquare,
    description: 'Modul persetujuan berjenjang untuk pengeluaran tim internal sedang dalam tahap pengembangan aktif.'
  },
  '/internal/approvals': {
    title: 'Approvals',
    subtitle: 'Review, approve, or reject pending internal team expense requests',
    category: 'INTERNAL EXPENSES',
    icon: CheckSquare,
    description: 'Modul persetujuan berjenjang untuk pengeluaran tim internal sedang dalam tahap pengembangan aktif.'
  }
};

const InternalPlaceholderPage: React.FC = () => {
  const location = useLocation();

  const config = moduleConfigMap[location.pathname] || {
    title: 'Internal Module',
    subtitle: 'Internal workflow and management module',
    category: 'INTERNAL',
    icon: Sparkles,
    description: 'Modul ini sedang dalam tahap pengembangan.'
  };

  const Icon = config.icon;

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="flex-1 p-8 space-y-8 max-w-[1400px] w-full mx-auto">
          {/* Header Banner */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  {config.category}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">/</span>
                <span className="text-[11px] font-semibold text-slate-500">Coming Soon</span>
              </div>
              <h1 className="text-[28px] font-bold text-[#0c0d0f] tracking-tight">
                {config.title}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Placeholder Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-5 my-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Icon className="w-8 h-8" />
            </div>

            <div className="max-w-md space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11.5px] font-bold border border-blue-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Modul Sedang Dikembangkan</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Fitur {config.title} Segera Hadir
              </h2>
              <p className="text-[13px] text-slate-500 leading-relaxed font-normal">
                {config.description} Halaman ini disiapkan sebagai navigasi menu internal untuk rilis mendatang.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 w-full max-w-sm flex items-center justify-center space-x-2 text-[12px] text-slate-400 font-medium">
              <span>Manazil AL.Mukhtara & ODST Group Finance</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InternalPlaceholderPage;
