import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';

interface MaintenanceScreenProps {
  moduleName?: string;
  message?: string;
  estimatedTime?: string;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  moduleName = 'Modul Sistem',
  message,
  estimatedTime
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6 animate-fade-in font-sans">
            
            {/* Status Badge */}
            <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800">
              Mode Pemeliharaan Aktif
            </div>

            {/* Main Title */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {moduleName} Sedang Ditutup Sementara
              </h2>
              <p className="text-xs text-slate-500 font-normal leading-relaxed max-w-md mx-auto">
                Halaman ini sedang mengalami proses pemeliharaan atau peningkatan infrastruktur oleh Tim IT.
              </p>
            </div>

            {/* Message & Schedule Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
              {estimatedTime && (
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-500">Estimasi / Jadwal:</span>{' '}
                  <span className="font-semibold text-slate-900">{estimatedTime}</span>
                </div>
              )}

              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-500">Keterangan:</span>{' '}
                <span>
                  {message || 'Proses pembaruan sistem berkala sedang berlangsung untuk menjaga kestabilan data.'}
                </span>
              </div>
            </div>

            {/* IT Contact Notice */}
            <p className="text-[11px] text-slate-400 font-normal">
              Akses formulir dan pengolahan data pada modul ini dinonaktifkan sementara untuk mencegah korupsi data. Silakan hubungi Administrator IT (Ali / Dimas) jika memerlukan bantuan operasional mendesak.
            </p>

            {/* Navigation Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-sm"
              >
                Kembali ke Dashboard Utama
              </button>
              <button
                onClick={() => navigate('/invoices')}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                Buka Modul Faktur
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default MaintenanceScreen;
