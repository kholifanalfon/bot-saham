import { v4 as uuidv4 } from 'uuid';
import { Transaction, Holding } from '../types/index.js';
import { query } from './db.js';
import { getYahooQuote } from './yahoo-finance.js';

export async function getTransactions(): Promise<Transaction[]> {
  const result = await query('SELECT * FROM transactions');
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    type: row.type as 'buy' | 'sell',
    shares: parseFloat(row.shares),
    price: parseFloat(row.price),
    date: row.date,
    notes: row.notes
  }));
}

export async function getTransactionsByUser(userId: string): Promise<Transaction[]> {
  const result = await query('SELECT * FROM transactions WHERE user_id = $1', [userId]);
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    type: row.type as 'buy' | 'sell',
    shares: parseFloat(row.shares),
    price: parseFloat(row.price),
    date: row.date,
    notes: row.notes
  }));
}

export async function addTransaction(
  userId: string,
  symbol: string,
  type: 'buy' | 'sell',
  shares: number,
  price: number,
  date: string,
  notes?: string
): Promise<Transaction> {
  const id = uuidv4();
  const cleanSymbol = symbol.toUpperCase();
  
  await query(
    `INSERT INTO transactions (id, user_id, symbol, type, shares, price, date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, userId, cleanSymbol, type, shares, price, date, notes || null]
  );

  return {
    id,
    userId,
    symbol: cleanSymbol,
    type,
    shares,
    price,
    date,
    notes
  };
}

export async function deleteTransaction(id: string, userId: string): Promise<boolean> {
  const result = await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  return !!(result.rowCount && result.rowCount > 0);
}

export async function getPortfolioHoldings(userId: string): Promise<{ holdings: Holding[]; totalPnl: number; totalValue: number; winRate: number }> {
  const userTx = await getTransactionsByUser(userId);
  const holdingsMap: Record<string, { totalShares: number; totalCost: number }> = {};

  // Sort transactions chronologically
  userTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const tx of userTx) {
    const sym = tx.symbol;
    if (!holdingsMap[sym]) {
      holdingsMap[sym] = { totalShares: 0, totalCost: 0 };
    }

    if (tx.type === 'buy') {
      holdingsMap[sym].totalShares += tx.shares;
      holdingsMap[sym].totalCost += tx.shares * tx.price;
    } else if (tx.type === 'sell') {
      if (holdingsMap[sym].totalShares > 0) {
        const avgPrice = holdingsMap[sym].totalCost / holdingsMap[sym].totalShares;
        holdingsMap[sym].totalShares = Math.max(0, holdingsMap[sym].totalShares - tx.shares);
        holdingsMap[sym].totalCost = holdingsMap[sym].totalShares * avgPrice;
      }
    }
  }

  const holdings: Holding[] = [];
  let totalValue = 0;
  let totalCost = 0;

  // Resolve current prices for active holdings in parallel
  const activeSymbols = Object.keys(holdingsMap).filter((sym) => holdingsMap[sym].totalShares > 0);
  const quotesMap: Record<string, number> = {};

  await Promise.all(
    activeSymbols.map(async (sym) => {
      try {
        const quote = await getYahooQuote(sym);
        quotesMap[sym] = quote.c;
      } catch (error) {
        console.error(`Error loading real-time price in portfolio for ${sym}:`, error);
        quotesMap[sym] = holdingsMap[sym].totalCost / holdingsMap[sym].totalShares;
      }
    })
  );

  for (const sym of activeSymbols) {
    const { totalShares, totalCost: cost } = holdingsMap[sym];
    const currentPrice = quotesMap[sym];
    const avgPrice = totalShares > 0 ? cost / totalShares : 0;
    const pnl = (currentPrice - avgPrice) * totalShares;
    const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

    const portRes = await query('SELECT gemini_analysis FROM portfolio WHERE user_id = $1 AND symbol = $2', [userId, sym]);
    const geminiAnalysis = portRes.rowCount && portRes.rows[0].gemini_analysis ? JSON.parse(portRes.rows[0].gemini_analysis) : null;

    holdings.push({
      symbol: sym,
      shares: totalShares,
      avgPrice,
      currentPrice,
      pnl,
      pnlPercent,
      geminiAnalysis
    });

    totalValue += totalShares * currentPrice;
    totalCost += cost;
  }

  let successfulTrades = 0;
  let totalTrades = 0;

  for (const sym of Object.keys(holdingsMap)) {
    const { totalShares, totalCost: cost } = holdingsMap[sym];
    if (totalShares > 0) {
      const avgPrice = cost / totalShares;
      const currentPrice = quotesMap[sym] || avgPrice;
      totalTrades++;
      if (currentPrice > avgPrice) {
        successfulTrades++;
      }
    }
  }

  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

  return {
    holdings,
    totalValue,
    totalPnl: totalValue - totalCost,
    winRate
  };
}
