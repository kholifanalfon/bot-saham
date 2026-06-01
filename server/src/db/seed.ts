import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pool, query } from "../services/db.js";

async function seed() {
  const isRefresh = process.argv.includes("refresh");
  if (isRefresh) {
    console.log(
      "[Seeder] Refresh option detected. Cleaning up existing seed tables...",
    );
    await query("DELETE FROM settings");
    await query("DELETE FROM users");
    console.log("[Seeder] Cleaned target seed tables successfully.");
  }

  console.log("[Seeder] Running database seeders...");
  try {
    // 1. Insert default settings
    console.log("[Seeder] Seeding settings...");
    await query(`
      INSERT INTO settings (key, value)
      VALUES ('us_market_enabled', 'false')
      ON CONFLICT (key) DO NOTHING
    `);

    const apiKeys = [
      { key: "finnhub_api_key", value: process.env.FINNHUB_API_KEY || "" },
      { key: "sectors_api_key", value: process.env.SECTORS_API_KEY || "" },
      { key: "gemini_api_key", value: process.env.GEMINI_API_KEY || "" },
      { key: "gemini_model", value: "gemini-3.1-flash-lite" },
      { key: "btst_tp_percent", value: "2.0" },
      { key: "btst_sl_percent", value: "-2.0" }
    ];

    for (const keyPair of apiKeys) {
      await query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [keyPair.key, keyPair.value],
      );
    }

    // 2. Seeding default users
    console.log("[Seeder] Seeding default user accounts...");
    const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
    const userPasswordHash = await bcrypt.hash("Trader123!", 12);

    await query(
      `INSERT INTO users (id, email, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [
        uuidv4(),
        "admin@botsaham.com",
        "System Admin",
        "admin",
        adminPasswordHash,
        true,
      ],
    );

    await query(
      `INSERT INTO users (id, email, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [
        uuidv4(),
        "trader@botsaham.com",
        "Demo Trader",
        "user",
        userPasswordHash,
        true,
      ],
    );

    console.log("[Seeder] Database seeding completed successfully.");
  } catch (err) {
    console.error("[Seeder] Critical database seeding error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
