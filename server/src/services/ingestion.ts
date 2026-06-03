import { query } from "./db.js";
import {
  getHistoricalData,
  getYahooQuote,
  getHistoricalDataForDates,
} from "./yahoo-finance.js";
import { performFullAnalysis } from "./technical-analysis.js";
import { v4 as uuidv4 } from "uuid";

let isIngesting = false;

// Helper to log ingestion activity to database
export async function logIngestionActivity(params: {
  status: "success" | "error" | "running";
  triggerType: "manual" | "auto";
  symbol?: string;
  startDate?: string;
  endDate?: string;
  recordsCount?: number;
  details?: string;
}): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO ingestion_logs (id, status, trigger_type, symbol, start_date, end_date, records_count, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      params.status,
      params.triggerType,
      params.symbol || null,
      params.startDate || null,
      params.endDate || null,
      params.recordsCount || 0,
      params.details || null,
    ],
  );
  return id;
}

export async function updateIngestionLogStatus(
  id: string,
  status: "success" | "error",
  recordsCount: number,
  details?: string,
) {
  await query(
    `UPDATE ingestion_logs SET status = $1, records_count = $2, details = $3 WHERE id = $4`,
    [status, recordsCount, details || null, id],
  );
}

// Check if data for the current active trading day already exists, otherwise run ingestion
export async function checkAndTriggerIngestion(): Promise<void> {
  if (isIngesting) return;

  try {
    // Get current date/time in Asia/Jakarta (WIB) timezone
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
    });
    const todayStr = formatter.format(new Date()); // YYYY-MM-DD

    const nowJakarta = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
    );
    const currentHour = nowJakarta.getHours();
    const currentDay = nowJakarta.getDay(); // 0 = Sunday, 6 = Saturday

    // Don't trigger if it's weekend (Saturday or Sunday)
    if (currentDay === 0 || currentDay === 6) {
      return;
    }

    // Don't trigger before the market opens (before 09:00 AM WIB)
    if (currentHour < 9) {
      console.log(
        "[Ingestion] Market is not open yet (before 09:00 AM Asia/Jakarta). Skipping automatic ingestion.",
      );
      return;
    }

    // Prevent duplicate automatic runs on the same calendar day (e.g. public holidays or already up-to-date days)
    const alreadyRunToday = await query(
      `SELECT 1 FROM ingestion_logs 
       WHERE trigger_type = 'auto' 
         AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = $1::DATE 
         AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Jakarta') >= 9
       LIMIT 1`,
      [todayStr],
    );

    if (alreadyRunToday.rows.length > 0) {
      console.log(
        `[Ingestion] Automatic ingestion has already run today (${todayStr}). Skipping to prevent loop.`,
      );
      return;
    }

    // Check the latest date present in the stock data table
    const result = await query("SELECT MAX(date) FROM stock_data");
    const latestDateVal = result.rows[0]?.max;

    let needsIngestion = false;
    if (!latestDateVal) {
      // Database is empty
      needsIngestion = true;
    } else {
      // Format latest date in Asia/Jakarta timezone to compare
      const latestDateStr = formatter.format(new Date(latestDateVal));

      // If the latest stored date is not today, trigger ingestion
      if (latestDateStr !== todayStr) {
        needsIngestion = true;
      }
    }

    if (needsIngestion) {
      console.log(
        "[Ingestion] Database records are outdated or empty. Auto-triggering lazy ingestion job...",
      );
      // Run asynchronously in background so we don't block the API request
      runIngestionPipeline().catch((err) => {
        console.error(
          "[Ingestion] Error running background ingestion pipeline:",
          err,
        );
      });
    }
  } catch (error) {
    console.error("[Ingestion] Error in checkAndTriggerIngestion:", error);
  }
}

