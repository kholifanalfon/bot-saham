import { pool, query, getSetting } from "../services/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// High-quality fallback stock list in case Gemini API is not configured or fails
// High-quality fallback stock list in case Gemini API is not configured or fails
const fallbackStocks = [
  // IDX LQ45 Components
  {
    symbol: "ADRO.JK",
    name: "Adaro Energy Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "AKRA.JK",
    name: "AKR Corporindo Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "AMRT.JK",
    name: "Sumber Alfaria Trijaya Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ANJT.JK",
    name: "Austindo Nusantara Jaya Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ANTM.JK",
    name: "Aneka Tambang Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ARTO.JK",
    name: "Bank Jago Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ASII.JK",
    name: "Astra International Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BBCA.JK",
    name: "Bank Central Asia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BBNI.JK",
    name: "Bank Negara Indonesia (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BBRI.JK",
    name: "Bank Rakyat Indonesia (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BBTN.JK",
    name: "Bank Tabungan Negara (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BDMN.JK",
    name: "Bank Danamon Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BMRI.JK",
    name: "Bank Mandiri (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BRIS.JK",
    name: "Bank Syariah Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BRPT.JK",
    name: "Barito Pacific Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "BUKA.JK",
    name: "Bukalapak.com Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "CPIN.JK",
    name: "Charoen Pokphand Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  { symbol: "ELSA.JK", name: "Elnusa Tbk", market: "IDX", category: "default" },
  {
    symbol: "EXCL.JK",
    name: "XL Axiata Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "GOTO.JK",
    name: "GoTo Gojek Tokopedia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "HRUM.JK",
    name: "Harum Energy Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ICBP.JK",
    name: "Indofood CBP Sukses Makmur Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "INCO.JK",
    name: "Vale Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "INDF.JK",
    name: "Indofood Sukses Makmur Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "INKP.JK",
    name: "Indah Kiat Pulp & Paper Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "INTP.JK",
    name: "Indocement Tunggal Prakarsa Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ITMG.JK",
    name: "Indo Tambangraya Megah Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "JSMR.JK",
    name: "Jasa Marga (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "KLBF.JK",
    name: "Kalbe Farma Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "MDKA.JK",
    name: "Merdeka Gold Copper Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "MEDC.JK",
    name: "Medco Energi Internasional Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "PGAS.JK",
    name: "Perusahaan Gas Negara Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "PTBA.JK",
    name: "Bukit Asam Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "PTPP.JK",
    name: "PP (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "SIDO.JK",
    name: "Industri Jamu dan Farmasi Sido Muncul Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "SMGR.JK",
    name: "Semen Indonesia (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "SRTG.JK",
    name: "Saratoga Investama Sedaya Tbk",
    market: "IDX",
    category: "default",
  },
  { symbol: "TINS.JK", name: "Timah Tbk", market: "IDX", category: "default" },
  {
    symbol: "TLKM.JK",
    name: "Telkom Indonesia (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "TOWR.JK",
    name: "Sarana Menara Nusantara Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "UNTR.JK",
    name: "United Tractors Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "UNVR.JK",
    name: "Unilever Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "WIKA.JK",
    name: "Wijaya Karya (Persero) Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "ACES.JK",
    name: "Aspirasi Hidup Indonesia Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "MYOR.JK",
    name: "Mayora Indah Tbk",
    market: "IDX",
    category: "default",
  },
  {
    symbol: "MAPA.JK",
    name: "Map Aktif Adiperkasa Tbk",
    market: "IDX",
    category: "default",
  },

  // US High Liquidity Components
  { symbol: "AAPL", name: "Apple Inc.", market: "US", category: "default" },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    market: "US",
    category: "default",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    market: "US",
    category: "default",
  },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US", category: "default" },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    market: "US",
    category: "default",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    market: "US",
    category: "default",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc. (Class A)",
    market: "US",
    category: "default",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices Inc.",
    market: "US",
    category: "default",
  },
  { symbol: "NFLX", name: "Netflix Inc.", market: "US", category: "default" },
  { symbol: "AVGO", name: "Broadcom Inc.", market: "US", category: "default" },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    market: "US",
    category: "default",
  },
  {
    symbol: "BAC",
    name: "Bank of America Corporation",
    market: "US",
    category: "default",
  },
  { symbol: "V", name: "Visa Inc.", market: "US", category: "default" },
  {
    symbol: "MA",
    name: "Mastercard Incorporated",
    market: "US",
    category: "default",
  },
  {
    symbol: "COST",
    name: "Costco Wholesale Corporation",
    market: "US",
    category: "default",
  },
  { symbol: "WMT", name: "Walmart Inc.", market: "US", category: "default" },
  { symbol: "PEP", name: "PepsiCo Inc.", market: "US", category: "default" },
  {
    symbol: "KO",
    name: "The Coca-Cola Company",
    market: "US",
    category: "default",
  },
  {
    symbol: "DIS",
    name: "The Walt Disney Company",
    market: "US",
    category: "default",
  },
  { symbol: "CRM", name: "Salesforce Inc.", market: "US", category: "default" },
];

