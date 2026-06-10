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

export function calculateVWAP(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 20): number[] {
  const vwap: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      vwap.push(closes[i]);
      continue;
    }
    let sumTPV = 0;
    let sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp = (highs[j] + lows[j] + closes[j]) / 3;
      sumTPV += tp * volumes[j];
      sumVol += volumes[j];
    }
    vwap.push(sumVol > 0 ? sumTPV / sumVol : closes[i]);
  }
  return vwap;
}

export function detectBullishReversal(
  highs: number[],
  lows: number[],
  opens: number[],
  closes: number[]
): boolean {
  const len = closes.length;
  if (len < 2) return false;
  
  const currentClose = closes[len - 1];
  const currentOpen = opens[len - 1];
  const currentHigh = highs[len - 1];
  const currentLow = lows[len - 1];
  
  const prevClose = closes[len - 2];
  const prevOpen = opens[len - 2];
  
  const body = Math.abs(currentClose - currentOpen);
  const range = currentHigh - currentLow;
  
  const isHammer = range > 0 && (body / range < 0.3) && (Math.min(currentOpen, currentClose) - currentLow) > (range * 0.5);
  
  const isBullishEngulfing = (prevClose < prevOpen) && (currentClose > currentOpen) && (currentClose >= prevOpen) && (currentOpen <= prevClose);
  
  return isHammer || isBullishEngulfing;
}

export function calculateScalpScore(
  prices: number[],
  ema9Val: number,
  volume: number[]
): number {
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices.length > 1 ? prices.length - 2 : currentPrice;
  const isGreen = currentPrice > prevPrice;

  const emaScore = currentPrice > ema9Val ? 100 : 30;

  let volScore = 50;
  if (volume.length > 5) {
    const currentVol = volume[volume.length - 1];
    const avgVol = volume.slice(-6, -1).reduce((a, b) => a + b, 0) / 5;
    if (currentVol > avgVol * 1.5) {
      volScore = isGreen ? 100 : 40;
    } else if (currentVol > avgVol) {
      volScore = isGreen ? 80 : 50;
    } else {
      volScore = isGreen ? 60 : 45;
    }
  }

  const dailyReturn = prevPrice > 0 ? Math.abs(currentPrice - prevPrice) / prevPrice : 0;
  let volatilityScore = 50;
  if (dailyReturn > 0.015) {
    volatilityScore = isGreen ? 100 : 35;
  } else if (dailyReturn > 0.005) {
    volatilityScore = isGreen ? 80 : 50;
  } else {
    volatilityScore = 50;
  }

  return emaScore * 0.4 + volScore * 0.3 + volatilityScore * 0.3;
}

export function calculateDayScore(
  prices: number[],
  ema9Val: number,
  ema21Val: number,
  macdVal: { macd?: number; signal?: number; histogram?: number } | undefined,
  vwapVal: number
): number {
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1];

  let emaScore = 50;
  if (currentPrice > ema9Val && ema9Val > ema21Val) {
    emaScore = 100;
  } else if (currentPrice > ema21Val) {
    emaScore = 70;
  } else {
    emaScore = 30;
  }

  let macdScore = 50;
  if (macdVal) {
    const hist = macdVal.histogram || 0;
    const macdLine = macdVal.macd || 0;
    const signalLine = macdVal.signal || 0;
    if (macdLine > signalLine) {
      macdScore = hist > 0 ? 100 : 80;
    } else {
      macdScore = macdLine < 0 ? 20 : 45;
    }
  }

  const vwapScore = currentPrice >= vwapVal ? 100 : 35;

  return emaScore * 0.35 + macdScore * 0.35 + vwapScore * 0.30;
}

