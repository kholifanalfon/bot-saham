import React from 'react';

export const UserManagement: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>User Account Management</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Admin panel for listing, deactivating, and managing user profiles.</p>
      </div>

      {/* Admin stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Total Accounts</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>2 Registered</span>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Active Sessions</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>1 Active</span>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Role Breakdown</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>1 Admin | 1 Trader</span>
        </div>
      </div>

      {/* Users table list */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Registered Traders</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600 }}>System Admin</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>admin@botsaham.com</span>
            </div>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              padding: '4px 10px',
              borderRadius: '100px'
            }}>Admin</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600 }}>Demo Trader</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>trader@botsaham.com</span>
            </div>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 10px',
              borderRadius: '100px'
            }}>User</span>
          </div>
        </div>
      </div>
    </div>
  );
};
