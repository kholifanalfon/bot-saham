import { getSetting } from './db.js';

const SECTORS_BASE = 'https://api.sectors.app/api';

// A beautiful set of fallback mock IDX stocks in case the user doesn't have an API key configured yet
const MOCK_IDX_STOCKS = [
  { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia (Persero) Tbk', sector: 'Financials' },
  { symbol: 'BBCA.JK', name: 'Bank Central Asia Tbk', sector: 'Financials' },
  { symbol: 'BMRI.JK', name: 'Bank Mandiri (Persero) Tbk', sector: 'Financials' },
  { symbol: 'TLKM.JK', name: 'Telkom Indonesia (Persero) Tbk', sector: 'Infrastructure' },
  { symbol: 'ASII.JK', name: 'Astra International Tbk', sector: 'Industrials' },
  { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Technology' },
  { symbol: 'UNVR.JK', name: 'Unilever Indonesia Tbk', sector: 'Consumer Non-Cyclicals' },
  { symbol: 'ADRO.JK', name: 'Adaro Energy Indonesia Tbk', sector: 'Basic Materials' }
];

export async function getIDXStocks(): Promise<any[]> {
  const apiKey = await getSetting('sectors_api_key');
  if (!apiKey) {
    console.log('sectors_api_key not configured in database settings, using mock IDX stocks.');
    return MOCK_IDX_STOCKS;
  }

  try {
    const url = `${SECTORS_BASE}/v1/companies/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `api-key ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Sectors.app API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data as any[]) || MOCK_IDX_STOCKS;
  } catch (error) {
    console.error('Error fetching IDX stocks, falling back to mock data:', error);
    return MOCK_IDX_STOCKS;
  }
}

export async function getStockData(ticker: string): Promise<any> {
  const cleanTicker = ticker.replace('.JK', '');
  const apiKey = await getSetting('sectors_api_key');
  
  if (!apiKey) {
    console.log(`sectors_api_key not configured in database settings, returning mock fundamentals for ${cleanTicker}.`);
    return {
      ticker: cleanTicker,
      name: MOCK_IDX_STOCKS.find(s => s.symbol.startsWith(cleanTicker))?.name || 'IDX Stock',
      pe_ratio: 12.5,
      pbv_ratio: 2.1,
      market_cap: 50000000000000,
      dividend_yield: 0.045,
      revenue_growth: 0.08,
      profit_margin: 0.18
    };
  }

  try {
    const url = `${SECTORS_BASE}/v1/company/report/${cleanTicker}/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `api-key ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Sectors.app API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching sectors.app fundamentals for ${cleanTicker}:`, error);
    return {
      ticker: cleanTicker,
      name: 'IDX Stock',
      pe_ratio: 12.5,
      pbv_ratio: 2.1,
      market_cap: 50000000000000
    };
  }
}

export async function getSectorPerformance(): Promise<any[]> {
  const mockSectors = [
    { name: 'Financials', performance: 0.012 },
    { name: 'Technology', performance: -0.008 },
    { name: 'Basic Materials', performance: 0.005 },
    { name: 'Infrastructure', performance: 0.003 },
    { name: 'Industrials', performance: -0.002 }
  ];

  const apiKey = await getSetting('sectors_api_key');
  if (!apiKey) {
    return mockSectors;
  }

  try {
    const url = `${SECTORS_BASE}/v1/sectors/`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `api-key ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Sectors.app API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data as any[]) || mockSectors;
  } catch (error) {
    console.error('Error fetching sectors performance, falling back to mock:', error);
    return mockSectors;
  }
}
