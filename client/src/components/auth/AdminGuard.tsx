import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export const AdminGuard: React.FC = () => {
  const { user } = useAuthStore();

  if (!user || user.role !== 'admin') {
    // Redirect to main Dashboard if user is not authorized as admin
    alert('Access Denied: Administrator role is required');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
