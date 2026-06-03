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

export function calculateOBV(prices: number[], volumes: number[]): number[] {
  if (prices.length < 2 || prices.length !== volumes.length) return [];
  const obv = [volumes[0]];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (prices[i] < prices[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  return obv;
}

export function calculateSwingScore(
  prices: number[],
  rsiVal: number,
  macdVal: { macd?: number; signal?: number; histogram?: number } | undefined,
  ema9Val: number,
  ema21Val: number,
  ema50Val: number,
  volume: number[],
  bollingerBands: { upper?: number; lower?: number; middle?: number } | undefined
): { score: number; details: { ema: number; macd: number; rsi: number; obv: number; volume: number; bb: number } } {
  if (prices.length === 0) return { score: 0, details: { ema: 0, macd: 0, rsi: 0, obv: 0, volume: 0, bb: 0 } };
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
  const isGreenCandle = currentPrice > prevPrice;
  const aboveEma50 = currentPrice > ema50Val;

  // 1. Trend & EMA Stack (25%) - Crucial for swing trading
  let emaScore = 50;
  const aboveEma9 = currentPrice > ema9Val;
  const aboveEma21 = currentPrice > ema21Val;
  const isEmaBullishStack = ema9Val > ema21Val && ema21Val > ema50Val;

  if (aboveEma9 && aboveEma21 && aboveEma50) {
    emaScore = isEmaBullishStack ? 100 : 85;
  } else if (aboveEma21 && aboveEma50) {
    emaScore = 75; // Healthy pullback in an uptrend
  } else if (aboveEma50) {
    emaScore = 60; // Support test at EMA50
  } else {
    emaScore = 25; // Bearish phase
  }

  // 2. MACD Score (20%) - Reversals and crossovers
  let macdScore = 50;
  if (macdVal) {
    const hist = macdVal.histogram || 0;
    const macdLine = macdVal.macd || 0;
    const signalLine = macdVal.signal || 0;
    
    if (macdLine > signalLine) {
      if (macdLine >= 0) {
        macdScore = hist > 0 ? 95 : 80; // Stable uptrend momentum
      } else {
        macdScore = 85; // Strong bullish crossover from oversold territory
      }
    } else {
      // Bearish crossover
      macdScore = macdLine < 0 ? 15 : 40;
    }
  }

  // 3. RSI Score (15%) - Support/pullback zones or momentum breakouts
  let rsiScore = 50;
  if (rsiVal >= 45 && rsiVal <= 65) {
    rsiScore = aboveEma50 ? 90 : 60; // Strong swing zone in an uptrend
  } else if (rsiVal < 35) {
    rsiScore = aboveEma50 ? 85 : 40; // Oversold bounce opportunity (best if general trend is up)
  } else if (rsiVal > 70) {
    rsiScore = 30; // Overbought, high risk of cooling off
  } else {
    rsiScore = 50;
  }

  // 4. OBV Volume Accumulation Trend (25%) - Instutitional flow confirmation
  let obvScore = 50;
  const obvSeries = calculateOBV(prices, volume);
  if (obvSeries.length >= 20) {
    const obvEma5 = calculateEMA(obvSeries, 5);
    const obvEma20 = calculateEMA(obvSeries, 20);
    if (obvEma5.length > 0 && obvEma20.length > 0) {
      const lastEma5 = obvEma5[obvEma5.length - 1];
      const lastEma20 = obvEma20[obvEma20.length - 1];
      obvScore = lastEma5 > lastEma20 ? 100 : 40;
    }
  }

  // 5. Volume Confirmation Score (10%)
  let volumeScore = 50;
  if (volume.length > 5) {
    const currentVolume = volume[volume.length - 1];
    const recentVolumes = volume.slice(-6, -1);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    if (currentVolume > avgVolume * 1.3) {
      volumeScore = isGreenCandle ? 95 : 30; // High volume push up is bullish
    } else {
      volumeScore = isGreenCandle ? 70 : 45;
    }
  }

  // 6. Bollinger Bands Score (5%)
  let bbScore = 50;
  if (bollingerBands && bollingerBands.lower && bollingerBands.upper) {
    const bbRange = bollingerBands.upper - bollingerBands.lower;
    const positionPercent = (currentPrice - bollingerBands.lower) / bbRange;

    if (positionPercent <= 0.20) {
      bbScore = aboveEma50 ? 90 : 40; // Bouncing from lower band in uptrend
    } else if (positionPercent >= 0.80) {
      bbScore = isGreenCandle ? 80 : 40; // Riding upper band / breakout
    } else if (positionPercent >= 0.45 && positionPercent <= 0.55) {
      bbScore = aboveEma50 ? 75 : 50; // Mid-band support bounce
    } else {
      bbScore = 60;
    }
  }

  // Compute total weighted swing score with institutional OBV accumulation
  const totalScore =
    emaScore * 0.25 +
    macdScore * 0.20 +
    rsiScore * 0.15 +
    obvScore * 0.25 +
    volumeScore * 0.10 +
    bbScore * 0.05;

  return {
    score: Math.min(Math.max(totalScore, 0), 100),
    details: {
      ema: emaScore,
      macd: macdScore,
      rsi: rsiScore,
      obv: obvScore,
      volume: volumeScore,
      bb: bbScore
    }
  };
}

export function performFullAnalysis(prices: number[], volume: number[]) {
  if (prices.length < 50) {
    throw new Error('Not enough data to calculate core technical indicators (minimum 50 periods required)');
  }

  const rsis = calculateRSI(prices);
  const macds = calculateMACD(prices);
  const ema9s = calculateEMA(prices, 9);
  const ema20s = calculateEMA(prices, 20);
  const ema21s = calculateEMA(prices, 21);
  const ema50s = calculateEMA(prices, 50);
  const ema200s = calculateEMA(prices, 200);
  const bbs = calculateBollingerBands(prices);

  const currentPrice = prices[prices.length - 1];
  const rsi = rsis.length > 0 ? rsis[rsis.length - 1] : 50;
  const macd = macds.length > 0 ? macds[macds.length - 1] : { macd: 0, signal: 0, histogram: 0 };
  const ema9 = ema9s.length > 0 ? ema9s[ema9s.length - 1] : currentPrice;
  const ema20 = ema20s.length > 0 ? ema20s[ema20s.length - 1] : currentPrice;
  const ema21 = ema21s.length > 0 ? ema21s[ema21s.length - 1] : currentPrice;
  const ema50 = ema50s.length > 0 ? ema50s[ema50s.length - 1] : currentPrice;
  const ema200 = ema200s.length > 0 ? ema200s[ema200s.length - 1] : currentPrice;
  const bb = bbs.length > 0 ? bbs[bbs.length - 1] : { upper: currentPrice, lower: currentPrice, middle: currentPrice };

  const { score: swingScore, details: componentScores } = calculateSwingScore(prices, rsi, macd, ema9, ema21, ema50, volume, bb);

  return {
    rsi,
    macd,
    ema9,
    ema20,
    ema21,
    ema50,
    ema200,
    bb,
    swingScore,
    componentScores,
    allIndicators: {
      rsiSeries: rsis,
      macdSeries: macds,
      ema9Series: ema9s,
      ema20Series: ema20s,
      ema21Series: ema21s,
      ema50Series: ema50s,
      ema200Series: ema200s,
      bbSeries: bbs
    }
  };
}