import readline from "readline";

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const clean = answer.trim().toLowerCase();
      // Default to true (Y) if user just presses Enter
      resolve(clean === "y" || clean === "yes" || clean === "");
    });
  });
}

async function syncStocks() {
  console.log("[AI Stock Sync] Starting AI stock registry synchronization...");
  let fetchedStocks: Array<{
    symbol: string;
    name: string;
    market: string;
    category: string;
  }> = [];
  let useFallback = false;

  const geminiApiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";
  const geminiIdxIndices =
    (await getSetting("gemini_idx_indices")) || "LQ45, IDX30, SMC Liquid";

  if (!geminiApiKey) {
    console.warn(
      "[AI Stock Sync] gemini_api_key is not configured in database settings.",
    );
    useFallback = true;
  } else {
    try {
      console.log(
        "[AI Stock Sync] Contacting Gemini AI to query latest target indices and US high-liquidity stock indices...",
      );
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const prompt = `
You are an elite swing trading strategist and quantitative analyst. Generate a curated stock registry for a swing trading screener system.

Your output must contain THREE categories of stocks:

---

## CATEGORY 1: IDX Liquid Blue-Chip (45 stocks)
Select exactly 45 stocks from the ${geminiIdxIndices} indices on the Indonesia Stock Exchange (IDX).
- Must be highly liquid, blue-chip or strong mid-cap stocks.
- Diverse sectors: Financials, Technology, Consumer, Energy, Mining, Healthcare, Infrastructure.
- Ticker MUST end with '.JK' (e.g., 'BBCA.JK'). Market = "IDX".

## CATEGORY 2: US High-Liquidity (20 stocks)
Select exactly 20 S&P 500 / Nasdaq 100 stocks with consistently high volume and volatility suitable for swing trading.
- Ticker in standard US format (e.g., 'AAPL'). Market = "US".

## CATEGORY 3: Today's Swing Trading Profit Candidates (20 stocks)
Select exactly 20 ADDITIONAL stocks (target: 15 IDX + 5 US) that show HIGH PROBABILITY swing trading setups RIGHT NOW.

**CRITICAL EXCLUSION RULE — STRICTLY ENFORCED:**
The stocks in Category 3 MUST be completely different symbols from those already selected in Category 1 and Category 2.
Do NOT repeat any symbol that appears in Category 1 or Category 2.
If you already picked BBCA.JK or TLKM.JK in Category 1, those symbols CANNOT appear in Category 3.
If you already picked AAPL or NVDA in Category 2, those symbols CANNOT appear in Category 3.
Choose from DIFFERENT companies — smaller caps, sector plays, or strong mid-caps not in the main blue-chip list.

Selection criteria for Category 3 (one or more must apply):
- Recently broke out above a key resistance or moving average (EMA 21/50).
- Showing bullish MACD crossover with rising volume.
- In a healthy pullback/retracement to EMA support after an established uptrend (ideal swing re-entry).
- Coming out of an oversold RSI zone (30-45) while price is still above EMA50.
- Strong sector momentum or positive catalyst (earnings beat, index inclusion, policy tailwind, govt project win).

Mark these with "category": "swing_candidate" in the JSON. All other stocks use "category": "core".

---

RULES (apply to ALL stocks):
- DO NOT hallucinate ticker symbols. Only provide real, verified, actively traded tickers.
- IDX tickers MUST end in '.JK'. US tickers use standard format.
- Ensure company names accurately match ticker symbols.
- NO duplicate symbols anywhere in the entire output — each symbol must be unique across all 3 categories.
- Total output: exactly 85 stocks (45 IDX core + 20 US core + 20 swing candidates).

OUTPUT FORMAT: Return ONLY a clean JSON array. No markdown code blocks, no explanation text.
Each object must have exactly these fields:
[
  {
    "symbol": "BBRI.JK",
    "name": "Bank Rakyat Indonesia (Persero) Tbk",
    "market": "IDX",
    "category": "core"
  },
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "market": "US",
    "category": "core"
  },
  {
    "symbol": "ISAT.JK",
    "name": "Indosat Ooredoo Hutchison Tbk",
    "market": "IDX",
    "category": "swing_candidate"
  }
]
      `;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();

      // Clean potential JSON markdown blocks if Gemini wraps them
      const cleanJsonStr = rawText
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/, "")
        .trim();

      const parsed = JSON.parse(cleanJsonStr);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(
          "Gemini response parsed to an empty registry or non-array object.",
        );
      }

      const idxStocks = parsed.filter(
        (s) => s.market === "IDX" && s.category !== "swing_candidate",
      );
      const usStocks = parsed
        .filter((s) => s.market === "US" && s.category !== "swing_candidate")
        .slice(0, 20);

      // Build a set of all core symbols for deduplication
      const coreSymbols = new Set([
        ...idxStocks.map((s: any) => s.symbol),
        ...usStocks.map((s: any) => s.symbol),
      ]);

      const swingCandidatesRaw = parsed
        .filter((s) => s.category === "swing_candidate")
        .slice(0, 20);

      // Safety net: remove any swing_candidate that duplicates a core symbol
      const swingCandidates = swingCandidatesRaw.filter((s: any) => {
        if (coreSymbols.has(s.symbol)) {
          console.warn(
            `[AI Stock Sync] ⚠️  Duplicate detected and removed from swing_candidates: ${s.symbol} (already in core list)`,
          );
          return false;
        }
        return true;
      });

      // Ensure all stocks have the category field set
      const normalizedCore = [...idxStocks, ...usStocks].map((s) => ({
        ...s,
        category: "core",
      }));
      const normalizedSwing = swingCandidates.map((s) => ({
        ...s,
        category: "swing_candidate",
      }));
      fetchedStocks = [...normalizedCore, ...normalizedSwing];

      console.log(
        `[AI Stock Sync] Successfully loaded ${fetchedStocks.length} symbols from Gemini AI:`,
      );
      console.log(`  ↳ ${idxStocks.length} IDX core stocks`);
      console.log(`  ↳ ${usStocks.length} US core stocks`);
      console.log(
        `  ↳ ${normalizedSwing.length} swing trading candidates (today's profit setups):`,
      );
      normalizedSwing.forEach((s) =>
        console.log(`     🎯 ${s.symbol} — ${s.name} (${s.market})`),
      );
    } catch (err: any) {
      console.error(
        "[AI Stock Sync] Gemini query failed or returned invalid JSON:",
        err.message || err,
      );
      useFallback = true;
    }
  }

  if (useFallback) {
    console.log("\n======================================================");
    const proceed = await askConfirmation(
      "⚠️  [Pemberitahuan] API Gemini gagal atau tidak dikonfigurasi.\nApakah Anda ingin menggunakan daftar cadangan likuid (53 Saham LQ45 + US)? [Y/n]: ",
    );
    console.log("======================================================\n");

    if (!proceed) {
      console.log(
        "[AI Stock Sync] Batalkan sinkronisasi atas permintaan pengguna. Database tidak diubah.",
      );
      await pool.end();
      process.exit(0);
    }

    console.log(
      "[AI Stock Sync] Menggunakan daftar cadangan (fallback stocks)...",
    );
    fetchedStocks = fallbackStocks;
  }

  // Write/Sync to PostgreSQL — pure UPSERT, no deletion
  try {
    console.log(
      "[AI Stock Sync] Synchronizing stock registry into database (upsert only — no data will be deleted)...",
    );

    let inserted = 0;
    let updated = 0;

    for (const stock of fetchedStocks) {
      // Check if symbol already exists
      const existing = await query(
        "SELECT symbol FROM stocks WHERE symbol = $1",
        [stock.symbol],
      );

      await query(
        `INSERT INTO stocks (symbol, name, market, is_active, category)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT (symbol) DO UPDATE SET
           name = EXCLUDED.name,
           market = EXCLUDED.market,
           is_active = true,
           category = EXCLUDED.category`,
        [stock.symbol, stock.name, stock.market, stock.category || "core"],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        updated++;
      } else {
        inserted++;
      }
    }

    const activeCountRes = await query(
      "SELECT COUNT(*) FROM stocks WHERE is_active = true",
    );
    const swingCountRes = await query(
      "SELECT COUNT(*) FROM stocks WHERE is_active = true AND category = 'swing_candidate'",
    );
    console.log(`[AI Stock Sync] Database synchronized successfully!`);
    console.log(`  ↳ Inserted (new): ${inserted} stocks`);
    console.log(`  ↳ Updated (existing): ${updated} stocks`);
    console.log(`  ↳ Total active stocks: ${activeCountRes.rows[0].count}`);
    console.log(`  ↳ Swing trading candidates: ${swingCountRes.rows[0].count}`);

  } catch (dbErr) {
    console.error(
      "[AI Stock Sync] Database error during stock synchronization:",
      dbErr,
    );
    process.exit(1);
  } finally {
    await pool.end();
  }
}

syncStocks();
