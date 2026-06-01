import { pool, query } from "../services/db.js";

async function migrate() {
  const isRefresh = process.argv.includes("refresh");
  if (isRefresh) {
    console.log(
      "[Migration] Refresh option detected. Dropping existing tables...",
    );
    const tables = [
      "watchlist",
      "triggered_alerts",
      "alerts",
      "transactions",
      "portfolio",
      "stock_btst_data",
      "stock_raw_data",
      "stock_data",
      "stocks",
      "settings",
      "users",
      "ingestion_logs",
    ];
    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    console.log("[Migration] Dropped all tables successfully.");
  }

  console.log("[Migration] Running PostgreSQL database schema migration...");
  try {
    // 1. Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    // 2. Create Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create Stocks Registry Table
    await query(`
      CREATE TABLE IF NOT EXISTS stocks (
        symbol VARCHAR(20) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        market VARCHAR(10) NOT NULL, -- 'IDX' or 'US'
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create Stock Data Table with composite PK (date, symbol)
    await query(`
      CREATE TABLE IF NOT EXISTS stock_data (
        date DATE NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        change_percent NUMERIC(6, 2) NOT NULL,
        high NUMERIC(12, 2),
        low NUMERIC(12, 2),
        open NUMERIC(12, 2),
        previous_close NUMERIC(12, 2),
        volume BIGINT,
        btst_score NUMERIC(5, 2) NOT NULL,
        rsi NUMERIC(5, 2) NOT NULL,
        macd_histogram NUMERIC(10, 4) NOT NULL,
        ema9 NUMERIC(12, 2) NOT NULL,
        ema21 NUMERIC(12, 2) NOT NULL,
        ema50 NUMERIC(12, 2) NOT NULL,
        gemini_analysis TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, symbol)
      )
    `);

    // Alter table to add gemini_analysis column if it already exists
    await query(`
      ALTER TABLE stock_data 
      ADD COLUMN IF NOT EXISTS gemini_analysis TEXT
    `);

    // 6. Create Portfolio Table
    await query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        shares NUMERIC(12, 4) NOT NULL,
        avg_price NUMERIC(12, 2) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, symbol)
      )
    `);

    // 7. Create Transactions Table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        type VARCHAR(10) NOT NULL,
        shares NUMERIC(12, 4) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        date VARCHAR(30) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Create Alerts Table
    await query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        value NUMERIC(12, 2) NOT NULL,
        is_triggered BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Create Triggered Alerts Table
    await query(`
      CREATE TABLE IF NOT EXISTS triggered_alerts (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        alert_id VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    // 10. Create Watchlist Table
    await query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        user_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, symbol)
      )
    `);

    // 11. Create Ingestion Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS ingestion_logs (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        trigger_type VARCHAR(20) NOT NULL,
        symbol VARCHAR(50),
        start_date DATE,
        end_date DATE,
        records_count INTEGER DEFAULT 0,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(
      "[Migration] Database schema migration completed successfully.",
    );
  } catch (err) {
    console.error("[Migration] Critical database schema migration error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
