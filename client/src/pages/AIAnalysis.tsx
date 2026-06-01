import React, { useState } from 'react';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIAnalysis: React.FC = () => {
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your Gemini-powered trading assistant. Ask me anything about stock analysis or request a technical breakout scan for any ticker.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatLog((prev) => [...prev, userMsg]);
    setQuery('');

    // Dynamic professional reply simulation
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: `Based on a simulated technical breakout scan for "${userMsg.text.toUpperCase()}", the stock demonstrates high volume buying pressure above its 50-day EMA support levels. RSI is currently residing inside the optimal breakout region (50-60), making it an excellent BTST trading candidate. Risk exposure is evaluated as Low-Medium with a bullish signal target of +3.5%.`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', height: 'calc(100vh - 140px)' }}>
      {/* Sentiment overview */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>AI Market Sentiment</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Daily market indexes evaluation based on financial news feeds.</p>

        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>COMPREHENSIVE RATING</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>BULLISH (68%)</span>
          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            "Indonesian banking and infrastructure sectors maintain strong upward momentum. Buying volume remains consistent above the 20-day moving average."
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Sector Focus</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['Financials: Bullish', 'Infrastructure: Neutral', 'Technology: Volatile'].map((s) => (
              <span key={s} style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                borderRadius: '100px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Chat Console */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}>
        {/* Chat Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gemini Trading Assistant</h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ask questions about IDX or US stocks for automated strategies</span>
        </div>

        {/* Message Log */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingRight: '6px',
          marginBottom: '16px'
        }}>
          {chatLog.map((msg, index) => {
            const isAI = msg.sender === 'ai';
            return (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: isAI ? 'flex-start' : 'flex-end',
                maxWidth: '85%'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: isAI ? 'rgba(255,255,255,0.03)' : '#3b82f6',
                  color: isAI ? '#f8fafc' : 'white',
                  border: isAI ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  fontSize: '0.88rem',
                  lineHeight: 1.5
                }}>
                  {msg.text}
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  marginTop: '4px',
                  alignSelf: isAI ? 'flex-start' : 'flex-end'
                }}>
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Type a stock ticker symbol (e.g. BBRI.JK) or ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
export default AIAnalysis;
