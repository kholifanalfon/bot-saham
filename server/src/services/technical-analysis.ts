import { RSI, MACD, EMA, BollingerBands, ADX } from 'technicalindicators';

export function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14) {
  if (highs.length <= period) return [];
  return ADX.calculate({ high: highs, low: lows, close: closes, period });
}

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
  bollingerBands: { upper?: number; lower?: number; middle?: number } | undefined,
  adxVal: number = 25,
  isMarketBullish: boolean = true
): { score: number; details: { ema: number; macd: number; rsi: number; obv: number; volume: number; bb: number } } {
  if (prices.length === 0) return { score: 0, details: { ema: 0, macd: 0, rsi: 0, obv: 0, volume: 0, bb: 0 } };
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
  const isGreenCandle = currentPrice > prevPrice;
  const aboveEma50 = currentPrice > ema50Val;

  // --- Anti-Manipulation: Cap volume spikes at 5x of 5-day average ---
  let sanitizedVolume = volume;
  if (volume.length > 5) {
    const recentAvg = volume.slice(-6, -1).reduce((a, b) => a + b, 0) / 5;
    const cap = recentAvg * 5;
    sanitizedVolume = volume.map((v) => Math.min(v, cap));
  }

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

  // 2. MACD Score (15%) — weight reduced from 20% to mitigate multicollinearity with EMA
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

  // 4. OBV Volume Accumulation Trend (25%) - Institutional flow confirmation
  // Uses sanitized (anti-manipulation) volume
  let obvScore = 50;
  const obvSeries = calculateOBV(prices, sanitizedVolume);
  if (obvSeries.length >= 20) {
    const obvEma5 = calculateEMA(obvSeries, 5);
    const obvEma20 = calculateEMA(obvSeries, 20);
    if (obvEma5.length > 0 && obvEma20.length > 0) {
      const lastEma5 = obvEma5[obvEma5.length - 1];
      const lastEma20 = obvEma20[obvEma20.length - 1];
      obvScore = lastEma5 > lastEma20 ? 100 : 40;
    }
  }

  // 5. Volume Confirmation Score (10%) - Uses sanitized volume
  let volumeScore = 50;
  if (sanitizedVolume.length > 5) {
    const currentVolume = sanitizedVolume[sanitizedVolume.length - 1];
    const recentVolumes = sanitizedVolume.slice(-6, -1);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    if (currentVolume > avgVolume * 1.3) {
      volumeScore = isGreenCandle ? 95 : 30; // High volume push up is bullish
    } else {
      volumeScore = isGreenCandle ? 70 : 45;
    }
  }

  // 6. Bollinger Bands Score (10%) — weight raised from 5% to 10%; now includes Squeeze detection
  let bbScore = 50;
  if (bollingerBands && bollingerBands.lower != null && bollingerBands.upper != null) {
    const bbRange = bollingerBands.upper - bollingerBands.lower;
    const positionPercent = bbRange > 0 ? (currentPrice - bollingerBands.lower) / bbRange : 0.5;

    // Squeeze detection: bandwidth < 3% of middle band = tight consolidation before breakout
    const midBand = bollingerBands.middle ?? ((bollingerBands.upper + bollingerBands.lower) / 2);
    const isSqueeze = midBand > 0 && (bbRange / midBand) < 0.03;

    if (positionPercent <= 0.20) {
      // Near lower band
      if (isSqueeze && aboveEma50) {
        bbScore = 95; // Squeeze + lower band + uptrend = high-probability coiled spring
      } else {
        bbScore = aboveEma50 ? 90 : 40; // Bouncing from lower band in uptrend
      }
    } else if (positionPercent >= 0.45 && positionPercent <= 0.55) {
      // Near mid-band
      if (isSqueeze && aboveEma50) {
        bbScore = 90; // Squeeze + mid-band hold in uptrend = breakout imminent
      } else {
        bbScore = aboveEma50 ? 75 : 50; // Mid-band support bounce
      }
    } else if (positionPercent >= 0.80) {
      // Near upper band — riding or breaking out
      bbScore = isGreenCandle ? 80 : 40;
    } else {
      bbScore = 60;
    }
  }

  // --- Compute total weighted swing score ---
  // Weights: EMA 25% | MACD 15% | RSI 15% | OBV 25% | Volume 10% | BB 10% = 100%
  let totalScore =
    emaScore * 0.25 +
    macdScore * 0.15 +
    rsiScore * 0.15 +
    obvScore * 0.25 +
    volumeScore * 0.10 +
    bbScore * 0.10;

  // --- Filter #1: ADX Whipsaw Guard ---
  // If ADX < 20, the market is trending too weakly (sideways/choppy). Cap max score at 60.
  if (adxVal < 20) {
    totalScore = Math.min(totalScore, 60);
  }

  // --- Filter #2: Market Regime Penalty ---
  // If macro market is bearish (e.g. IHSG < MA200), apply a 20% score penalty.
  if (!isMarketBullish) {
    totalScore = totalScore * 0.8;
  }

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

export function performFullAnalysis(
  highs: number[],
  lows: number[],
  closes: number[],
  volume: number[],
  isMarketBullish: boolean = true
) {
  if (closes.length < 50) {
    throw new Error('Not enough data to calculate core technical indicators (minimum 50 periods required)');
  }

  const prices = closes; // For backwards compatibility inside function
  const rsis = calculateRSI(prices);
  const macds = calculateMACD(prices);
  const ema9s = calculateEMA(prices, 9);
  const ema20s = calculateEMA(prices, 20);
  const ema21s = calculateEMA(prices, 21);
  const ema50s = calculateEMA(prices, 50);
  const ema200s = calculateEMA(prices, 200);
  const bbs = calculateBollingerBands(prices);
  
  // Calculate ADX
  const adxSeries = calculateADX(highs, lows, closes);
  const currentAdx = adxSeries.length > 0 ? adxSeries[adxSeries.length - 1].adx || 25 : 25;

  const currentPrice = prices[prices.length - 1];
  const rsi = rsis.length > 0 ? rsis[rsis.length - 1] : 50;
  const macd = macds.length > 0 ? macds[macds.length - 1] : { macd: 0, signal: 0, histogram: 0 };
  const ema9 = ema9s.length > 0 ? ema9s[ema9s.length - 1] : currentPrice;
  const ema20 = ema20s.length > 0 ? ema20s[ema20s.length - 1] : currentPrice;
  const ema21 = ema21s.length > 0 ? ema21s[ema21s.length - 1] : currentPrice;
  const ema50 = ema50s.length > 0 ? ema50s[ema50s.length - 1] : currentPrice;
  const ema200 = ema200s.length > 0 ? ema200s[ema200s.length - 1] : currentPrice;
  const bb = bbs.length > 0 ? bbs[bbs.length - 1] : { upper: currentPrice, lower: currentPrice, middle: currentPrice };

  const { score: swingScore, details: componentScores } = calculateSwingScore(
    prices, rsi, macd, ema9, ema21, ema50, volume, bb, currentAdx, isMarketBullish
  );

  return {
    rsi,
    macd,
    ema9,
    ema20,
    ema21,
    ema50,
    ema200,
    bb,
    adx: currentAdx,
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
      bbSeries: bbs,
      adxSeries: adxSeries
    }
  };
}
