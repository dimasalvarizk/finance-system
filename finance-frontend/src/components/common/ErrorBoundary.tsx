import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}


interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    // Clear cache & hard reload
    window.location.reload();
  };

  private handleClearAndHome = () => {
    localStorage.removeItem('finance_token');
    sessionStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#f4f6fa] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-blue-50 text-[#1d2857] rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold border border-blue-100">
              ODST
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">
                Aplikasi Sedang Diperbarui
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Terdapat pembaruan sistem atau kendala memuat modul aplikasi. Silakan muat ulang halaman untuk mendapatkan versi terbaru.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono text-slate-600 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-[#1d2857] hover:bg-[#151d3f] text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Muat Ulang Halaman (Reload)
              </button>
              
              <button
                onClick={this.handleClearAndHome}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