export function calculateSwingScore(
  prices: number[],
  rsiVal: number,
  macdVal: { macd?: number; signal?: number; histogram?: number } | undefined,
  ema50Val: number,
  ema200Val: number,
  volume: number[],
  hasBullishReversal: boolean,
  isMarketBullish: boolean = true
): number {
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
  const isGreen = currentPrice > prevPrice;

  let emaScore = 50;
  if (currentPrice > ema50Val && ema50Val > ema200Val) {
    emaScore = currentPrice > ema200Val ? 100 : 80;
  } else if (currentPrice > ema50Val) {
    emaScore = 75;
  } else if (currentPrice > ema200Val) {
    emaScore = 60;
  } else {
    emaScore = 25;
  }

  let macdScore = 50;
  if (macdVal) {
    const hist = macdVal.histogram || 0;
    const macdLine = macdVal.macd || 0;
    const signalLine = macdVal.signal || 0;
    if (macdLine > signalLine) {
      macdScore = hist > 0 ? 100 : 80;
    } else {
      macdScore = macdLine < 0 ? 20 : 45;
    }
  }

  let rsiScore = 50;
  if (rsiVal >= 45 && rsiVal <= 65) {
    rsiScore = currentPrice > ema50Val ? 95 : 60;
  } else if (rsiVal < 35) {
    rsiScore = currentPrice > ema50Val ? 90 : 40;
  } else if (rsiVal > 70) {
    rsiScore = 30;
  }

  let volScore = 50;
  if (volume.length > 5) {
    const currentVol = volume[volume.length - 1];
    const avgVol = volume.slice(-6, -1).reduce((a, b) => a + b, 0) / 5;
    if (currentVol > avgVol * 1.3) {
      volScore = isGreen ? 95 : 35;
    } else {
      volScore = isGreen ? 75 : 45;
    }
  }

  const nearSupport = Math.abs(currentPrice - ema50Val) / ema50Val < 0.03 || Math.abs(currentPrice - ema200Val) / ema200Val < 0.03;
  let reversalScore = 50;
  if (hasBullishReversal) {
    reversalScore = nearSupport ? 100 : 80;
  } else if (nearSupport && isGreen) {
    reversalScore = 70;
  }

  let totalScore = emaScore * 0.30 + macdScore * 0.20 + rsiScore * 0.20 + volScore * 0.15 + reversalScore * 0.15;

  if (!isMarketBullish) {
    totalScore = totalScore * 0.8;
  }

  return Math.min(Math.max(totalScore, 0), 100);
}

export function calculatePositionScore(
  currentPrice: number,
  ema200Val: number,
  fundamentals: { eps: number | null; per: number | null; pbv: number | null } | null
): number {
  const techScore = currentPrice > ema200Val ? 100 : 30;
  if (!fundamentals || (fundamentals.eps === null && fundamentals.per === null && fundamentals.pbv === null)) {
    return techScore;
  }

  let fundScore = 50;
  let count = 0;
  let sum = 0;

  if (fundamentals.eps !== null) {
    sum += fundamentals.eps > 0 ? 100 : 20;
    count++;
  }

  if (fundamentals.per !== null) {
    if (fundamentals.per > 0 && fundamentals.per <= 15) {
      sum += 100;
    } else if (fundamentals.per > 15 && fundamentals.per <= 25) {
      sum += 75;
    } else if (fundamentals.per > 25) {
      sum += 40;
    } else {
      sum += 15;
    }
    count++;
  }

  if (fundamentals.pbv !== null) {
    if (fundamentals.pbv > 0 && fundamentals.pbv <= 1.5) {
      sum += 100;
    } else if (fundamentals.pbv > 1.5 && fundamentals.pbv <= 3.0) {
      sum += 75;
    } else {
      sum += 40;
    }
    count++;
  }

  if (count > 0) {
    fundScore = sum / count;
  }

  return Math.min(Math.max(techScore * 0.4 + fundScore * 0.6, 0), 100);
}

export function performFullAnalysis(
  highs: number[],
  lows: number[],
  closes: number[],
  volume: number[],
  isMarketBullish: boolean = true,
  fundamentals: { eps: number | null; per: number | null; pbv: number | null } | null = null,
  opens?: number[]
) {
  if (closes.length < 50) {
    throw new Error('Not enough data to calculate core technical indicators (minimum 50 periods required)');
  }

  const prices = closes;
  const openPrices = opens || closes;
  const rsis = calculateRSI(prices);
  const macds = calculateMACD(prices);
  const ema9s = calculateEMA(prices, 9);
  const ema20s = calculateEMA(prices, 20);
  const ema21s = calculateEMA(prices, 21);
  const ema50s = calculateEMA(prices, 50);
  const ema200s = calculateEMA(prices, 200);
  const bbs = calculateBollingerBands(prices);
  
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

  const vwaps = calculateVWAP(highs, lows, closes, volume);
  const currentVwap = vwaps.length > 0 ? vwaps[vwaps.length - 1] : currentPrice;

  const hasBullishReversal = detectBullishReversal(highs, lows, openPrices, closes);

  const scalpScore = calculateScalpScore(prices, ema9, volume);
  const dayScore = calculateDayScore(prices, ema9, ema21, macd, currentVwap);
  const swingScore = calculateSwingScore(prices, rsi, macd, ema50, ema200, volume, hasBullishReversal, isMarketBullish);
  const positionScore = calculatePositionScore(currentPrice, ema200, fundamentals);

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
    vwap: currentVwap,
    scalpScore,
    dayScore,
    swingScore,
    positionScore,
    allIndicators: {
      rsiSeries: rsis,
      macdSeries: macds,
      ema9Series: ema9s,
      ema20Series: ema20s,
      ema21Series: ema21s,
      ema50Series: ema50s,
      ema200Series: ema200s,
      bbSeries: bbs,
      adxSeries: adxSeries,
      vwapSeries: vwaps
    }
  };
}
