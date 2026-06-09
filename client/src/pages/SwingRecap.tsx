import React, { useState, useEffect, useCallback } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';

interface ClosedTrade {
  symbol: string;
  buyDate: string;
  sellDate: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  realizedPnl: number;
  pnlPercent: number;
  holdingDays: number;
}

interface SymbolSummary {
  symbol: string;
  trades: number;
  wins: number;
  totalPnl: number;
  totalVolume: number;
}

interface SwingRecapData {
  summary: {
    totalProfit: number;
    totalLoss: number;
    netPnl: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    avgHoldingDays: number;
    totalTrades: number;
  };
  bestTrade: ClosedTrade | null;
  worstTrade: ClosedTrade | null;
  closedTrades: ClosedTrade[];
  bySymbol: SymbolSummary[];
}

const API_URL = 'http://localhost:3001';

const fmt = (n: number, dec = 0) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export const SwingRecap: React.FC = () => {
  const { language } = useLanguageStore();
  const [data, setData] = useState<SwingRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'symbols'>('trades');
  const [filterSymbol, setFilterSymbol] = useState('');

  const fetchRecap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/portfolio/swing-recap`, { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat data swing recap');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecap(); }, [fetchRecap]);

  const filteredTrades = data?.closedTrades.filter(t =>
    !filterSymbol || t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
  ) ?? [];

  /* ─── Loading ─── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #818cf8', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Menghitung rekap swing trading...</p>
    </div>
  );

  /* ─── Error ─── */
  if (error) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
      <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '12px' }}>{error}</p>
      <button onClick={fetchRecap} style={{ padding: '8px 20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600 }}>
        Coba Lagi
      </button>
    </div>
  );

  const s = data!.summary;
  const isProfit = s.netPnl >= 0;

  /* ─── Stat Card helper ─── */
  const StatCard = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent || 'rgba(99,102,241,0.5)' }} />
      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: '0.78rem', color: '#475569' }}>{sub}</span>}
    </div>
  );

  /* ─── Highlight Trade Card ─── */
  const TradeHighlight = ({ trade, label, color }: { trade: ClosedTrade | null; label: string; color: string }) => {
    if (!trade) return null;
    const profit = trade.realizedPnl >= 0;
    return (
      <div style={{
        background: `linear-gradient(135deg, ${color}12, ${color}06)`,
        border: `1px solid ${color}30`,
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9' }}>{trade.symbol}</span>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: profit ? '#34d399' : '#f87171' }}>
            {profit ? '+' : ''}IDR {fmt(trade.realizedPnl)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
          <span>📅 {fmtDate(trade.buyDate)} → {fmtDate(trade.sellDate)}</span>
          <span>📦 {fmt(trade.shares)} lot</span>
          <span>⏱ {trade.holdingDays} hari</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem' }}>
          <span style={{ color: '#475569' }}>Beli: <strong style={{ color: '#94a3b8' }}>IDR {fmt(trade.buyPrice, 0)}</strong></span>
          <span style={{ color: '#475569' }}>Jual: <strong style={{ color: '#94a3b8' }}>IDR {fmt(trade.sellPrice, 0)}</strong></span>
          <span style={{ color: profit ? '#34d399' : '#f87171', fontWeight: 700 }}>{profit ? '+' : ''}{trade.pnlPercent.toFixed(2)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '6px', background: 'linear-gradient(90deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 Swing Trading Recap
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Rekap realized P&amp;L dari semua transaksi swing trading yang telah diselesaikan (buy → sell)
          </p>
        </div>
        <button
          onClick={fetchRecap}
          style={{ padding: '9px 18px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Zero trades state ── */}
      {s.totalTrades === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>Belum ada transaksi yang diselesaikan</h3>
          <p style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '400px', margin: '0 auto' }}>
            Rekap akan muncul setelah Anda merekam pasangan transaksi BUY → SELL di halaman Portfolio.
          </p>
        </div>
      ) : (
        <>
          {/* ── Stats Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
            <StatCard
              label="Net P&L"
              value={`${isProfit ? '+' : ''}IDR ${fmt(s.netPnl)}`}
              sub="Total realized profit/loss"
              accent={isProfit ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'}
            />
            <StatCard
              label="Total Profit"
              value={`IDR ${fmt(s.totalProfit)}`}
              sub={`${s.winCount} trades menang`}
              accent="rgba(52,211,153,0.7)"
            />
            <StatCard
              label="Total Loss"
              value={`-IDR ${fmt(Math.abs(s.totalLoss))}`}
              sub={`${s.lossCount} trades kalah`}
              accent="rgba(248,113,113,0.7)"
            />
            <StatCard
              label="Win Rate"
              value={`${s.winRate.toFixed(1)}%`}
              sub={`${s.winCount}W / ${s.lossCount}L dari ${s.totalTrades} trades`}
              accent={s.winRate >= 55 ? 'rgba(52,211,153,0.7)' : s.winRate >= 40 ? 'rgba(251,191,36,0.7)' : 'rgba(248,113,113,0.7)'}
            />
            <StatCard
              label="Total Trades"
              value={String(s.totalTrades)}
              sub="Pasangan BUY→SELL"
              accent="rgba(99,102,241,0.6)"
            />
            <StatCard
              label="Avg Holding"
              value={`${s.avgHoldingDays.toFixed(1)} hari`}
              sub="Rata-rata durasi per trade"
              accent="rgba(139,92,246,0.6)"
            />
          </div>

          {/* ── Win Rate Progress Bar ── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: '#94a3b8' }}>Win Rate Visualizer</span>
              <span style={{ fontWeight: 700, color: s.winRate >= 55 ? '#34d399' : s.winRate >= 40 ? '#fbbf24' : '#f87171' }}>{s.winRate.toFixed(1)}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, s.winRate)}%`, background: s.winRate >= 55 ? 'linear-gradient(90deg,#10b981,#34d399)' : s.winRate >= 40 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: '#475569' }}>
              <span>0%</span><span style={{ color: '#64748b' }}>Target: 55%</span><span>100%</span>
            </div>
          </div>

          {/* ── Best / Worst highlights ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <TradeHighlight trade={data!.bestTrade} label="🏆 Trade Terbaik" color="#34d399" />
            <TradeHighlight trade={data!.worstTrade} label="💔 Trade Terburuk" color="#f87171" />
          </div>

          {/* ── Tab switch ── */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            {(['trades', 'symbols'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                  background: activeTab === tab ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: activeTab === tab ? '#a5b4fc' : '#64748b',
                  transition: 'all 0.2s'
                }}>
                {tab === 'trades' ? '📋 Riwayat Trade' : '📊 Per Saham'}
              </button>
            ))}
          </div>

          {/* ── TAB: Closed Trades ── */}
          {activeTab === 'trades' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Riwayat Trade Selesai</h3>
                <input
                  placeholder="Filter simbol..."
                  value={filterSymbol}
                  onChange={e => setFilterSymbol(e.target.value)}
                  style={{ marginLeft: 'auto', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f1f5f9', fontSize: '0.82rem', width: '160px', outline: 'none' }}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {['Saham','Beli','Jual','Lot','Harga Beli','Harga Jual','Realized P&L','% P&L','Durasi'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>Tidak ada data yang cocok</td></tr>
                    ) : filteredTrades.map((t, i) => {
                      const win = t.realizedPnl > 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: '#60a5fa' }}>{t.symbol}</td>
                          <td style={{ padding: '13px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(t.buyDate)}</td>
                          <td style={{ padding: '13px 16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(t.sellDate)}</td>
                          <td style={{ padding: '13px 16px', color: '#e2e8f0' }}>{fmt(t.shares)}</td>
                          <td style={{ padding: '13px 16px', color: '#e2e8f0' }}>IDR {fmt(t.buyPrice, 0)}</td>
                          <td style={{ padding: '13px 16px', color: '#e2e8f0' }}>IDR {fmt(t.sellPrice, 0)}</td>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: win ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                            {win ? '+' : ''}IDR {fmt(t.realizedPnl)}
                          </td>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: win ? '#34d399' : '#f87171' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem',
                              background: win ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                              border: `1px solid ${win ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`
                            }}>
                              {win ? '▲' : '▼'} {Math.abs(t.pnlPercent).toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', color: '#64748b' }}>{t.holdingDays}h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: Per Symbol ── */}
          {activeTab === 'symbols' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Performa Per Saham</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {['Saham','Total Trade','Win','Win Rate','Total P&L','Total Volume'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data!.bySymbol.map((s, i) => {
                      const win = s.totalPnl >= 0;
                      const wr = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: '#60a5fa' }}>{s.symbol}</td>
                          <td style={{ padding: '13px 16px', color: '#e2e8f0' }}>{s.trades}</td>
                          <td style={{ padding: '13px 16px', color: '#34d399' }}>{s.wins}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${wr}%`, background: wr >= 55 ? '#34d399' : wr >= 40 ? '#fbbf24' : '#f87171', borderRadius: '99px' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: wr >= 55 ? '#34d399' : wr >= 40 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{wr.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: win ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                            {win ? '+' : ''}IDR {fmt(s.totalPnl)}
                          </td>
                          <td style={{ padding: '13px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>IDR {fmt(s.totalVolume)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SwingRecap;