export async function runIngestionPipeline(
  targetDate?: string,
  endDate?: string,
): Promise<void> {
  if (isIngesting) {
    console.log(
      "[Ingestion] Ingestion is already running. Skipping request...",
    );
    return;
  }

  isIngesting = true;
  console.log(
    `[Ingestion] Initializing data ingestion pipeline${targetDate ? (endDate ? ` for range ${targetDate} to ${endDate}` : ` for date ${targetDate}`) : ""}...`,
  );

  const logId = await logIngestionActivity({
    status: "running",
    triggerType: targetDate ? "manual" : "auto",
    startDate: targetDate,
    endDate: endDate,
    details: targetDate
      ? endDate
        ? `Manual refresh for range ${targetDate} to ${endDate}`
        : `Manual refresh for date ${targetDate}`
      : "Lazy daily ingestion check",
  });

  try {
    // 1. Read Settings
    const settingRes = await query(
      "SELECT value FROM settings WHERE key = 'us_market_enabled'",
    );
    const usMarketEnabled = settingRes.rows[0]?.value === "true";

    // 2. Fetch Active Registered Stocks
    const stocksRes = await query(
      "SELECT * FROM stocks WHERE is_active = true",
    );
    let stocks = stocksRes.rows;

    if (!usMarketEnabled) {
      stocks = stocks.filter((s) => s.market === "IDX");
    }

    // Limit to top 80 liquid assets for performance & safety
    stocks = stocks.slice(0, 80);
    console.log(
      `[Ingestion] Found ${stocks.length} active registry symbols to ingest.`,
    );

    let successCount = 0;
    for (const stock of stocks) {
      const { symbol } = stock;
      console.log(`[Ingestion] Fetching data and analyzing ${symbol}...`);

      try {
        // A. Fetch history for technical calculations (RSI, MACD, EMAs)
        let history: any[] = [];
        if (targetDate && endDate) {
          const start = new Date(targetDate);
          const calcStart = new Date(start);
          calcStart.setDate(calcStart.getDate() - 100);
          const calcStartStr = calcStart.toISOString().split("T")[0];

          console.log(
            `[Ingestion] Fetching precise range for ${symbol} from ${calcStartStr} to ${endDate}...`,
          );
          history = await getHistoricalDataForDates(
            symbol,
            calcStartStr,
            endDate,
          );
        } else {
          history = await getHistoricalData(symbol, "3mo");
        }

        if (history.length < 50) {
          console.warn(
            `[Ingestion] Insufficient historical data for ${symbol} (minimum 50 bars required). Skipping...`,
          );
          continue;
        }

        // B. Resolve target candle properties based on whether targetDate and endDate are specified
        let targetDatesToProcess = [history[history.length - 1].date];

        if (targetDate) {
          if (endDate) {
            // Range-based daily ingestion
            targetDatesToProcess = history
              .map((h) => h.date)
              .filter((d) => d >= targetDate && d <= endDate);
          } else {
            // Single date ingestion
            targetDatesToProcess = [targetDate];
          }
        }

        if (targetDatesToProcess.length === 0) {
          console.warn(
            `[Ingestion] No target dates to process for ${symbol} in range ${targetDate} to ${endDate}. Skipping...`,
          );
          continue;
        }

        for (const tDate of targetDatesToProcess) {
          const targetIndex = history.findIndex((h) => h.date === tDate);
          if (targetIndex === -1) {
            console.warn(
              `[Ingestion] Date ${tDate} not found in history for ${symbol}. Skipping...`,
            );
            continue;
          }
          const slicedHistory = history.slice(0, targetIndex + 1);
          if (slicedHistory.length < 50) {
            console.warn(
              `[Ingestion] Insufficient historical data for ${symbol} before ${tDate}. Skipping...`,
            );
            continue;
          }
          const targetCandle = slicedHistory[slicedHistory.length - 1];
          const prevCandle = slicedHistory[slicedHistory.length - 2];

          const lastCandleDate = targetCandle.date;
          let price = 0;
          let changePercent = 0;
          let high = 0;
          let low = 0;
          let open = 0;
          let prevClose = 0;
          let volume = 0;

          // Processing range or historical specific date
          price = targetCandle.close;
          high = targetCandle.high;
          low = targetCandle.low;
          open = targetCandle.open;
          prevClose = prevCandle ? prevCandle.close : targetCandle.open;
          changePercent =
            prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
          volume = targetCandle.volume || 0;

          // C. Calculate technical indicators (RSI, MACD, EMAs) on the sliced history
          const prices = slicedHistory.map((h) => h.close);
          const volumes = slicedHistory.map((h) => h.volume);

          const analysis = performFullAnalysis(prices, volumes);
          const isNewest = lastCandleDate === history[history.length - 1].date;

          // D. Save combined raw and technical data to stock_data
          await query(
            `INSERT INTO stock_data (
               date, symbol, price, change_percent, high, low, open, previous_close, volume,
               swing_score, rsi, macd_histogram, ema9, ema21, ema50, is_active
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (date, symbol) DO UPDATE SET
               price = EXCLUDED.price,
               change_percent = EXCLUDED.change_percent,
               high = EXCLUDED.high,
               low = EXCLUDED.low,
               open = EXCLUDED.open,
               previous_close = EXCLUDED.previous_close,
               volume = EXCLUDED.volume,
               swing_score = EXCLUDED.swing_score,
               rsi = EXCLUDED.rsi,
               macd_histogram = EXCLUDED.macd_histogram,
               ema9 = EXCLUDED.ema9,
               ema21 = EXCLUDED.ema21,
               ema50 = EXCLUDED.ema50,
               is_active = EXCLUDED.is_active`,
            [
              lastCandleDate,
              symbol,
              price,
              changePercent,
              high,
              low,
              open,
              prevClose,
              volume,
              analysis.swingScore,
              analysis.rsi,
              (analysis.macd as any).histogram || 0,
              analysis.ema9,
              analysis.ema21,
              analysis.ema50,
              isNewest,
            ],
          );

          if (isNewest) {
            // Deactivate all OTHER dates for this symbol so only this newest record is active
            await query(
              `UPDATE stock_data SET is_active = false WHERE symbol = $1 AND date <> $2`,
              [symbol, lastCandleDate],
            );
          }
        }

        successCount++;
        console.log(
          `[Ingestion] Ingested and computed signals successfully for ${symbol}.`,
        );
      } catch (err) {
        console.error(
          `[Ingestion] Failed to ingest and compute data for ${symbol}:`,
          err,
        );
      }
    }

    await updateIngestionLogStatus(
      logId,
      "success",
      successCount,
      `Successfully completed ingestion for ${successCount} symbols`,
    );
    console.log(
      "[Ingestion] Ingestion pipeline execution completed beautifully.",
    );
  } catch (error: any) {
    await updateIngestionLogStatus(
      logId,
      "error",
      0,
      error.message || String(error),
    );
    console.error("[Ingestion] Fatal error in ingestion pipeline:", error);
  } finally {
    isIngesting = false;
  }
}

