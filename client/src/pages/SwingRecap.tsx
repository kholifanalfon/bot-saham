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

interface TradeJournal {
  id: string;
  symbol: string;
  sellDate: string;
  buyDate: string;
  notes: string | null;
  tags: string[];
  aiTags: string[];
  pnlPercent: number;
}

interface TagAnalytics {
  tag: string;
  totalTrades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

const API_URL = 'http://localhost:3001';

const fmt = (n: number, dec = 0) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const TAG_COLORS: Record<string, string> = {
  BB_Squeeze: '#8b5cf6', Bounce_EMA20: '#06b6d4', Bounce_EMA50: '#0ea5e9',
  Bounce_EMA200: '#3b82f6', Breakout_Resistance: '#f59e0b', Breakout_Consolidation: '#d97706',
  MACD_Cross_Bullish: '#10b981', RSI_Oversold_Bounce: '#34d399', RSI_Divergence: '#6ee7b7',
  Gap_Up_Play: '#fbbf24', Gap_Down_Fade: '#f87171', Volume_Surge: '#a78bfa',
  News_Catalyst: '#f472b6', Earnings_Play: '#fb923c', Sector_Rotation: '#38bdf8',
  Trend_Following: '#4ade80', Counter_Trend: '#f43f5e', Support_Bounce: '#34d399',
  Resistance_Rejection: '#ef4444', Golden_Cross: '#fcd34d', Death_Cross: '#f87171',
  Cup_Handle: '#c084fc', Double_Bottom: '#86efac', Double_Top: '#fca5a5',
  Head_Shoulders: '#fdba74', Quick_Scalp: '#67e8f9', Swing_Success: '#4ade80',
  Averaging_Down: '#fbbf24', Stop_Loss_Hit: '#f87171', Partial_Profit: '#a3e635',
  Full_Position_Exit: '#38bdf8', FOMO_Entry: '#f97316', Discipline_Exit: '#34d399',
  Patience_Win: '#a78bfa', Big_Winner: '#10b981', Moderate_Win: '#34d399',
  Small_Win: '#6ee7b7', Big_Loss: '#dc2626', Moderate_Loss: '#f87171',
  Small_Loss: '#fca5a5', Quick_Trade: '#67e8f9', Short_Swing: '#38bdf8',
  Medium_Swing: '#6366f1', Long_Hold: '#8b5cf6',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] || '#6366f1';
}

