import React from 'react';
import { useLanguageStore } from '../store/useLanguageStore';

export const AlgorithmExplanation: React.FC = () => {
  const { t, language } = useLanguageStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
          {language === 'id' ? 'Sistem Algoritma Analisis Swing' : 'Swing Analysis Algorithm System'}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          {language === 'id' 
            ? 'Penjelasan mendalam rumus matematika, bobot teknikal, dan alur penyaringan sistem Swing Trading.' 
            : 'An in-depth explanation of the mathematical formulas, technical weights, and scanning workflow of the Swing Trading system.'}
        </p>
      </div>

      {/* Intro Card */}
      <div className="glass-panel" style={{ padding: '24px', lineHeight: 1.6 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#3b82f6', marginBottom: '12px' }}>
          {language === 'id' ? 'Apa itu Strategi Swing Trading?' : 'What is the Swing Trading Strategy?'}
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.92rem' }}>
          {language === 'id'
            ? 'Swing Trading adalah strategi perdagangan jangka pendek hingga menengah di mana trader menahan posisi selama beberapa hari hingga beberapa minggu untuk menangkap pergerakan harga (swing harian) saat pasar sedang berakselerasi dalam tren tertentu. Strategi ini memanfaatkan pembalikan tren di area support/resistance serta momentum keberlanjutan tren.'
            : 'Swing Trading is a short-to-medium-term trading strategy where traders hold positions for several days to a few weeks to capture price swings while the market accelerates within a trend. This strategy capitalizes on trend reversals at support/resistance zones and trend continuation.'}
        </p>
      </div>

      {/* Formula & Weighting Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
          {language === 'id' ? 'Formulasi Skor Swing (Maksimal: 100)' : 'Swing Score Formulation (Max: 100)'}
        </h3>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: '#06b6d4',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '1.4'
        }}>
          Skor = (EMA * 0.25) + (OBV * 0.25) + (MACD * 0.20) + (RSI * 0.15) + (Volume * 0.10) + (BB * 0.05)
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '24px' }}>
          {language === 'id'
            ? 'Setiap parameter dievaluasi secara matematis oleh sistem di backend untuk menghasilkan nilai skor antara 0 hingga 100. Saham dengan skor di atas 70 dikategorikan memiliki kondisi ideal untuk swing trading.'
            : 'Each parameter is mathematically evaluated by the backend engine to output a score between 0 and 100. Stocks scoring above 70 are categorized as ideal swing trading setups.'}
        </p>

        {/* 6 Points Breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Factor 1: EMA */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>25%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Exponential Moving Average (EMA 9, 21, 50)
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Menilai struktur tren jangka pendek, menengah, dan panjang. Sistem memberikan skor penuh jika harga berada di atas EMA9, EMA21, dan EMA50 yang tersusun rapi (Golden Bullish Stack). Saham yang memantul dari EMA21 atau EMA50 saat tren naik juga diberi nilai tinggi sebagai peluang pullback sehat.'
                  : 'Assesses trend structural alignment across short, medium, and long terms. The engine requires the price to stand above the EMA9, EMA21, and EMA50 in a stacked layout. Bounces off EMA21 or EMA50 during an uptrend also receive high scores as ideal pullback entry points.'}
              </p>
            </div>
          </div>

          {/* Factor 2: OBV */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>25%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                On-Balance Volume (OBV) Trend Accumulation
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Menganalisis akumulasi volume transaksi pasar. Sistem membandingkan rata-rata bergerak OBV jangka pendek (EMA 5) dengan jangka menengah (EMA 20). Jika terjadi akumulasi institusional aktif (EMA 5 > EMA 20), skor maksimal diberikan untuk mengonfirmasi partisipasi kuat uang besar (smart money).'
                  : 'Analyzes flow of volume accumulation. Compares the short-term OBV EMA 5 against the mid-term OBV EMA 20. Active smart money accumulation (EMA 5 > EMA 20) triggers maximum points to confirm institutional buying support.'}
              </p>
            </div>
          </div>

          {/* Factor 3: MACD */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>20%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Moving Average Convergence Divergence (MACD 12, 26, 9)
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Mendeteksi pembalikan arah momentum dan kekuatan tren. Persilangan garis MACD ke atas garis sinyal (bullish crossover) memicu nilai tinggi, terutama jika terjadi di area jenuh jual atau saat histogram mengembang ke wilayah positif.'
                  : 'Detects trend reversals and strength. Bullish crossovers trigger high ratings, especially when occurring in oversold territory or when the histogram expands positively.'}
              </p>
            </div>
          </div>

          {/* Factor 4: RSI */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              color: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>15%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Relative Strength Index (RSI - 14)
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Mengukur kekuatan momentum harga relative. Untuk swing trading, wilayah RSI 45-65 adalah zona ideal untuk kelanjutan tren naik yang sehat. Nilai RSI di bawah 35 saat tren utama naik mengindikasikan peluang pullback harga murah.'
                  : 'Measures momentum strength and overbought/oversold levels. For swing trading, the RSI 45-65 range indicates a healthy trend. RSI below 35 during a primary uptrend signals high-reward pullback opportunities.'}
              </p>
            </div>
          </div>

          {/* Factor 5: Volume */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              color: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>10%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Volume Confirmation Engine
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Mengonfirmasi partisipasi pasar harian. Kenaikan harga yang disertai dengan lonjakan volume di atas rata-rata 5 hari sebelumnya (volume > avg * 1.30) menegaskan kekuatan pendorongan harga (bullish push).'
                  : 'Confirms market and daily transaction participation. Price gains accompanied by volume spikes above the previous 5-day average (volume > avg * 1.30) validate the strength of the bullish push.'}
              </p>
            </div>
          </div>

          {/* Factor 6: BB */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0
            }}>5%</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                Bollinger Bands Position (20, 2)
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {language === 'id'
                  ? 'Mengukur batas volatilitas harga. Harga yang memantul dari batas bawah (lower band) atau batas tengah (middle band) Bollinger Bands memberikan titik masuk swing berisiko rendah dengan target penguatan ke batas atas.'
                  : 'Measures volatility bands relative position. Price bouncing from the lower band or mid-band indicates a high-probability swing rebound setup targeting the upper band.'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* MACD Signals & Interpretation Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#10b981' }}>
          {language === 'id' ? '📈 Cara Membaca & Interpretasi Sinyal MACD' : '📈 How to Read & Interpret MACD Signals'}
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {language === 'id'
            ? 'MACD menghasilkan sinyal perdagangan melalui interaksi antara tiga komponen utama: Garis MACD, Garis Sinyal, dan Histogram. Berikut adalah tiga sinyal MACD utama yang dievaluasi secara otomatis oleh sistem kami:'
            : 'The MACD generates trading signals through the interaction of its three core components: the MACD Line, the Signal Line, and the Histogram. Here are the three primary MACD signals automatically evaluated by our scoring system:'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
          {/* Crossover Bullish */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <h4 style={{ fontWeight: 600, color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🟢</span> {language === 'id' ? 'Bullish Crossover (Beli)' : 'Bullish Crossover (Buy)'}
            </h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8' }}>
              {language === 'id'
                ? 'Terjadi ketika Garis MACD memotong ke atas Garis Sinyal. Ini menunjukkan momentum jangka pendek beralih menjadi jauh lebih kuat dibanding jangka panjang. Pada algoritma swing kami, persilangan naik dari bawah nol adalah tanda pembalikan arah tren yang kuat.'
                : 'Occurs when the MACD Line crosses above the Signal Line. This indicates that short-term momentum is accelerating faster than the long-term trend. In our swing algorithm, a bullish crossover from below zero is a powerful reversal indicator.'}
            </p>
          </div>

          {/* Histogram Expansion */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(6, 182, 212, 0.03)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            <h4 style={{ fontWeight: 600, color: '#06b6d4', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span> {language === 'id' ? 'Ekspansi Histogram (Akselerasi)' : 'Histogram Expansion (Acceleration)'}
            </h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8' }}>
              {language === 'id'
                ? 'Histogram mengukur jarak antara Garis MACD dan Garis Sinyal. Ketika histogram berwarna hijau dan melebar ke atas (> 0), ini mengonfirmasi bahwa tren penguatan sedang berakselerasi dengan sangat solid, ideal untuk menahan posisi swing.'
                : 'The histogram measures the distance between the MACD Line and the Signal Line. When the histogram bars are green and expanding upwards (> 0), it confirms that the upward buying pressure is actively accelerating, which is ideal for holding swing trades.'}
            </p>
          </div>

          {/* Bearish Crossover */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <h4 style={{ fontWeight: 600, color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span> {language === 'id' ? 'Bearish Crossover (Hindari/Jual)' : 'Bearish Crossover (Avoid/Sell)'}
            </h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#94a3b8' }}>
              {language === 'id'
                ? 'Terjadi ketika Garis MACD memotong ke bawah Garis Sinyal. Ini menandakan penurunan momentum dan awal dari tren melemah. Pelaku swing trading biasanya merealisasikan profit atau memotong kerugian ketika sinyal ini muncul.'
                : 'Occurs when the MACD Line crosses below the Signal Line. This indicates a contraction in momentum and the start of a markdown phase. Swing traders typically take profits or exit positions when this signal occurs.'}
            </p>
          </div>
        </div>
      </div>

      {/* Authoritative Reference Section */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#3b82f6' }}>
          {language === 'id' ? '📚 Referensi Teori Akademik & Indikator Teknis' : '📚 Academic Theory & Technical Indicator References'}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.9rem', lineHeight: 1.6, color: '#cbd5e1' }}>
          
          {/* RSI Reference */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              1. Relative Strength Index (RSI)
            </h4>
            <p style={{ marginBottom: '10px' }}>
              {language === 'id'
                ? 'RSI pertama kali dikembangkan oleh J. Welles Wilder Jr. pada tahun 1978 di dalam bukunya yang terkenal, "New Concepts in Technical Trading Systems". Indikator osilator ini membandingkan ukuran keuntungan rata-rata dengan kerugian rata-rata selama 14 periode.'
                : 'The RSI was developed by J. Welles Wilder Jr. in 1978 and published in his seminal book, "New Concepts in Technical Trading Systems". This momentum oscillator compares the magnitude of recent gains to recent losses over 14 periods.'}
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#06b6d4', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginBottom: '10px' }}>
              Formula: RSI = 100 - (100 / (1 + RS)) di mana RS = (Rata-rata Kenaikan / Rata-rata Penurunan)
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Ref: <a href="https://www.investopedia.com/terms/r/rsi.asp" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Investopedia RSI Article</a> | Wilder, J. W. (1978). *New Concepts in Technical Trading Systems*.
            </span>
          </div>

          {/* MACD Reference */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              2. Moving Average Convergence Divergence (MACD)
            </h4>
            <p style={{ marginBottom: '10px' }}>
              {language === 'id'
                ? 'MACD diciptakan oleh Gerald Appel pada akhir tahun 1970-an. Indikator ini sangat andal untuk mengidentifikasi momentum tren jangka pendek dan arah pergerakan harga dengan membandingkan hubungan antara dua rata-rata bergerak eksponensial (EMA).'
                : 'MACD was created by Gerald Appel in the late 1970s. It serves as an incredibly robust trend-following momentum indicator that reveals the relationship between two exponential moving averages (EMAs) of a security\'s price.'}
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#06b6d4', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginBottom: '10px' }}>
              Formula: MACD Line = EMA12 - EMA26 | Signal Line = EMA9 dari MACD Line | Histogram = MACD Line - Signal Line
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Ref: <a href="https://www.investopedia.com/terms/m/macd.asp" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Investopedia MACD Article</a> | Appel, G. (2005). *Technical Analysis: Power Tools for Active Investors*.
            </span>
          </div>

          {/* EMA Reference */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              3. Exponential Moving Average (EMA)
            </h4>
            <p style={{ marginBottom: '10px' }}>
              {language === 'id'
                ? 'Rata-rata Bergerak Eksponensial (EMA) adalah salah satu alat analisis tren fundamental dalam teori investasi modern. Berbeda dengan Simple Moving Average (SMA), EMA memberikan bobot yang lebih besar pada harga penutupan terbaru sehingga mendeteksi tren berbalik jauh lebih cepat.'
                : 'The Exponential Moving Average (EMA) is a fundamental trend-following indicator in modern trading theory. Unlike a Simple Moving Average (SMA), an EMA applies more weight to recent price data, making it highly sensitive to recent price shifts.'}
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#06b6d4', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginBottom: '10px' }}>
              Formula: EMA(t) = (Harga(t) * (Multiplier / (1 + Period))) + EMA(t-1) * (1 - (Multiplier / (1 + Period)))
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Ref: <a href="https://www.investopedia.com/terms/e/ema.asp" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>Investopedia EMA Article</a> | Murphy, J. J. (1999). *Technical Analysis of the Financial Markets*.
            </span>
          </div>

        </div>
      </div>

      {/* Safety Alert Disclaimer */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderLeft: '4px solid #f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.02)',
        fontSize: '0.88rem',
        lineHeight: 1.6,
        color: '#cbd5e1'
      }}>
        <strong>{language === 'id' ? '⚠️ Manajemen Risiko Swing Trading:' : '⚠️ Swing Trading Risk Management:'}</strong>
        <br />
        {language === 'id'
          ? 'Meskipun skor algoritma di atas 70 mengindikasikan kecenderungan pergerakan naik swing yang kuat, pastikan Anda menggunakan manajemen risiko yang solid dengan menetapkan stop loss sekitar 4-5% atau di bawah swing low terakhir.'
          : 'Although algorithm scores exceeding 70 point to a high probability of upward swing movements, always maintain solid risk management by setting stop loss orders around 4-5% or below the recent swing low.'}
      </div>
    </div>
  );
};

export default AlgorithmExplanation;
