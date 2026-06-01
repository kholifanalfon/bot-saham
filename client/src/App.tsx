import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthGuard } from './components/auth/AuthGuard';
import { AdminGuard } from './components/auth/AdminGuard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Screener } from './pages/Screener';
import { StockDetailPage } from './pages/StockDetailPage';
import { AIAnalysis } from './pages/AIAnalysis';
import { Portfolio } from './pages/Portfolio';
import { PriorityStocks } from './pages/PriorityStocks';
import { Notifications } from './pages/Notifications';
import { ApiGuide } from './pages/ApiGuide';
import { UserManagement } from './pages/UserManagement';
import { AlgorithmExplanation } from './pages/AlgorithmExplanation';
import { Settings } from './pages/Settings';
import { DataFetchReport } from './pages/DataFetchReport';

import './styles/globals.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/ai" element={<AIAnalysis />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/priority-stocks" element={<PriorityStocks />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/guide" element={<ApiGuide />} />
            <Route path="/algorithm" element={<AlgorithmExplanation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/data-report" element={<DataFetchReport />} />

            {/* Admin-Only Routes */}
            <Route element={<AdminGuard />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>

        {/* Redirect unknown routes to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
