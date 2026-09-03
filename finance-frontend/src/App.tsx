import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MaintenanceProvider>
        <Router>
          <AppRoutes />
        </Router>
      </MaintenanceProvider>
    </AuthProvider>
  );
};

export default App;
