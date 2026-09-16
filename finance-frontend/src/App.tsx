import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import { SidebarProvider } from './context/SidebarContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MaintenanceProvider>
        <SidebarProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SidebarProvider>
      </MaintenanceProvider>
    </AuthProvider>
  );
};

export default App;
