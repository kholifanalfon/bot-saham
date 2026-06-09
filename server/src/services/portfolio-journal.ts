import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';

export interface TradeJournal {
  id: string;
  userId: string;
  symbol: string;
  sellDate: string;
  buyDate: string;
  buyPrice: number;
  sellPrice: number;
  shares: number;
  pnlPercent: number;
  notes: string | null;
  tags: string[];
  aiTags: string[];
  createdAt: string;
  updatedAt: string;
}

function rowToJournal(row: any): TradeJournal {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    sellDate: row.sell_date,
    buyDate: row.buy_date,
    buyPrice: parseFloat(row.buy_price ?? 0),
    sellPrice: parseFloat(row.sell_price ?? 0),
    shares: parseFloat(row.shares ?? 0),
    pnlPercent: parseFloat(row.pnl_percent ?? 0),
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    aiTags: row.ai_tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getJournalsByUser(userId: string): Promise<TradeJournal[]> {
  const result = await query(
    'SELECT * FROM trade_journals WHERE user_id = $1 ORDER BY sell_date DESC',
    [userId]
  );
  return result.rows.map(rowToJournal);
}

export async function getJournalByKey(
  userId: string,
  symbol: string,
  sellDate: string,
  buyDate: string
): Promise<TradeJournal | null> {
  const result = await query(
    `SELECT * FROM trade_journals
     WHERE user_id = $1 AND symbol = $2 AND sell_date = $3 AND buy_date = $4`,
    [userId, symbol, sellDate, buyDate]
  );
  if (!result.rows.length) return null;
  return rowToJournal(result.rows[0]);
}

export async function upsertJournal(
  userId: string,
  symbol: string,
  sellDate: string,
  buyDate: string,
  data: {
    buyPrice?: number;
    sellPrice?: number;
    shares?: number;
    pnlPercent?: number;
    notes?: string | null;
    tags?: string[];
    aiTags?: string[];
  }
): Promise<TradeJournal> {
  const existing = await getJournalByKey(userId, symbol, sellDate, buyDate);

  if (existing) {
    const updatedNotes = data.notes !== undefined ? data.notes : existing.notes;
    const updatedTags = data.tags !== undefined ? data.tags : existing.tags;
    const updatedAiTags = data.aiTags !== undefined ? data.aiTags : existing.aiTags;

    await query(
      `UPDATE trade_journals
       SET notes = $1, tags = $2, ai_tags = $3, updated_at = NOW()
       WHERE id = $4`,
      [updatedNotes, updatedTags, updatedAiTags, existing.id]
    );
    return { ...existing, notes: updatedNotes, tags: updatedTags, aiTags: updatedAiTags };
  }

  const id = uuidv4();
  await query(
    `INSERT INTO trade_journals
       (id, user_id, symbol, sell_date, buy_date, buy_price, sell_price, shares, pnl_percent, notes, tags, ai_tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id, userId, symbol, sellDate, buyDate,
      data.buyPrice ?? null,
      data.sellPrice ?? null,
      data.shares ?? null,
      data.pnlPercent ?? null,
      data.notes ?? null,
      data.tags ?? [],
      data.aiTags ?? [],
    ]
  );

  const created = await getJournalByKey(userId, symbol, sellDate, buyDate);
  return created!;
}

export async function deleteJournal(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM trade_journals WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return !!(result.rowCount && result.rowCount > 0);
}

/**
 * Compute win rate per tag for analytics
 * Returns: { tag, totalTrades, wins, winRate, totalPnl, avgPnl }[]
 */
export async function getTagAnalytics(userId: string): Promise<
  { tag: string; totalTrades: number; wins: number; winRate: number; totalPnl: number; avgPnl: number }[]
> {
  const journals = await getJournalsByUser(userId);

  // Aggregate all tags (user tags + ai tags merged)
  const tagMap: Record<string, { wins: number; total: number; totalPnl: number }> = {};

  for (const j of journals) {
    const allTags = [...new Set([...j.tags, ...j.aiTags])];
    for (const tag of allTags) {
      if (!tagMap[tag]) tagMap[tag] = { wins: 0, total: 0, totalPnl: 0 };
      tagMap[tag].total++;
      tagMap[tag].totalPnl += j.pnlPercent;
      if (j.pnlPercent > 0) tagMap[tag].wins++;
    }
  }

  return Object.entries(tagMap)
    .map(([tag, { wins, total, totalPnl }]) => ({
      tag,
      totalTrades: total,
      wins,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      totalPnl,
      avgPnl: total > 0 ? totalPnl / total : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.totalTrades - a.totalTrades);
}
