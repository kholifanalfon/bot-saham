import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useStockStore } from '../../store/useStockStore';
import { useLanguageStore } from '../../store/useLanguageStore';

export const Header: React.FC = () => {
  const { unreadCount } = useNotificationStore();
  const { watchlist } = useStockStore();
  const { language, setLanguage } = useLanguageStore();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundColor: '#0f132e',
      position: 'relative',
      zIndex: 10
    }}>
      {/* Main Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        height: '64px'
      }}>
        {/* Title or Quick Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '0.85rem',
            padding: '4px 10px',
            borderRadius: '100px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            fontWeight: 600,
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block'
            }} className="live-pulse"></span>
            IDX ACTIVE
          </div>
        </div>

        {/* Action center (Language, Clock, Notifications) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Language Switcher */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '2px 4px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <button
              onClick={() => setLanguage('id')}
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'id' ? '#3b82f6' : 'transparent',
                color: language === 'id' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              🇮🇩 ID
            </button>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: language === 'en' ? '#3b82f6' : 'transparent',
                color: language === 'en' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              🇬🇧 EN
            </button>
          </div>

          {/* Real-time Clock */}
          <div style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            fontWeight: 500,
            letterSpacing: '0.5px'
          }}>
            {time}
          </div>

          {/* Alert Notification Badge */}
          <div style={{
            position: 'relative',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🔔</span>
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

