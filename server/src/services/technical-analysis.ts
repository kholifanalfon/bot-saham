import { RSI, MACD, EMA, BollingerBands } from 'technicalindicators';

export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length <= period) return [];
  return RSI.calculate({ values: prices, period });
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  if (prices.length <= slowPeriod + signalPeriod) return [];
  return MACD.calculate({
    values: prices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
}

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length <= period) return [];
  return EMA.calculate({ values: prices, period });
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  if (prices.length <= period) return [];
  return BollingerBands.calculate({ values: prices, period, stdDev });
}

export function calculateBTSTScore(
  prices: number[],
  rsiVal: number,
  macdVal: { macd?: number; signal?: number; histogram?: number } | undefined,
  ema9Val: number,
  ema21Val: number,
  ema50Val: number,
  volume: number[],
  bollingerBands: { upper?: number; lower?: number; middle?: number } | undefined
): number {
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1];

  // 1. RSI Score (25%) - We want strong momentum (40-60 is ideal for breakout, oversold < 30 is potential reversal)
  let rsiScore = 50;
  if (rsiVal >= 40 && rsiVal <= 65) {
    rsiScore = 90; // High score for momentum zone
  } else if (rsiVal > 65 && rsiVal <= 75) {
    rsiScore = 70; // Moderately high
  } else if (rsiVal < 30) {
    rsiScore = 80; // Oversold bounce potential
  } else if (rsiVal > 75) {
    rsiScore = 30; // Overbought, risk of pullback
  } else {
    rsiScore = 40; // Weak momentum
  }

  // 2. MACD Score (30%) - We want MACD histogram to be positive and growing, or bullish crossover
  let macdScore = 50;
  if (macdVal) {
    const hist = macdVal.histogram || 0;
    if (hist > 0) {
      macdScore = 85;
      // If expanding positive histogram, extra score
      if (macdVal.macd && macdVal.signal && macdVal.macd > macdVal.signal) {
        macdScore = 95;
      }
    } else {
      macdScore = 30;
    }
  }

  // 3. EMA Trend Score (20%) - Price should be above EMA9, EMA21, EMA50
  let emaScore = 50;
  const aboveEma9 = currentPrice > ema9Val;
  const aboveEma21 = currentPrice > ema21Val;
  const aboveEma50 = currentPrice > ema50Val;

  if (aboveEma9 && aboveEma21 && aboveEma50) {
    emaScore = 95; // Golden bullish configuration
  } else if (aboveEma9 && aboveEma21) {
    emaScore = 80;
  } else if (aboveEma9) {
    emaScore = 60;
  } else {
    emaScore = 30; // Downtrend
  }

  // 4. Volume Confirmation Score (15%) - Current volume should be higher than recent average volume
  let volumeScore = 50;
  if (volume.length > 5) {
    const currentVolume = volume[volume.length - 1];
    const recentVolumes = volume.slice(-6, -1);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    if (currentVolume > avgVolume * 1.5) {
      volumeScore = 95; // Strong volume breakout
    } else if (currentVolume > avgVolume * 1.1) {
      volumeScore = 80;
    } else if (currentVolume < avgVolume * 0.7) {
      volumeScore = 30;
    }
  }

  // 5. Bollinger Bands Score (10%) - Near the lower band is a bounce play, but riding upper band can be trend run.
  let bbScore = 50;
  if (bollingerBands && bollingerBands.lower && bollingerBands.upper) {
    const bbRange = bollingerBands.upper - bollingerBands.lower;
    const positionPercent = (currentPrice - bollingerBands.lower) / bbRange;

    if (positionPercent <= 0.15) {
      bbScore = 85; // Strong support bounce potential
    } else if (positionPercent >= 0.85) {
      bbScore = 80; // High momentum trend riding
    } else {
      bbScore = 60; // Neutral range
    }
  }

  // Compute total weighted score
  const totalScore =
    rsiScore * 0.25 +
    macdScore * 0.30 +
    emaScore * 0.20 +
    volumeScore * 0.15 +
    bbScore * 0.10;

  return Math.min(Math.max(totalScore, 0), 100);
}

export function performFullAnalysis(prices: number[], volume: number[]) {
  if (prices.length < 50) {
    throw new Error('Not enough data to calculate core technical indicators (minimum 50 periods required)');
  }

  const rsis = calculateRSI(prices);
  const macds = calculateMACD(prices);
  const ema9s = calculateEMA(prices, 9);
  const ema21s = calculateEMA(prices, 21);
  const ema50s = calculateEMA(prices, 50);
  const bbs = calculateBollingerBands(prices);

  const currentPrice = prices[prices.length - 1];
  const rsi = rsis.length > 0 ? rsis[rsis.length - 1] : 50;
  const macd = macds.length > 0 ? macds[macds.length - 1] : { macd: 0, signal: 0, histogram: 0 };
  const ema9 = ema9s.length > 0 ? ema9s[ema9s.length - 1] : currentPrice;
  const ema21 = ema21s.length > 0 ? ema21s[ema21s.length - 1] : currentPrice;
  const ema50 = ema50s.length > 0 ? ema50s[ema50s.length - 1] : currentPrice;
  const bb = bbs.length > 0 ? bbs[bbs.length - 1] : { upper: currentPrice, lower: currentPrice, middle: currentPrice };

  const btstScore = calculateBTSTScore(prices, rsi, macd, ema9, ema21, ema50, volume, bb);

  return {
    rsi,
    macd,
    ema9,
    ema21,
    ema50,
    bb,
    btstScore,
    allIndicators: {
      rsiSeries: rsis,
      macdSeries: macds,
      ema9Series: ema9s,
      ema21Series: ema21s,
      ema50Series: ema50s,
      bbSeries: bbs
    }
  };
}
