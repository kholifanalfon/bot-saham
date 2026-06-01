import React, { useState, useEffect } from 'react';

export const ApiGuide: React.FC = () => {
  const [finnhub, setFinnhub] = useState('');
  const [sectors, setSectors] = useState('');
  const [gemini, setGemini] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load configured keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/settings', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to load API settings');
        const settings = await response.json();
        
        // If keys exist in DB, show masked dots, else show empty string so user knows it is unconfigured
        if (settings.finnhub_api_key) {
          setFinnhub('●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●');
        }
        if (settings.sectors_api_key) {
          setSectors('●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●');
        }
        if (settings.gemini_api_key) {
          setGemini('●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●');
        }
      } catch (err: any) {
        console.error('Error fetching API settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadKeys();
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setErrorMessage(null);

    try {
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          finnhub_api_key: finnhub,
          sectors_api_key: sectors,
          gemini_api_key: gemini
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update API keys');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error('Error updating keys:', err);
      setErrorMessage(err.message || 'Gagal menyimpan kunci API.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', minHeight: 'calc(100vh - 120px)' }}>
      {/* API Setup Console Form */}
      <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          API Connection Console
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Save your API keys securely to connect the stock breakout engine and AI sentiment analyst directly to global feeds.
        </p>

        {saved && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            ✓ Connection Keys successfully updated in PostgreSQL database table settings!
          </div>
        )}

        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', fontSize: '0.85rem' }}>
            <span className="live-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block', marginRight: '8px' }}></span>
            Memuat status koneksi API...
          </div>
        ) : (
          <form onSubmit={handleSaveKeys} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>Finnhub API Key</label>
                {finnhub.includes('●') && <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Terkonfigurasi</span>}
              </div>
              <input
                type="password"
                placeholder="Masukkan Finnhub API Key..."
                value={finnhub}
                onChange={(e) => setFinnhub(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>Sectors.app API Key</label>
                {sectors.includes('●') && <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Terkonfigurasi</span>}
              </div>
              <input
                type="password"
                placeholder="Masukkan Sectors.app API Key..."
                value={sectors}
                onChange={(e) => setSectors(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>Google Gemini API Key</label>
                {gemini.includes('●') && <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Terkonfigurasi</span>}
              </div>
              <input
                type="password"
                placeholder="Masukkan Gemini API Key..."
                value={gemini}
                onChange={(e) => setGemini(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '6px' }}>
              Update API Connections
            </button>
          </form>
        )}
      </div>

      {/* Deep Step-by-Step API Setup Tutorial */}
      <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          API Setup Tutorial
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '0.88rem', lineHeight: 1.6 }}>
          {/* Finnhub API */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem'
              }}>1</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>Finnhub Stock API</h3>
            </div>
            <ul style={{ paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Registration URL</strong>: Go to <a href="https://finnhub.io/" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'underline' }}>finnhub.io</a></li>
              <li><strong>How to Generate</strong>: Click <strong>"Get free API key"</strong> on the homepage, fill in your email to sign up, and confirm your account.</li>
              <li><strong>Locating Key</strong>: Upon login, your key will be displayed instantly on the developer dashboard under <strong>"API Key"</strong>.</li>
              <li><strong>Details & Usage</strong>: Provides real-time and historical quotes for US markets. The free tier offers 60 requests per minute.</li>
            </ul>
          </div>

          {/* Sectors.app API */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontWeight: 700, fontSize: '0.8rem'
              }}>2</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>Sectors.app IDX API</h3>
            </div>
            <ul style={{ paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Registration URL</strong>: Go to <a href="https://sectors.app/" target="_blank" rel="noreferrer" style={{ color: '#06b6d4', fontWeight: 600, textDecoration: 'underline' }}>sectors.app</a></li>
              <li><strong>How to Generate</strong>: Sign up for a free developer profile, verify your account, and navigate to the **"Developer Console"** or **"API Keys"** section in your dashboard.</li>
              <li><strong>Locating Key</strong>: Click **"Create API Key"**, write a label (e.g. "Bot Saham App"), and copy the token string that is generated.</li>
              <li><strong>Details & Usage</strong>: Unlocks full IDX (Indonesian Stock Market) metadata, sectors metrics, company fundamental metrics, and performance charts.</li>
            </ul>
          </div>

          {/* Google AI Studio API */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700, fontSize: '0.8rem'
              }}>3</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>Google AI Studio (Gemini Key)</h3>
            </div>
            <ul style={{ paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Registration URL</strong>: Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'underline' }}>aistudio.google.com</a></li>
              <li><strong>How to Generate</strong>: Sign in using your standard Google Account. Agree to the terms of service.</li>
              <li><strong>Locating Key</strong>: Click the prominent **"Get API key"** button on the top-left sidebar. Click **"Create API Key"**, select a Google Cloud Project (or create a new default one), and copy the generated key.</li>
              <li><strong>Details & Usage</strong>: Connects your assistant to the high-speed `gemini-1.5-flash` model for instant technical assessments, risk evaluation, and chart readings with a generous free tier.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ApiGuide;
