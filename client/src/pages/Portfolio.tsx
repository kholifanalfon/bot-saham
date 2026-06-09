import React, { useState, useEffect } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';

const API_URL = 'http://localhost:3001';

interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface UserTransaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
}

export const Portfolio: React.FC = () => {
  const { t } = useLanguageStore();
  const [showModal, setShowModal] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalPnl: 0,
    winRate: 0
  });

  const loadPortfolioData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch holdings and overall summary
      const summaryRes = await fetch('http://localhost:3001/api/portfolio', {
        credentials: 'include'
      });
      if (!summaryRes.ok) throw new Error('Failed to load portfolio holdings summary.');
      const summaryData = await summaryRes.json();

      // 2. Fetch history
      const historyRes = await fetch('http://localhost:3001/api/portfolio/history', {
        credentials: 'include'
      });
      if (!historyRes.ok) throw new Error('Failed to load transaction history.');
      const historyData = await historyRes.json();

      setHoldings(summaryData.holdings || []);
      setSummary({
        totalValue: summaryData.totalValue || 0,
        totalPnl: summaryData.totalPnl || 0,
        winRate: summaryData.winRate || 0
      });
      setTransactions(historyData || []);
    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err.message || 'Gagal terhubung ke database portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();
  }, []);

  // Silently call AI tag suggestion + save journal in background — no user interaction needed
  const autoTagAndSave = (ctx: {
    symbol: string;
    sellDate: string;
    sellPrice: number;
    shares: number;
  }) => {
    // Fire-and-forget: runs completely in background
    (async () => {
      try {
        const tagRes = await fetch(`${API_URL}/api/portfolio/journals/suggest-tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            symbol: ctx.symbol,
            buyDate: ctx.sellDate,
            sellDate: ctx.sellDate,
            buyPrice: 0,
            sellPrice: ctx.sellPrice,
            shares: ctx.shares,
            pnlPercent: 0,
            holdingDays: 0,
          }),
        });
        const aiTags: string[] = tagRes.ok ? (await tagRes.json()).tags ?? [] : [];

        await fetch(`${API_URL}/api/portfolio/journals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            symbol: ctx.symbol,
            sellDate: ctx.sellDate,
            buyDate: ctx.sellDate,
            sellPrice: ctx.sellPrice,
            buyPrice: 0,
            shares: ctx.shares,
            pnlPercent: 0,
            notes: null,
            tags: [],
            aiTags,
          }),
        });
        console.log(`[Journal] Auto-saved journal for ${ctx.symbol} with AI tags:`, aiTags);
      } catch (e) {
        console.warn('[Journal] Background auto-tag failed (non-blocking):', e);
      }
    })();
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !price) return;
    const isSell = type === 'sell';
    const sellDate = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(`${API_URL}/api/portfolio/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          type,
          shares: parseInt(shares),
          price: parseFloat(price),
          date: sellDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record transaction');
      }

      setSymbol('');
      setShares('');
      setPrice('');
      setShowModal(false);
      await loadPortfolioData();

      // After a SELL — auto tag in background, no confirmation needed
      if (isSell) {
        autoTagAndSave({
          symbol: symbol.toUpperCase(),
          sellDate,
          sellPrice: parseFloat(price),
          shares: parseInt(shares),
        });
      }
    } catch (err: any) {
      console.error('Transaction error:', err);
      alert(`Error recording transaction: ${err.message}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Hapus transaksi akan mengkalkulasi ulang portofolio secara otomatis.')) return;
    try {
      const response = await fetch(`http://localhost:3001/api/portfolio/transaction/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      await loadPortfolioData();
    } catch (err: any) {
      alert(`Gagal menghapus transaksi: ${err.message}`);
    }
  };

  const handleQuickSell = async (sym: string, sh: number, currentPrice: number) => {
    if (!confirm(`Apakah Anda yakin ingin menjual seluruh (${sh}) saham ${sym} di harga ${currentPrice}?`)) return;
    const sellDate = new Date().toISOString().split('T')[0];
    try {
      const response = await fetch(`${API_URL}/api/portfolio/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ symbol: sym, type: 'sell', shares: sh, price: currentPrice, date: sellDate })
      });
      if (!response.ok) throw new Error('Failed to record sell transaction');
      await loadPortfolioData();
      // Auto-tag in background
      autoTagAndSave({ symbol: sym, sellDate, sellPrice: currentPrice, shares: sh });
    } catch (err: any) {
      alert(`Error saat menjual saham: ${err.message}`);
    }
  };

  const isProfit = summary.totalPnl >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>Portfolio Tracker</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Record buy/sell transactions to track active average costs and profits.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Record Transaction
        </button>
      </div>

      {loading && holdings.length === 0 && transactions.length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94a3b8' }}>
          <span className="live-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block', marginRight: '8px' }}></span>
          Memuat Portofolio Ril...
        </div>
      ) : error ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px dashed rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#fca5a5'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px', color: '#f87171' }}>Gagal Memuat Data Portofolio</h3>
          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '500px', margin: '0 auto 16px' }}>
            Terjadi kegagalan koneksi: <strong>{error}</strong>. Pastikan server backend Anda aktif.
          </p>
          <button
            onClick={() => loadPortfolioData()}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Total Value</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                IDR {summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Unrealized P&L</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: isProfit ? '#10b981' : '#ef4444' }}>
                IDR {isProfit ? '+' : ''}{summary.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Win Rate</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: summary.winRate >= 50 ? '#10b981' : '#f59e0b' }}>
                {summary.winRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Holdings grid panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Active Holdings</h3>
            {holdings.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                📭 Tidak ada kepemilikan saham aktif. Silakan tambahkan transaksi pembelian baru.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px' }}>STOCK</th>
                      <th style={{ padding: '12px 16px' }}>SHARES</th>
                      <th style={{ padding: '12px 16px' }}>AVG PRICE</th>
                      <th style={{ padding: '12px 16px' }}>CURRENT PRICE</th>
                      <th style={{ padding: '12px 16px' }}>TOTAL VALUE</th>
                      <th style={{ padding: '12px 16px' }}>P&L</th>
                      <th style={{ padding: '12px 16px' }}>P&L %</th>
                      <th style={{ padding: '12px 16px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => {
                      const hProfit = h.pnl >= 0;
                      return (
                        <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '16px', fontWeight: 600 }}>{h.symbol}</td>
                          <td style={{ padding: '16px' }}>{h.shares}</td>
                          <td style={{ padding: '16px' }}>{h.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ padding: '16px' }}>{h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ padding: '16px' }}>{(h.shares * h.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ padding: '16px', color: hProfit ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {hProfit ? '+' : ''}{h.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '16px', color: hProfit ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {hProfit ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                          </td>
                          <td style={{ padding: '16px' }}>
                            <button
                              onClick={() => handleQuickSell(h.symbol, h.shares, h.currentPrice)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Sell All
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transaction History log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Transaction History</h3>
            {transactions.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                📭 Belum ada riwayat transaksi yang tercatat.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, marginRight: '10px' }}>{tx.symbol}</span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        backgroundColor: tx.type === 'buy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: tx.type === 'buy' ? '#10b981' : '#ef4444',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>{tx.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                        {tx.shares} shares @ IDR {tx.price.toLocaleString()} on {tx.date}
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transaction Drawer Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Record Buy / Sell</h3>
            
            <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Stock Symbol</label>
                <input type="text" placeholder="e.g. BBRI.JK" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Transaction Type</label>
                <select value={type} onChange={(e: any) => setType(e.target.value)} style={{ padding: '10px' }}>
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Shares Count</label>
                <input type="number" placeholder="1000" value={shares} onChange={(e) => setShares(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Transaction Price</label>
                <input type="number" placeholder="5200" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.08)'
                }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
