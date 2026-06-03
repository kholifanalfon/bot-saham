import React, { useState } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

// Helper to safely parse basic markdown features to HTML using marked library and sanitizing it
const parseMarkdownToHtml = (text: string): string => {
  if (!text) return "";
  try {
    const rawHtml = marked.parse(text) as string;
    return DOMPurify.sanitize(rawHtml);
  } catch (err) {
    console.error("Failed to parse markdown:", err);
    return text;
  }
};

export const AIAnalysis: React.FC = () => {
  const { language } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: language === 'id' 
        ? 'Halo! Saya asisten trading bertenaga Gemini Anda. Tanyakan apa saja tentang analisis saham atau minta pemindaian breakout teknikal untuk ticker apa pun.'
        : 'Hello! I am your Gemini-powered trading assistant. Ask me anything about stock analysis or request a technical breakout scan for any ticker.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [sentimentData, setSentimentData] = useState<{
    sentiment: string;
    score: number;
    summary: string;
    sectors: string[];
  } | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [registryStocks, setRegistryStocks] = useState<{
    symbol: string;
    name: string;
    market: string;
    isActive: boolean;
    swingScore?: number;
  }[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'IDX' | 'US'>('ALL');

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, loadingResponse]);

  const filteredStocks = registryStocks
    .filter(s => s.isActive !== false)
    .filter(s => {
      if (selectedMarket === 'ALL') return true;
      return (s.market?.toUpperCase() || 'US') === selectedMarket;
    })
    .filter(s => {
      const q = stockSearchQuery.toLowerCase();
      return s.symbol.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q));
    })
    .sort((a, b) => (Number(b.swingScore) || 0) - (Number(a.swingScore) || 0));

  React.useEffect(() => {
    const fetchSentiment = async () => {
      setLoadingSentiment(true);
      try {
        const res = await fetch(`http://localhost:3001/api/ai/market-sentiment?language=${language}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setSentimentData(data);
        }
      } catch (err) {
        console.error("Failed to fetch market sentiment:", err);
      } finally {
        setLoadingSentiment(false);
      }
    };

    const fetchRegistry = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/stocks/registry`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setRegistryStocks(data);
        }
      } catch (err) {
        console.error("Failed to fetch registry stocks:", err);
      }
    };

    fetchSentiment();
    fetchRegistry();
  }, [language]);

  const handlePillClick = async (symbol: string) => {
    if (loadingResponse) return;
    const prompt = language === 'id'
      ? `Berikan analisis detail mengenai saham ${symbol}`
      : `Provide a detailed analysis for stock ${symbol}`;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatLog((prev) => [...prev, userMsg]);
    setLoadingResponse(true);

    try {
      const response = await fetch("http://localhost:3001/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          history: chatLog,
          language,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();
      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: data.text,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat assistant error:", err);
      const errorMsg: ChatMessage = {
        sender: 'ai',
        text: language === 'id' 
          ? 'Maaf, terjadi kesalahan saat menghubungi asisten trading Gemini.' 
          : 'Sorry, an error occurred while reaching the Gemini trading assistant.',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingResponse(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || loadingResponse) return;

    const userPrompt = query;
    const userMsg: ChatMessage = {
      sender: 'user',
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatLog((prev) => [...prev, userMsg]);
    setQuery('');
    setLoadingResponse(true);

    try {
      const response = await fetch("http://localhost:3001/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userPrompt,
          history: chatLog,
          language,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();
      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: data.text,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat assistant error:", err);
      const errorMsg: ChatMessage = {
        sender: 'ai',
        text: language === 'id' 
          ? 'Maaf, terjadi kesalahan saat menghubungi asisten trading Gemini.' 
          : 'Sorry, an error occurred while reaching the Gemini trading assistant.',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingResponse(false);
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', 
      gap: '24px', 
      height: isMobile ? 'auto' : 'calc(100vh - 140px)',
      overflowY: isMobile ? 'visible' : 'hidden'
    }}>
      {/* Styles to restore marked library list and numbering formatting */}
      <style>{`
        .markdown-content ul, .markdown-content ol {
          padding-left: 20px !important;
          margin: 8px 0 !important;
        }
        .markdown-content ul {
          list-style-type: disc !important;
        }
        .markdown-content ol {
          list-style-type: decimal !important;
        }
        .markdown-content li {
          margin-bottom: 4px !important;
        }
        .markdown-content p {
          margin: 6px 0 !important;
        }
      `}</style>
      
      {/* Sentiment overview */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>AI Market Sentiment</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          {language === 'id' 
            ? 'Evaluasi indeks pasar harian berdasarkan feed berita keuangan.' 
            : 'Daily market indexes evaluation based on financial news feeds.'}
        </p>

        {loadingSentiment ? (
          <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span className="live-pulse" style={{ backgroundColor: '#3b82f6', width: '8px', height: '8px' }}></span>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              {language === 'id' ? 'Memuat sentimen pasar...' : 'Loading market sentiment...'}
            </span>
          </div>
        ) : (
          <>
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: sentimentData?.sentiment?.toLowerCase().includes('bull') 
                ? 'rgba(16, 185, 129, 0.05)' 
                : sentimentData?.sentiment?.toLowerCase().includes('bear')
                  ? 'rgba(239, 68, 68, 0.05)'
                  : 'rgba(245, 158, 11, 0.05)',
              border: sentimentData?.sentiment?.toLowerCase().includes('bull')
                ? '1px solid rgba(16, 185, 129, 0.15)'
                : sentimentData?.sentiment?.toLowerCase().includes('bear')
                  ? '1px solid rgba(239, 68, 68, 0.15)'
                  : '1px solid rgba(245, 158, 11, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ 
                fontSize: '0.78rem', 
                color: sentimentData?.sentiment?.toLowerCase().includes('bull') 
                  ? '#10b981' 
                  : sentimentData?.sentiment?.toLowerCase().includes('bear')
                    ? '#ef4444'
                    : '#f59e0b', 
                fontWeight: 600 
              }}>
                {language === 'id' ? 'RATING MENYELURUH' : 'COMPREHENSIVE RATING'}
              </span>
              <span style={{ 
                fontSize: '1.8rem', 
                fontWeight: 700, 
                color: sentimentData?.sentiment?.toLowerCase().includes('bull') 
                  ? '#10b981' 
                  : sentimentData?.sentiment?.toLowerCase().includes('bear')
                    ? '#ef4444'
                    : '#f59e0b'
              }}>
                {sentimentData ? `${sentimentData.sentiment.toUpperCase()} (${sentimentData.score}%)` : 'N/A'}
              </span>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                "{sentimentData?.summary || ''}"
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                {language === 'id' ? 'Fokus Sektor' : 'Sector Focus'}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(sentimentData?.sectors || []).map((s) => (
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

            {/* Quick Analysis for Registered Stocks with Search & Market Filter */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              marginTop: '10px', 
              borderTop: '1px solid rgba(255,255,255,0.08)', 
              paddingTop: '15px' 
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                {language === 'id' ? 'Analisis Cepat Saham Terdaftar' : 'Quick Analysis for Registered Stocks'}
              </span>

              {/* Market Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'IDX', 'US'] as const).map(marketOpt => (
                  <button
                    key={marketOpt}
                    type="button"
                    onClick={() => setSelectedMarket(marketOpt)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: selectedMarket === marketOpt ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: selectedMarket === marketOpt ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                      color: selectedMarket === marketOpt ? '#60a5fa' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontWeight: selectedMarket === marketOpt ? 600 : 400
                    }}
                  >
                    {marketOpt}
                  </button>
                ))}
              </div>
              
              <input
                type="text"
                placeholder={language === 'id' ? "Cari kode atau nama saham..." : "Search symbol or stock name..."}
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                  width: '100%',
                  outline: 'none'
                }}
              />

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {filteredStocks.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                    {language === 'id' ? 'Tidak ada saham ditemukan' : 'No stocks found'}
                  </span>
                ) : (
                  filteredStocks.map((stock) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => handlePillClick(stock.symbol)}
                      disabled={loadingResponse}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '2px',
                        fontSize: '0.78rem',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        cursor: loadingResponse ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        outline: 'none',
                        width: '100%'
                      }}
                      className="stock-shortcut-pill"
                    >
                      <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{stock.symbol}</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            fontWeight: 700
                          }}>
                            Swing: {stock.swingScore !== undefined && stock.swingScore !== null ? Number(stock.swingScore).toFixed(0) : 'N/A'}
                          </span>
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: (stock.market?.toUpperCase() || 'US') === 'IDX' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: (stock.market?.toUpperCase() || 'US') === 'IDX' ? '#f87171' : '#34d399',
                            fontWeight: 700
                          }}>
                            {stock.market?.toUpperCase() || 'US'}
                          </span>
                        </div>
                      </div>
                      {stock.name && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {stock.name}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Interactive Chat Console */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        height: isMobile ? '550px' : '100%'
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
                  <div className="markdown-content" dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(msg.text) }} />
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
          {loadingResponse && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.08)',
              color: '#94a3b8',
              fontSize: '0.85rem',
              alignSelf: 'flex-start',
              width: 'fit-content'
            }}>
              <span className="live-pulse" style={{ backgroundColor: '#3b82f6', width: '6px', height: '6px' }}></span>
              <span>{language === 'id' ? 'Gemini sedang menganalisis...' : 'Gemini is analyzing...'}</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>



        {/* Input Bar */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder={language === 'id' ? "Ketik kode saham (cth: BBRI.JK) atau ajukan pertanyaan..." : "Type a stock ticker symbol (e.g. BBRI.JK) or ask a question..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loadingResponse}
            style={{ 
              flex: 1,
              backgroundColor: loadingResponse ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)',
              cursor: loadingResponse ? 'not-allowed' : 'text'
            }}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loadingResponse || !query.trim()}
            style={{ 
              padding: '10px 24px',
              opacity: (loadingResponse || !query.trim()) ? 0.6 : 1,
              cursor: (loadingResponse || !query.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingResponse ? '...' : (language === 'id' ? 'Kirim' : 'Send')}
          </button>
        </form>
      </div>
    </div>
  );
};
export default AIAnalysis;