export async function runHistoricalIngestion(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const logId = await logIngestionActivity({
    status: "running",
    triggerType: "manual",
    symbol,
    startDate,
    endDate,
  });

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // We fetch historical data starting 100 days before the requested range to allow indicator calculation
    const calcStart = new Date(start);
    calcStart.setDate(calcStart.getDate() - 100);
    const calcStartStr = calcStart.toISOString().split("T")[0];

    console.log(
      `[Historical Ingestion] Fetching Yahoo chart data for ${symbol} from ${calcStartStr} to ${endDate}...`,
    );

    const rawData = await getHistoricalDataForDates(
      symbol,
      calcStartStr,
      endDate,
    );
    if (rawData.length === 0) {
      throw new Error(
        `No historical data found for ${symbol} in range ${calcStartStr} to ${endDate}`,
      );
    }

    const targetDates = rawData.filter((d) => {
      const dDate = new Date(d.date);
      return dDate >= start && dDate <= end;
    });

    if (targetDates.length === 0) {
      throw new Error(
        `No trading days found in the requested range ${startDate} to ${endDate} (market might be closed or weekends)`,
      );
    }

    let ingestedCount = 0;

    for (const target of targetDates) {
      const targetIndex = rawData.findIndex((d) => d.date === target.date);
      const subHistory = rawData.slice(0, targetIndex + 1);

      if (subHistory.length < 50) {
        console.warn(
          `[Historical Ingestion] Insufficient history (${subHistory.length} bars) to calculate indicators for ${target.date}. Skipping...`,
        );
        continue;
      }

      const prices = subHistory.map((h) => h.close);
      const volumes = subHistory.map((h) => h.volume);

      const analysis = performFullAnalysis(prices, volumes);

      await query(
        `INSERT INTO stock_data (
           date, symbol, price, change_percent, high, low, open, previous_close, volume,
           swing_score, rsi, macd_histogram, ema9, ema21, ema50, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE)
         ON CONFLICT (date, symbol) DO UPDATE SET
           price = EXCLUDED.price,
           change_percent = EXCLUDED.change_percent,
           high = EXCLUDED.high,
           low = EXCLUDED.low,
           open = EXCLUDED.open,
           previous_close = EXCLUDED.previous_close,
           volume = EXCLUDED.volume,
           swing_score = EXCLUDED.swing_score,
           rsi = EXCLUDED.rsi,
           macd_histogram = EXCLUDED.macd_histogram,
           ema9 = EXCLUDED.ema9,
           ema21 = EXCLUDED.ema21,
           ema50 = EXCLUDED.ema50`,
        [
          target.date,
          symbol,
          target.close,
          targetIndex > 0
            ? ((target.close - rawData[targetIndex - 1].close) /
                rawData[targetIndex - 1].close) *
              100
            : 0,
          target.high,
          target.low,
          target.open,
          targetIndex > 0 ? rawData[targetIndex - 1].close : target.open,
          target.volume,
          analysis.swingScore,
          analysis.rsi,
          (analysis.macd as any).histogram || 0,
          analysis.ema9,
          analysis.ema21,
          analysis.ema50,
        ],
      );

      ingestedCount++;
    }

    // Set the latest record in stock_data as active (is_active = true) and others for this symbol as inactive
    const latestActiveResult = await query(
      `SELECT date FROM stock_data WHERE symbol = $1 ORDER BY date DESC LIMIT 1`,
      [symbol],
    );
    if (latestActiveResult.rows.length > 0) {
      const latestDate = latestActiveResult.rows[0].date;
      await query(
        `UPDATE stock_data SET is_active = CASE WHEN date = $1 THEN TRUE ELSE FALSE END WHERE symbol = $2`,
        [latestDate, symbol],
      );
    }

    await updateIngestionLogStatus(
      logId,
      "success",
      ingestedCount,
      `Successfully ingested ${ingestedCount} daily candles for ${symbol}`,
    );
    return { success: true, count: ingestedCount };
  } catch (error: any) {
    console.error(
      `[Historical Ingestion] Ingestion failed for ${symbol}:`,
      error,
    );
    await updateIngestionLogStatus(
      logId,
      "error",
      0,
      error.message || String(error),
    );
    return { success: false, count: 0, error: error.message || String(error) };
  }
}
