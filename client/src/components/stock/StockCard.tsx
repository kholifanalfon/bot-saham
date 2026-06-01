import React from 'react';
import { MiniChart } from '../charts/MiniChart';

interface StockCardProps {
  symbol: string;
  price: number;
  change: number;
  score: number;
  history: number[];
  onClick?: () => void;
}

export const StockCard: React.FC<StockCardProps> = ({ symbol, price, change, score, history, onClick }) => {
  const isProfit = change >= 0;

  return (
    <div 
      className="glass-panel" 
      onClick={onClick}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{symbol}</h4>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Real-time Quote</span>
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '100px',
          backgroundColor: score >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: score >= 70 ? '#10b981' : '#f59e0b',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          Score: {score}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{price.toLocaleString()}</div>
          <div style={{ fontSize: '0.82rem', color: isProfit ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {isProfit ? '↑' : '↓'} {change.toFixed(2)}%
          </div>
        </div>
        <MiniChart data={history} color={isProfit ? '#10b981' : '#ef4444'} />
      </div>
    </div>
  );
};
