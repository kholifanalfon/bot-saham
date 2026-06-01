import { v4 as uuidv4 } from 'uuid';
import { AlertRule, TriggeredAlert, Quote } from '../types/index.js';
import { query } from './db.js';

export async function createAlert(
  userId: string,
  symbol: string,
  type: AlertRule['type'],
  targetValue?: number
): Promise<AlertRule> {
  const id = uuidv4();
  const cleanSymbol = symbol.toUpperCase();
  
  await query(
    `INSERT INTO alerts (id, user_id, symbol, type, value, is_triggered)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, cleanSymbol, type, targetValue || 0, false]
  );

  return {
    id,
    userId,
    symbol: cleanSymbol,
    type,
    targetValue,
    isActive: true,
    createdAt: new Date().toISOString()
  };
}

export async function getActiveAlerts(userId: string): Promise<AlertRule[]> {
  const result = await query(
    'SELECT * FROM alerts WHERE user_id = $1 AND is_triggered = false ORDER BY created_at DESC',
    [userId]
  );
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    type: row.type as any,
    targetValue: parseFloat(row.value),
    isActive: !row.is_triggered,
    createdAt: row.created_at.toISOString()
  }));
}

export async function deleteAlert(id: string, userId: string): Promise<boolean> {
  const result = await query('DELETE FROM alerts WHERE id = $1 AND user_id = $2', [id, userId]);
  return !!(result.rowCount && result.rowCount > 0);
}

export async function getTriggeredAlertsByUser(userId: string): Promise<TriggeredAlert[]> {
  const result = await query(
    'SELECT * FROM triggered_alerts WHERE user_id = $1 ORDER BY triggered_at DESC',
    [userId]
  );
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    alertId: row.alert_id,
    type: row.type,
    message: row.message,
    price: parseFloat(row.price),
    triggeredAt: row.triggered_at.toISOString(),
    isRead: row.is_read
  }));
}

export async function markAlertAsRead(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE triggered_alerts SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return !!(result.rowCount && result.rowCount > 0);
}

export async function clearUserAlerts(userId: string): Promise<void> {
  await query('DELETE FROM triggered_alerts WHERE user_id = $1', [userId]);
}

// Global engine verification routine called during price tickers
export async function checkAlerts(quotes: Record<string, Quote>): Promise<TriggeredAlert[]> {
  try {
    const rulesRes = await query('SELECT * FROM alerts WHERE is_triggered = false');
    const rules = rulesRes.rows;
    const triggered: TriggeredAlert[] = [];

    for (const rule of rules) {
      const quote = quotes[rule.symbol];
      if (!quote) continue;

      let isTriggered = false;
      let message = '';

      switch (rule.type) {
        case 'price_above':
          if (rule.value !== undefined && quote.c >= parseFloat(rule.value)) {
            isTriggered = true;
            message = `${rule.symbol} has crossed ABOVE your target of ${rule.value}. Current: ${quote.c}`;
          }
          break;
        case 'price_below':
          if (rule.value !== undefined && quote.c <= parseFloat(rule.value)) {
            isTriggered = true;
            message = `${rule.symbol} has crossed BELOW your target of ${rule.value}. Current: ${quote.c}`;
          }
          break;
      }

      if (isTriggered) {
        const triggeredId = uuidv4();
        
        // 1. Mark alert rule as triggered
        await query('UPDATE alerts SET is_triggered = true WHERE id = $1', [rule.id]);

        // 2. Insert record into triggered_alerts
        await query(
          `INSERT INTO triggered_alerts (id, user_id, symbol, alert_id, type, message, price, is_read)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            triggeredId,
            rule.user_id,
            rule.symbol,
            rule.id,
            rule.type,
            message,
            quote.c,
            false
          ]
        );

        triggered.push({
          id: triggeredId,
          userId: rule.user_id,
          symbol: rule.symbol,
          alertId: rule.id,
          type: rule.type,
          message,
          price: quote.c,
          triggeredAt: new Date().toISOString(),
          isRead: false
        });
      }
    }

    return triggered;
  } catch (error) {
    console.error('[Alert Engine] Error checking price alerts:', error);
    return [];
  }
}
