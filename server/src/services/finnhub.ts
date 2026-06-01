import { Quote, Candle } from '../types/index.js';
import { getSetting } from './db.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export async function getQuote(symbol: string): Promise<Quote> {
  const apiKey = await getSetting('finnhub_api_key');
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured in settings table');
  }

  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.statusText}`);
  }

  const data = (await response.json()) as Quote;
  // Calculate percentage change if not provided
  if (data.dp === undefined && data.pc > 0) {
    data.dp = ((data.c - data.pc) / data.pc) * 100;
  }
  return data;
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<Candle> {
  const apiKey = await getSetting('finnhub_api_key');
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured in settings table');
  }

  const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.statusText}`);
  }

  return (await response.json()) as Candle;
}

export async function searchSymbol(query: string): Promise<any[]> {
  const apiKey = await getSetting('finnhub_api_key');
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured in settings table');
  }

  const url = `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { result: any[] };
  return data.result || [];
}

export async function getMarketNews(): Promise<any[]> {
  const apiKey = await getSetting('finnhub_api_key');
  if (!apiKey) {
    return [];
  }

  const url = `${FINNHUB_BASE}/news?category=general&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  return (await response.json()) as any[];
}

export async function getCompanyNews(symbol: string): Promise<any[]> {
  const apiKey = await getSetting('finnhub_api_key');
  if (!apiKey) {
    return [];
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 14);
  
  const toStr = toDate.toISOString().split('T')[0];
  const fromStr = fromDate.toISOString().split('T')[0];
  const cleanSymbol = symbol.split('.')[0]; // Handle .JK

  const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(cleanSymbol)}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  return (await response.json()) as any[];
}
