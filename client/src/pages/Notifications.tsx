import React, { useState } from 'react';

interface NotificationRule {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'btst_score_above';
  targetValue: number;
  isActive: boolean;
}

interface AlertLog {
  id: string;
  symbol: string;
  type: string;
  message: string;
  price: number;
  triggeredAt: string;
}

export const Notifications: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'price_above' | 'price_below' | 'btst_score_above'>('price_above');
  const [targetValue, setTargetValue] = useState('');

  const [rules, setRules] = useState<NotificationRule[]>([
    { id: '1', symbol: 'BBRI.JK', type: 'price_above', targetValue: 5500, isActive: true },
    { id: '2', symbol: 'BBCA.JK', type: 'price_below', targetValue: 9700, isActive: true }
  ]);

  const [logs, setLogs] = useState<AlertLog[]>([
    {
      id: '101',
      symbol: 'BBRI.JK',
      type: 'price_above',
      message: 'BBRI.JK crossed ABOVE target of 5400. Current: 5450',
      price: 5450,
      triggeredAt: new Date().toLocaleString()
    }
  ]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetValue) return;

    const newRule: NotificationRule = {
      id: Math.random().toString(),
      symbol: symbol.toUpperCase(),
      type,
      targetValue: parseFloat(targetValue),
      isActive: true
    };

    setRules([...rules, newRule]);
    setSymbol('');
    setTargetValue('');
  };

  const handleToggleRule = (id: string) => {
    setRules(rules.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Rules configuration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Create rule form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Configure Alert Rule</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Add custom trigger thresholds for price breakouts and scoring signals.</p>

          <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ticker Symbol</label>
              <input type="text" placeholder="e.g. BBRI.JK" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Alert Type</label>
              <select value={type} onChange={(e: any) => setType(e.target.value)} style={{ padding: '10px' }}>
                <option value="price_above">Price crosses ABOVE target</option>
                <option value="price_below">Price crosses BELOW target</option>
                <option value="btst_score_above">BTST breakout score ABOVE target</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Value</label>
              <input type="number" placeholder="5500" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              Create Alert Rule
            </button>
          </form>
        </div>

        {/* Rules List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Active Alert Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rules.map((rule) => (
              <div key={rule.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)'
              }}>
                <div>
                  <span style={{ fontWeight: 600, marginRight: '10px' }}>{rule.symbol}</span>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {rule.type.replace('_', ' ')}: {rule.targetValue}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: rule.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: rule.isActive ? '#10b981' : '#64748b',
                      fontWeight: 600
                    }}
                  >
                    {rule.isActive ? 'ACTIVE' : 'MUTED'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert logs list */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Triggered Alerts History Log</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map((log) => (
            <div key={log.id} style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.03)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>🔔 {log.symbol} TRIGGERED</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.triggeredAt}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.4 }}>{log.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Notifications;
