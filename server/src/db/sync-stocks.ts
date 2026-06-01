import { pool, query, getSetting } from "../services/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// High-quality fallback stock list in case Gemini API is not configured or fails
const fallbackStocks = [
  // IDX LQ45 Components
  { symbol: "ADRO.JK", name: "Adaro Energy Indonesia Tbk", market: "IDX" },
  { symbol: "AKRA.JK", name: "AKR Corporindo Tbk", market: "IDX" },
  { symbol: "AMRT.JK", name: "Sumber Alfaria Trijaya Tbk", market: "IDX" },
  { symbol: "ANJT.JK", name: "Austindo Nusantara Jaya Tbk", market: "IDX" },
  { symbol: "ANTM.JK", name: "Aneka Tambang Tbk", market: "IDX" },
  { symbol: "ARTO.JK", name: "Bank Jago Tbk", market: "IDX" },
  { symbol: "ASII.JK", name: "Astra International Tbk", market: "IDX" },
  { symbol: "BBCA.JK", name: "Bank Central Asia Tbk", market: "IDX" },
  {
    symbol: "BBNI.JK",
    name: "Bank Negara Indonesia (Persero) Tbk",
    market: "IDX",
  },
  {
    symbol: "BBRI.JK",
    name: "Bank Rakyat Indonesia (Persero) Tbk",
    market: "IDX",
  },
  {
    symbol: "BBTN.JK",
    name: "Bank Tabungan Negara (Persero) Tbk",
    market: "IDX",
  },
  { symbol: "BDMN.JK", name: "Bank Danamon Indonesia Tbk", market: "IDX" },
  { symbol: "BMRI.JK", name: "Bank Mandiri (Persero) Tbk", market: "IDX" },
  { symbol: "BRIS.JK", name: "Bank Syariah Indonesia Tbk", market: "IDX" },
  { symbol: "BRPT.JK", name: "Barito Pacific Tbk", market: "IDX" },
  { symbol: "BUKA.JK", name: "Bukalapak.com Tbk", market: "IDX" },
  { symbol: "CPIN.JK", name: "Charoen Pokphand Indonesia Tbk", market: "IDX" },
  { symbol: "ELSA.JK", name: "Elnusa Tbk", market: "IDX" },
  { symbol: "EXCL.JK", name: "XL Axiata Tbk", market: "IDX" },
  { symbol: "GOTO.JK", name: "GoTo Gojek Tokopedia Tbk", market: "IDX" },
  { symbol: "HRUM.JK", name: "Harum Energy Tbk", market: "IDX" },
  { symbol: "ICBP.JK", name: "Indofood CBP Sukses Makmur Tbk", market: "IDX" },
  { symbol: "INCO.JK", name: "Vale Indonesia Tbk", market: "IDX" },
  { symbol: "INDF.JK", name: "Indofood Sukses Makmur Tbk", market: "IDX" },
  { symbol: "INKP.JK", name: "Indah Kiat Pulp & Paper Tbk", market: "IDX" },
  { symbol: "INTP.JK", name: "Indocement Tunggal Prakarsa Tbk", market: "IDX" },
  { symbol: "ITMG.JK", name: "Indo Tambangraya Megah Tbk", market: "IDX" },
  { symbol: "JSMR.JK", name: "Jasa Marga (Persero) Tbk", market: "IDX" },
  { symbol: "KLBF.JK", name: "Kalbe Farma Tbk", market: "IDX" },
  { symbol: "MDKA.JK", name: "Merdeka Gold Copper Tbk", market: "IDX" },
  { symbol: "MEDC.JK", name: "Medco Energi Internasional Tbk", market: "IDX" },
  { symbol: "PGAS.JK", name: "Perusahaan Gas Negara Tbk", market: "IDX" },
  { symbol: "PTBA.JK", name: "Bukit Asam Tbk", market: "IDX" },
  { symbol: "PTPP.JK", name: "PP (Persero) Tbk", market: "IDX" },
  {
    symbol: "SIDO.JK",
    name: "Industri Jamu dan Farmasi Sido Muncul Tbk",
    market: "IDX",
  },
  { symbol: "SMGR.JK", name: "Semen Indonesia (Persero) Tbk", market: "IDX" },
  { symbol: "SRTG.JK", name: "Saratoga Investama Sedaya Tbk", market: "IDX" },
  { symbol: "TINS.JK", name: "Timah Tbk", market: "IDX" },
  { symbol: "TLKM.JK", name: "Telkom Indonesia (Persero) Tbk", market: "IDX" },
  { symbol: "TOWR.JK", name: "Sarana Menara Nusantara Tbk", market: "IDX" },
  { symbol: "UNTR.JK", name: "United Tractors Tbk", market: "IDX" },
  { symbol: "UNVR.JK", name: "Unilever Indonesia Tbk", market: "IDX" },
  { symbol: "WIKA.JK", name: "Wijaya Karya (Persero) Tbk", market: "IDX" },

  // US High Liquidity Components
  { symbol: "AAPL", name: "Apple Inc.", market: "US" },
  { symbol: "MSFT", name: "Microsoft Corporation", market: "US" },
  { symbol: "NVDA", name: "NVIDIA Corporation", market: "US" },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US" },
  { symbol: "AMZN", name: "Amazon.com Inc.", market: "US" },
  { symbol: "META", name: "Meta Platforms Inc.", market: "US" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", market: "US" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", market: "US" },
  { symbol: "NFLX", name: "Netflix Inc.", market: "US" },
  { symbol: "AVGO", name: "Broadcom Inc.", market: "US" },
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
  let fetchedStocks: Array<{ symbol: string; name: string; market: string }> =
    [];
  let useFallback = false;

  const geminiApiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  if (!geminiApiKey) {
    console.warn(
      "[AI Stock Sync] gemini_api_key is not configured in database settings.",
    );
    useFallback = true;
  } else {
    try {
      console.log(
        "[AI Stock Sync] Contacting Gemini AI to query latest LQ45 and US high-liquidity stock indices...",
      );
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const prompt = `
        You are an expert financial registry system. Provide a list of the top best stock symbols based on their strong positive trends in the last 3 to 6 months. This list must include at least 30 high-performing constituents of the LQ45 index on the Indonesia Stock Exchange (IDX) and up to 15 high-liquidity stocks in the US stock market.
        
        Rules:
        - Provide at least 30 IDX stocks showing the strongest positive trends/performance over the last 3-6 months.
        - Provide up to 15 US stocks showing strong positive trends.
        - For IDX stocks: Ticker symbol must end in '.JK' (e.g., 'BBRI.JK', 'TLKM.JK'). Market value must be 'IDX'.
        - For US stocks: Ticker symbol must be standard US format (e.g., 'AAPL', 'NVDA'). Market value must be 'US'.
        
        Provide a clean JSON response ONLY. Do not wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\`.
        The JSON must be a single, flat array of objects matching this exact structure:
        [
          {
            "symbol": "BBRI.JK",
            "name": "Bank Rakyat Indonesia (Persero) Tbk",
            "market": "IDX"
          },
          {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "market": "US"
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
      
      const idxStocks = parsed.filter(s => s.market === 'IDX');
      const usStocks = parsed.filter(s => s.market === 'US').slice(0, 15);
      fetchedStocks = [...idxStocks, ...usStocks];

      console.log(
        `[AI Stock Sync] Successfully loaded ${fetchedStocks.length} symbols from Gemini AI (${idxStocks.length} IDX, ${usStocks.length} US)!`,
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

  // Write/Sync to PostgreSQL
  try {
    console.log(
      "[AI Stock Sync] Synchronizing stock registry into database...",
    );

    // Set is_active = false for existing stocks first, so we update the list of active ones
    await query("DELETE FROM stocks");

    for (const stock of fetchedStocks) {
      await query(
        `INSERT INTO stocks (symbol, name, market, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (symbol) DO UPDATE SET
           name = EXCLUDED.name,
           market = EXCLUDED.market,
           is_active = true`,
        [stock.symbol, stock.name, stock.market],
      );
    }

    // Clean up completely inactive stocks that are not in the new active list
    const activeCountRes = await query(
      "SELECT COUNT(*) FROM stocks WHERE is_active = true",
    );
    console.log(
      `[AI Stock Sync] Database synchronized successfully! Active stock count in registry: ${activeCountRes.rows[0].count}`,
    );
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