const TagChip = ({
  tag, selected, onClick, removable, onRemove
}: { tag: string; selected?: boolean; onClick?: () => void; removable?: boolean; onRemove?: () => void }) => (
  <span
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
      background: selected ? `${tagColor(tag)}25` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${selected ? tagColor(tag) : 'rgba(255,255,255,0.1)'}`,
      color: selected ? tagColor(tag) : '#94a3b8',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      userSelect: 'none',
    }}
  >
    {tag.replace(/_/g, ' ')}
    {removable && onRemove && (
      <span onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ marginLeft: '2px', opacity: 0.7, fontSize: '0.8rem', cursor: 'pointer' }}>✕</span>
    )}
  </span>
);

export const SwingRecap: React.FC = () => {
  const { language } = useLanguageStore();
  const [data, setData] = useState<SwingRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'symbols' | 'tags'>('trades');
  const [filterSymbol, setFilterSymbol] = useState('');

  // Journal state
  const [journals, setJournals] = useState<Record<string, TradeJournal>>({});
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [editingTrade, setEditingTrade] = useState<ClosedTrade | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [modalAiTags, setModalAiTags] = useState<string[]>([]);
  const [modalCustomTag, setModalCustomTag] = useState('');
  const [modalPreview, setModalPreview] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);

  const journalKey = (t: ClosedTrade) => `${t.symbol}_${t.sellDate}_${t.buyDate}`;

  const fetchRecap = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [recapRes, journalsRes, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/api/portfolio/swing-recap`, { credentials: 'include' }),
        fetch(`${API_URL}/api/portfolio/journals`, { credentials: 'include' }),
        fetch(`${API_URL}/api/portfolio/journals/tag-analytics`, { credentials: 'include' }),
      ]);
      if (!recapRes.ok) throw new Error('Gagal memuat data swing recap');
      const recapJson = await recapRes.json();
      setData(recapJson);

      if (journalsRes.ok) {
        const journalList: TradeJournal[] = await journalsRes.json();
        const map: Record<string, TradeJournal> = {};
        for (const j of journalList) {
          map[`${j.symbol}_${j.sellDate}_${j.buyDate}`] = j;
        }
        setJournals(map);
      }
      if (analyticsRes.ok) {
        setTagAnalytics(await analyticsRes.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecap(); }, [fetchRecap]);

  // All unique tags across journals
  const allTags = [...new Set(
    Object.values(journals).flatMap(j => [...j.tags, ...j.aiTags])
  )].sort();

  const filteredTrades = (data?.closedTrades ?? []).filter(t => {
    const symMatch = !filterSymbol || t.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
    if (!symMatch) return false;
    if (activeTags.length === 0) return true;
    const j = journals[journalKey(t)];
    if (!j) return false;
    const tradeTags = [...j.tags, ...j.aiTags];
    return activeTags.some(at => tradeTags.includes(at));
  });

  // Open journal modal for a trade
  const openJournal = (trade: ClosedTrade) => {
    const j = journals[journalKey(trade)];
    setEditingTrade(trade);
    setModalNotes(j?.notes ?? '');
    setModalTags(j?.tags ?? []);
    setModalAiTags(j?.aiTags ?? []);
    setModalPreview(false);
    setModalCustomTag('');
  };

  // AI suggest tags for current modal trade
  const handleSuggestTags = async () => {
    if (!editingTrade) return;
    setSuggestingTags(true);
    try {
      const res = await fetch(`${API_URL}/api/portfolio/journals/suggest-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: editingTrade.symbol,
          buyDate: editingTrade.buyDate,
          sellDate: editingTrade.sellDate,
          buyPrice: editingTrade.buyPrice,
          sellPrice: editingTrade.sellPrice,
          shares: editingTrade.shares,
          pnlPercent: editingTrade.pnlPercent,
          holdingDays: editingTrade.holdingDays,
          notes: modalNotes,
        }),
      });
      if (res.ok) {
        const { tags } = await res.json();
        setModalAiTags(tags);
      }
    } catch (e) { console.error(e); }
    finally { setSuggestingTags(false); }
  };

  // Save journal
  const handleSaveJournal = async () => {
    if (!editingTrade) return;
    setModalSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/portfolio/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: editingTrade.symbol,
          sellDate: editingTrade.sellDate,
          buyDate: editingTrade.buyDate,
          buyPrice: editingTrade.buyPrice,
          sellPrice: editingTrade.sellPrice,
          shares: editingTrade.shares,
          pnlPercent: editingTrade.pnlPercent,
          notes: modalNotes,
          tags: modalTags,
          aiTags: modalAiTags,
        }),
      });
      if (res.ok) {
        const saved: TradeJournal = await res.json();
        setJournals(prev => ({ ...prev, [journalKey(editingTrade)]: saved }));
        // Refresh analytics
        const ar = await fetch(`${API_URL}/api/portfolio/journals/tag-analytics`, { credentials: 'include' });
        if (ar.ok) setTagAnalytics(await ar.json());
      }
      setEditingTrade(null);
    } catch (e) { console.error(e); }
    finally { setModalSaving(false); }
  };

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

  /* ─── Stat Card ─── */
  const StatCard = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', overflow: 'hidden'
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
      <div style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)`, border: `1px solid ${color}30`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      </div>
    );
  };

  // ── Journal Edit Modal ──
  const PRESET_TAGS = [
    'BB_Squeeze','Bounce_EMA50','MACD_Cross_Bullish','RSI_Oversold_Bounce',
    'Gap_Up_Play','Breakout_Resistance','Volume_Surge','News_Catalyst',
    'Earnings_Play','Trend_Following','Support_Bounce','Swing_Success',
    'Stop_Loss_Hit','FOMO_Entry','Discipline_Exit',
  ];

  const allModalTags = [...new Set([...modalAiTags, ...modalTags])];

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
        <button onClick={fetchRecap} style={{ padding: '9px 18px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <StatCard label="Net P&L" value={`${isProfit ? '+' : ''}IDR ${fmt(s.netPnl)}`} sub="Total realized profit/loss" accent={isProfit ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'} />
            <StatCard label="Total Profit" value={`IDR ${fmt(s.totalProfit)}`} sub={`${s.winCount} trades menang`} accent="rgba(52,211,153,0.7)" />
            <StatCard label="Total Loss" value={`-IDR ${fmt(Math.abs(s.totalLoss))}`} sub={`${s.lossCount} trades kalah`} accent="rgba(248,113,113,0.7)" />
            <StatCard label="Win Rate" value={`${s.winRate.toFixed(1)}%`} sub={`${s.winCount}W / ${s.lossCount}L dari ${s.totalTrades} trades`} accent={s.winRate >= 55 ? 'rgba(52,211,153,0.7)' : s.winRate >= 40 ? 'rgba(251,191,36,0.7)' : 'rgba(248,113,113,0.7)'} />
            <StatCard label="Total Trades" value={String(s.totalTrades)} sub="Pasangan BUY→SELL" accent="rgba(99,102,241,0.6)" />
            <StatCard label="Avg Holding" value={`${s.avgHoldingDays.toFixed(1)} hari`} sub="Rata-rata durasi per trade" accent="rgba(139,92,246,0.6)" />
          </div>

          {/* ── Win Rate Bar ── */}
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

          {/* ── Highlights ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <TradeHighlight trade={data!.bestTrade} label="🏆 Trade Terbaik" color="#34d399" />
            <TradeHighlight trade={data!.worstTrade} label="💔 Trade Terburuk" color="#f87171" />
          </div>

          {/* ── Tag Filter Bar ── */}
          {allTags.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏷️ Filter by Tag</span>
                {activeTags.length > 0 && (
                  <button onClick={() => setActiveTags([])} style={{ padding: '2px 10px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '20px', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
                    Clear All
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allTags.map(tag => (
                  <TagChip
                    key={tag} tag={tag} selected={activeTags.includes(tag)}
                    onClick={() => setActiveTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )}
                  />
                ))}
              </div>
              {activeTags.length > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '10px' }}>
                  Menampilkan {filteredTrades.length} trade dengan tag: {activeTags.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── Tab switch ── */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            {(['trades', 'symbols', 'tags'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 20px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                background: activeTab === tab ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: activeTab === tab ? '#a5b4fc' : '#64748b', transition: 'all 0.2s'
              }}>
                {tab === 'trades' ? '📋 Riwayat Trade' : tab === 'symbols' ? '📊 Per Saham' : '🏷️ Win Rate per Tag'}
              </button>
            ))}
          </div>

          {/* ── TAB: Closed Trades ── */}
          {activeTab === 'trades' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Riwayat Trade Selesai</h3>
                <input placeholder="Filter simbol..." value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
                  style={{ marginLeft: 'auto', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#f1f5f9', fontSize: '0.82rem', width: '160px', outline: 'none' }} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {['Saham','Beli','Jual','Lot','Harga Beli','Harga Jual','Realized P&L','% P&L','Durasi','Tags','Journal'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr><td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>Tidak ada data yang cocok</td></tr>
                    ) : filteredTrades.map((t, i) => {
                      const win = t.realizedPnl > 0;
                      const j = journals[journalKey(t)];
                      const tradeTags = j ? [...new Set([...j.aiTags, ...j.tags])] : [];
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', background: win ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${win ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                              {win ? '▲' : '▼'} {Math.abs(t.pnlPercent).toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', color: '#64748b' }}>{t.holdingDays}h</td>
                          {/* Tags column */}
                          <td style={{ padding: '13px 16px', minWidth: '160px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {tradeTags.slice(0, 3).map(tag => (
                                <TagChip key={tag} tag={tag} selected />
                              ))}
                              {tradeTags.length > 3 && (
                                <span style={{ fontSize: '0.7rem', color: '#475569', padding: '3px 6px' }}>+{tradeTags.length - 3}</span>
                              )}
                              {tradeTags.length === 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#334155', fontStyle: 'italic' }}>—</span>
                              )}
                            </div>
                          </td>
                          {/* Journal button */}
                          <td style={{ padding: '13px 16px' }}>
                            <button
                              onClick={() => openJournal(t)}
                              style={{
                                padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)',
                                background: j ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                                color: j ? '#a5b4fc' : '#475569', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                whiteSpace: 'nowrap', transition: 'all 0.15s',
                              }}
                            >
                              {j ? '📝 Edit' : '➕ Jurnal'}
                            </button>
                          </td>
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
                    {data!.bySymbol.map((sym, i) => {
                      const win = sym.totalPnl >= 0;
                      const wr = sym.trades > 0 ? (sym.wins / sym.trades) * 100 : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: '#60a5fa' }}>{sym.symbol}</td>
                          <td style={{ padding: '13px 16px', color: '#e2e8f0' }}>{sym.trades}</td>
                          <td style={{ padding: '13px 16px', color: '#34d399' }}>{sym.wins}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${wr}%`, background: wr >= 55 ? '#34d399' : wr >= 40 ? '#fbbf24' : '#f87171', borderRadius: '99px' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: wr >= 55 ? '#34d399' : wr >= 40 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{wr.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontWeight: 700, color: win ? '#34d399' : '#f87171', whiteSpace: 'nowrap' }}>
                            {win ? '+' : ''}IDR {fmt(sym.totalPnl)}
                          </td>
                          <td style={{ padding: '13px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>IDR {fmt(sym.totalVolume)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB: Win Rate per Tag ── */}
          {activeTab === 'tags' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tagAnalytics.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏷️</div>
                  <p style={{ color: '#475569' }}>Belum ada data tag. Tambahkan jurnal pada trade di tab "Riwayat Trade".</p>
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>🏷️ Win Rate per Pattern Tag</h3>
                    <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '20px' }}>Analisis pola trading mana yang menghasilkan win rate tertinggi.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {tagAnalytics.map((row, i) => (
                        <div key={row.tag} style={{
                          display: 'grid', gridTemplateColumns: '200px 1fr 80px 90px 100px',
                          alignItems: 'center', gap: '16px', padding: '14px 16px',
                          background: i === 0 ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {i === 0 && <span style={{ fontSize: '0.9rem' }}>🥇</span>}
                            {i === 1 && <span style={{ fontSize: '0.9rem' }}>🥈</span>}
                            {i === 2 && <span style={{ fontSize: '0.9rem' }}>🥉</span>}
                            <TagChip tag={row.tag} selected />
                          </div>
                          {/* Win rate bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.72rem', color: '#475569' }}>
                              <span>{row.wins}W / {row.totalTrades - row.wins}L</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${row.winRate}%`,
                                background: row.winRate >= 60 ? 'linear-gradient(90deg,#10b981,#34d399)' : row.winRate >= 40 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)',
                                borderRadius: '99px', transition: 'width 0.8s ease',
                              }} />
                            </div>
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: row.winRate >= 60 ? '#34d399' : row.winRate >= 40 ? '#fbbf24' : '#f87171', textAlign: 'right' }}>
                            {row.winRate.toFixed(0)}%
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                            {row.totalTrades} trade{row.totalTrades > 1 ? 's' : ''}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: row.avgPnl >= 0 ? '#34d399' : '#f87171', textAlign: 'right' }}>
                            {row.avgPnl >= 0 ? '+' : ''}{row.avgPnl.toFixed(1)}% avg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          JOURNAL EDIT MODAL
      ══════════════════════════════════════════════════ */}
      {editingTrade && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setEditingTrade(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px',
              boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.3rem' }}>📝</span>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    Jurnal Trade — <span style={{ color: '#60a5fa' }}>{editingTrade.symbol}</span>
                  </h2>
                  <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: editingTrade.pnlPercent >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: editingTrade.pnlPercent >= 0 ? '#34d399' : '#f87171', border: `1px solid ${editingTrade.pnlPercent >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                    {editingTrade.pnlPercent >= 0 ? '+' : ''}{editingTrade.pnlPercent.toFixed(2)}%
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#475569' }}>
                  📅 {fmtDate(editingTrade.buyDate)} → {fmtDate(editingTrade.sellDate)} · ⏱ {editingTrade.holdingDays} hari · 📦 {fmt(editingTrade.shares)} lot
                </p>
              </div>
              <button onClick={() => setEditingTrade(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '6px 10px', fontSize: '1rem' }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* AI Tags Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🤖 AI Pattern Tags</span>
                  <button
                    onClick={handleSuggestTags}
                    disabled={suggestingTags}
                    style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', cursor: suggestingTags ? 'wait' : 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: suggestingTags ? 0.7 : 1 }}
                  >
                    {suggestingTags ? '⏳ Menganalisis...' : '✨ Generate AI Tags'}
                  </button>
                </div>
                {modalAiTags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {modalAiTags.map(tag => (
                      <TagChip key={tag} tag={tag} selected removable onRemove={() => setModalAiTags(p => p.filter(t => t !== tag))} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#334155', fontStyle: 'italic' }}>
                    Klik "Generate AI Tags" untuk mendapatkan saran pattern tag dari Gemini AI berdasarkan data trade ini.
                  </p>
                )}
              </div>

              {/* User Tags */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>🏷️ Tags Kustom</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {PRESET_TAGS.map(tag => (
                    <TagChip
                      key={tag} tag={tag}
                      selected={modalTags.includes(tag)}
                      onClick={() => setModalTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}
                    />
                  ))}
                </div>
                {/* Custom tag input */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    placeholder="Tambah tag custom (e.g. Breakout_Harian)..."
                    value={modalCustomTag}
                    onChange={e => setModalCustomTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && modalCustomTag.trim()) {
                        const t = modalCustomTag.trim().replace(/\s+/g, '_');
                        setModalTags(p => p.includes(t) ? p : [...p, t]);
                        setModalCustomTag('');
                      }
                    }}
                    style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => {
                      if (modalCustomTag.trim()) {
                        const t = modalCustomTag.trim().replace(/\s+/g, '_');
                        setModalTags(p => p.includes(t) ? p : [...p, t]);
                        setModalCustomTag('');
                      }
                    }}
                    style={{ padding: '8px 14px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                  >
                    + Add
                  </button>
                </div>
                {/* Selected user tags */}
                {modalTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {modalTags.map(tag => (
                      <TagChip key={tag} tag={tag} selected removable onRemove={() => setModalTags(p => p.filter(t => t !== tag))} />
                    ))}
                  </div>
                )}
              </div>

              {/* Notes Textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📄 Catatan (Markdown)</span>
                  <button
                    onClick={() => setModalPreview(p => !p)}
                    style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {modalPreview ? '✏️ Edit' : '👁 Preview'}
                  </button>
                </div>
                {modalPreview ? (
                  <div
                    style={{ minHeight: '160px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: modalNotes ? modalNotes.replace(/\n/g, '<br>').replace(/##\s(.+)/g, '<h3 style="color:#a5b4fc;margin:10px 0 4px">$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') : '<em style="color:#334155">Tidak ada catatan...</em>' }}
                  />
                ) : (
                  <textarea
                    value={modalNotes}
                    onChange={e => setModalNotes(e.target.value)}
                    placeholder={`## Setup\nDeskripsikan setup teknikal...\n\n## Entry Reason\nKenapa masuk di harga ini?\n\n## Exit Reason\nKenapa keluar?\n\n## Lesson Learned\nApa yang bisa dipelajari?`}
                    rows={8}
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEditingTrade(null)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                Batal
              </button>
              <button
                onClick={handleSaveJournal}
                disabled={modalSaving}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', cursor: modalSaving ? 'wait' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: modalSaving ? 0.7 : 1 }}
              >
                {modalSaving ? '⏳ Menyimpan...' : '💾 Simpan Jurnal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SwingRecap;
