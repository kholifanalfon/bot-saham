import React, { useState } from 'react';
import { useStockStore } from '../store/useStockStore';

export const PriorityStocks: React.FC = () => {
  const { priorityGroups, addPriorityGroup, removePriorityGroup, addSymbolToGroup, removeSymbolFromGroup } = useStockStore();
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(priorityGroups[0]?.id || '');
  const [newSymbol, setNewSymbol] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;

    const newGroup = {
      id: Math.random().toString(),
      name: newGroupName,
      symbols: []
    };

    addPriorityGroup(newGroup);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
  };

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || !activeGroupId) return;

    addSymbolToGroup(activeGroupId, newSymbol.toUpperCase());
    setNewSymbol('');
  };

  const activeGroup = priorityGroups.find((g) => g.id === activeGroupId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
      {/* Group Creator & Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Create group form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Watchlist Groups</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Create groups to organize your target symbols.</p>

          <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="e.g. LQ45 Picks, Tech Leaders"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px' }}>
              Create New Group
            </button>
          </form>
        </div>

        {/* Switcher list */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px' }}>Priority Watchlists</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {priorityGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: activeGroupId === g.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: activeGroupId === g.id ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeGroupId === g.id ? 600 : 500,
                  color: activeGroupId === g.id ? '#3b82f6' : '#cbd5e1'
                }}
              >
                <span>{g.name}</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{g.symbols.length} stocks</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Symbol List inside Active Group */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeGroup ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activeGroup.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>List of candidates watchlisted under this priority sector.</p>
              </div>
              <button
                onClick={() => removePriorityGroup(activeGroup.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444'
                }}
              >
                Delete Group
              </button>
            </div>

            {/* Add symbol form */}
            <form onSubmit={handleAddSymbol} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter stock ticker (e.g. BBCA.JK)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
                Add Symbol
              </button>
            </form>

            {/* Symbols grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {activeGroup.symbols.length > 0 ? (
                activeGroup.symbols.map((sym) => (
                  <div
                    key={sym}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sym}</span>
                    <button
                      onClick={() => removeSymbolFromGroup(activeGroup.id, sym)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No stock candidates have been added to this priority watchlist group yet.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Please select or create a priority watchlist group.
          </div>
        )}
      </div>
    </div>
  );
};
export default PriorityStocks;
