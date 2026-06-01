import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguageStore } from '../../store/useLanguageStore';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 18px',
    margin: '4px 12px',
    borderRadius: '8px',
    color: isActive ? '#ffffff' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
    fontSize: '0.92rem',
    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
    transition: 'all 0.2s ease',
    textDecoration: 'none'
  });

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#0f132e',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      {/* Brand Logo & Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: 'white',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
        }}>B</div>
        <span style={{
          fontWeight: 700,
          fontSize: '1.2rem',
          letterSpacing: '0.5px',
          background: 'linear-gradient(to right, #ffffff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>BOT SAHAM</span>
      </div>

      {/* Navigation list */}
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <NavLink to="/" style={navItemStyle}>{t('dashboard')}</NavLink>
        <NavLink to="/screener" style={navItemStyle}>{t('screener')}</NavLink>
        <NavLink to="/portfolio" style={navItemStyle}>{t('portfolio')}</NavLink>
        <NavLink to="/priority-stocks" style={navItemStyle}>{t('priority')}</NavLink>
        <NavLink to="/ai" style={navItemStyle}>{t('gemini_evaluation')}</NavLink>
        <NavLink to="/notifications" style={navItemStyle}>{t('notifications')}</NavLink>
        <NavLink to="/guide" style={navItemStyle}>{t('guide')}</NavLink>
        <NavLink to="/algorithm" style={navItemStyle}>{t('algorithm')}</NavLink>
        <NavLink to="/settings" style={navItemStyle}>{t('settings')}</NavLink>
        <NavLink to="/data-report" style={navItemStyle}>{t('data_fetch_report')}</NavLink>

        {user?.role === 'admin' && (
          <>
            <div style={{
              padding: '16px 20px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.8px'
            }}>Admin Console</div>
            <NavLink to="/users" style={navItemStyle}>{t('users')}</NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile & Logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            color: '#3b82f6',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Demo Trader'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'capitalize' }}>
              {user?.role || 'User'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          style={{
            width: '100%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          {t('logout')}
        </button>
      </div>
    </aside>
  );
};
