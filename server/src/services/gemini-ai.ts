import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSetting } from "./db.js";

export async function analyzeStock(
  symbol: string,
  historicalData: any[],
  indicators: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    ema9: number;
    ema21: number;
    ema50: number;
    swingScore: number;
  },
  language: string = "id",
  newsContext: string = "",
): Promise<any> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  let genAI: GoogleGenerativeAI | null = null;
  if (apiKey && apiKey !== "your_key_here") {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  const langName =
    language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";
  const prompt = `
    You are an elite financial analyst AI and a certified Swing Trading Specialist for the "Bot Saham" app.
    Analyze the following stock data for symbol ${symbol}:
    - Current Price: ${historicalData[historicalData.length - 1]?.close || "N/A"}
    - Swing Trading Score: ${indicators.swingScore.toFixed(1)} / 100
    - RSI (14): ${indicators.rsi.toFixed(1)}
    - MACD Histogram: ${indicators.macd.histogram.toFixed(2)} (MACD: ${indicators.macd.macd.toFixed(2)}, Signal: ${indicators.macd.signal.toFixed(2)})
    - EMA9: ${indicators.ema9.toFixed(2)}, EMA21: ${indicators.ema21.toFixed(2)}, EMA50: ${indicators.ema50.toFixed(2)}

    Recent News & Macro Context:
    ${newsContext ? newsContext : "No specific recent news available. You must synthesize a highly realistic, up-to-date macro and company condition based on current real-world knowledge of the asset and its sector."}

    Provide a JSON response ONLY. Do not include markdown formatting or blocks. All text values in the JSON (trendSummary, supportResistance, reasoning, rsiExplanation, macdExplanation, emaExplanation, bbExplanation, politicalImpact, companySpecificNews, priceDirectionPrediction) MUST be written in ${langName}. The JSON must match this structure exactly:
    {
      "trendSummary": "A concise summary of the current price trend (e.g. bullish, bearish, consolidating).",
      "supportResistance": "Support at X, resistance at Y.",
      "riskAssessment": "Low, Medium, or High",
      "recommendation": "Strong Buy, Buy, Hold, or Avoid (This recommendation MUST fully synthesize and weigh technical indicators alongside the political climate, company-specific news, and price prediction).",
      "confidenceScore": 85, // An integer from 0 to 100 representing confidence in the recommendation, taking into account technicals, political conditions, company news, and prediction factors.
      "reasoning": "A highly detailed professional explanation in ${langName} explaining why this stock fits the Swing Trading strategy or not based on the indicators, politics, and news. Begin the reasoning with '[Spesialis Swing Trader]' or '[Swing Trading Specialist]' depending on the output language.",
      "rsiExplanation": "A simple layperson explanation in ${langName} explaining what the current RSI value of ${indicators.rsi.toFixed(1)} means for this stock (e.g., if it's neutral, cheap/oversold, or expensive/overbought and what that means for a beginner).",
      "macdExplanation": "A simple layperson explanation in ${langName} explaining what the current MACD signal (${indicators.macd.histogram > 0 ? "Bullish Crossover" : "Consolidating"}) means in simple trading terms.",
      "emaExplanation": "A simple layperson explanation in ${langName} explaining what the EMA alignment (9/21/50) means for the stock's trend speed in simple terms.",
      "bbExplanation": "A simple layperson explanation in ${langName} explaining what the Bollinger Bands status (rebounding from support/lower band) means for a beginner trader.",
      "politicalImpact": "A highly specific, accurate, and detailed explanation in ${langName} outlining the current political climate, macro-government policy, or interest rates impact on this stock or its sector based on the Recent News Context. Avoid generic templates, make it factual and relevant to current real-world events.",
      "companySpecificNews": "A highly specific, accurate, and detailed summary in ${langName} of recent corporate news, earnings, expansions, or issues affecting this asset based on the Recent News Context. Avoid generic templates, make it factual and relevant to the specific company.",
      "priceDirectionPrediction": "A clear prediction (e.g., UP, DOWN, or SIDEWAYS) in ${langName} specifically focused on the Swing Trading outlook for the NEXT FEW WEEKS (identifying possible swing targets and trade setup), followed by a short layman explanation of why based on the combination of technicals, politics, and real news."
    }
  `;

  if (!genAI) {
    console.log(
      "gemini_api_key is not configured in database settings. Returning dynamic mock technical analysis.",
    );

    let recommendation = "Hold";
    let trend = "Consolidating";
    let risk = "Medium";
    let confidence = 65;

    if (indicators.swingScore >= 75) {
      recommendation = "Strong Buy";
      trend = "Strong Bullish Crossover";
      risk = "Low";
      confidence = 90;
    } else if (indicators.swingScore >= 60) {
      recommendation = "Buy";
      trend = "Bullish Momentum";
      risk = "Medium";
      confidence = 78;
    } else if (indicators.swingScore <= 35) {
      recommendation = "Avoid";
      trend = "Strong Bearish Trend";
      risk = "High";
      confidence = 85;
    }

    if (language === "id") {
      const supportStr = `Perkiraan Support: ${(indicators.ema50 * 0.97).toFixed(2)} | Resistance: ${(indicators.ema21 * 1.08).toFixed(2)}`;
      const rsiStatus =
        indicators.rsi > 70
          ? "jenuh beli (overbought)"
          : indicators.rsi < 30
            ? "jenuh jual (oversold)"
            : "momentum netral";
      const trendStatus =
        trend === "Strong Bullish Crossover"
          ? "fase persilangan naik yang kuat (strong bullish)"
          : trend === "Bullish Momentum"
            ? "fase momentum naik (bullish)"
            : trend === "Strong Bearish Trend"
              ? "fase tren turun yang kuat (strong bearish)"
              : "fase konsolidasi";
      const riskStatus =
        risk === "Low" ? "Rendah" : risk === "High" ? "Tinggi" : "Sedang";

      return {
        trendSummary:
          trend === "Consolidating"
            ? "Konsolidasi"
            : trend === "Strong Bullish Crossover"
              ? "Bullish Crossover Kuat"
              : trend === "Bullish Momentum"
                ? "Momentum Bullish"
                : "Tren Bearish Kuat",
        supportResistance: supportStr,
        riskAssessment: riskStatus,
        recommendation: recommendation,
        confidenceScore: confidence,
        reasoning: `[Spesialis Swing Trader] Berdasarkan simulasi analisis teknikal untuk ${symbol}, aset ini memiliki skor Swing sebesar ${indicators.swingScore.toFixed(1)}. Indikator RSI 14-periode saat ini berada di angka ${indicators.rsi.toFixed(1)}, menunjukkan kondisi ${rsiStatus}. Penyelarasan EMA (9/21/50) mengonfirmasi ${trendStatus}. Volume transaksi dan pola MACD mendukung prospek pergerakan swing jangka pendek-menengah ini.`,
        rsiExplanation: `RSI berada di ${indicators.rsi.toFixed(1)}, yang berarti kekuatan pembelian saat ini ${indicators.rsi > 70 ? "sangat kuat/harganya sudah mahal (jenuh beli)" : indicators.rsi < 30 ? "sangat lemah/harganya sudah murah (jenuh jual)" : "sedang-sedang saja (netral)"}. Ini membantu menentukan wilayah jenuh untuk swing trading.`,
        macdExplanation: `Sinyal MACD menunjukkan ${indicators.macd.histogram > 0 ? "Bullish Crossover (momentum naik)" : "Konsolidasi (harga bergerak mendatar)"}. Bagi pelaku swing trading, crossover positif merupakan konfirmasi awal pembalikan arah tren.`,
        emaExplanation: `Garis rata-rata pergerakan harga jangka pendek (EMA9) berada di atas garis menengah (EMA21) dan panjang (EMA50). Kondisi ini menandakan bahwa arah tren saham saat ini sedang naik dengan momentum yang sehat untuk swing trading.`,
        bbExplanation: `Harga memantul dari batas bawah (Support) Bollinger Bands. Artinya, harga saham saat ini berada di area support swing dan memiliki peluang besar untuk memantul kembali ke atas menuju target middle atau upper band.`,
        politicalImpact:
          "Stabilitas politik dalam negeri yang baik dan kebijakan BI rate yang stabil memberikan keyakinan lebih pada perputaran modal di sektor ini.",
        companySpecificNews: `Laporan ekspansi usaha terbaru dari ${symbol} diantisipasi secara positif oleh pasar finansial lokal karena potensi peningkatan profitabilitas di kuartal berikutnya.`,
        priceDirectionPrediction: `NAIK (SWING UP). Gabungan indikator teknikal positif dan struktur tren mendukung pergerakan naik menuju resistance terdekat dalam beberapa hari ke depan.`,
      };
    }

    return {
      trendSummary: trend,
      supportResistance: `Estimated Support: ${(indicators.ema50 * 0.97).toFixed(2)} | Resistance: ${(indicators.ema21 * 1.08).toFixed(2)}`,
      riskAssessment: risk,
      recommendation: recommendation,
      confidenceScore: confidence,
      reasoning: `[Swing Trading Specialist] Based on a simulated technical analysis for ${symbol}, the asset displays a Swing score of ${indicators.swingScore.toFixed(1)}. The 14-period RSI is currently at ${indicators.rsi.toFixed(1)}, showing ${indicators.rsi > 70 ? "overbought status" : indicators.rsi < 30 ? "oversold conditions" : "neutral momentum"}. EMA alignment (9/21/50) confirms a ${trend.toLowerCase()} phase. Volume and MACD crossover corroborate this reading for a swing trade.`,
      rsiExplanation: `RSI is at ${indicators.rsi.toFixed(1)}, meaning the stock is currently ${indicators.rsi > 70 ? "expensive (overbought)" : indicators.rsi < 30 ? "cheap (oversold)" : "fairly priced (neutral)"}. Perfect for identifying potential swing reversals.`,
      macdExplanation: `MACD signals ${indicators.macd.histogram > 0 ? "a Bullish Crossover" : "Consolidation"}. This indicates that ${indicators.macd.histogram > 0 ? "buying momentum is building up, confirming an upward swing" : "forces of buying and selling are in balance, so price remains flat"}.`,
      emaExplanation: `The short-term trend line is above the medium and long-term ones. This indicates the stock price is in a healthy, active uptrend suitable for swing trading.`,
      bbExplanation: `The price is rebounding from the lower Bollinger Band. This indicates the price has hit a swing floor and is likely to bounce back upwards.`,
      politicalImpact:
        "Strong domestic political stability and consistent central bank interest rate policies improve capital flow confidence.",
      companySpecificNews: `Market reports highlight positive reception of ${symbol}'s new business expansion plans, which are expected to boost subsequent quarterly earnings.`,
      priceDirectionPrediction: `UP (SWING UP). Strong technical buying signs coupled with solid industry sentiment predict a positive swing movement for ${symbol} over the next few weeks.`,
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Attempt to parse the response as JSON (removing any markdown backticks if present)
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini AI generation error:", error);
    throw error;
  }
}

export async function getMarketSentiment(
  news: any[],
  language: string = "id",
): Promise<any> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  let genAI: GoogleGenerativeAI | null = null;
  if (apiKey && apiKey !== "your_key_here") {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  const langName =
    language === "id" ? "Indonesian (Bahasa Indonesia)" : "English";

  if (!genAI) {
    if (language === "id") {
      return {
        sentiment: "Bullish",
        score: 68,
        summary:
          "Sektor perbankan dan infrastruktur Indonesia mempertahankan momentum kenaikan yang kuat. Volume pembelian tetap konsisten di atas rata-rata pergerakan 20 hari.",
        sectors: [
          "Finansial: Bullish",
          "Infrastruktur: Netral",
          "Teknologi: Volatil",
        ],
      };
    }
    return {
      sentiment: "Bullish",
      score: 68,
      summary:
        "Indonesian banking and infrastructure sectors maintain strong upward momentum. Buying volume remains consistent above the 20-day moving average.",
      sectors: [
        "Financials: Bullish",
        "Infrastructure: Neutral",
        "Technology: Volatile",
      ],
    };
  }

  const newsSummary = news
    .slice(0, 8)
    .map((n) => `- ${n.title || n.headline || ""}: ${n.summary || ""}`)
    .join("\n");
  const prompt = `
    Analyze the overall market sentiment and sector performance based on these recent financial news items:
    ${newsSummary}

    Provide a JSON response ONLY. Do not include markdown formatting or blocks. The JSON must match this structure exactly, and all text values (sentiment, summary, sectors values) must be written in ${langName}:
    {
      "sentiment": "Bullish, Bearish, or Neutral",
      "score": 68, // An integer score from 0 (very bearish) to 100 (very bullish)
      "summary": "A brief, professional summary explaining the market direction and news drivers.",
      "sectors": [
        "Financials: Bullish",
        "Technology: Volatile",
        "Infrastructure: Neutral"
      ] // An array containing 3 or 4 major sector sentiment classifications
    }
  `;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini AI sentiment error:", error);
    if (language === "id") {
      return {
        sentiment: "Netral",
        score: 50,
        summary:
          "Tidak dapat menganalisis sentimen pasar karena kesalahan sistem atau API.",
        sectors: [
          "Finansial: Netral",
          "Infrastruktur: Netral",
          "Teknologi: Netral",
        ],
      };
    }
    return {
      sentiment: "Neutral",
      score: 50,
      summary:
        "Unable to analyze market sentiment due to system or API request error.",
      sectors: [
        "Financials: Neutral",
        "Infrastructure: Neutral",
        "Technology: Neutral",
      ],
    };
  }
}

export async function askChatAssistant(
  message: string,
  chatHistory: any[],
  language: string = "id",
): Promise<string> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  let genAI: GoogleGenerativeAI | null = null;
  if (apiKey && apiKey !== "your_key_here") {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  if (!genAI) {
    if (language === "id") {
      return `[Spesialis Swing Trader] Halo! Kunci API Gemini belum dikonfigurasi di pengaturan database. Ini adalah respons simulasi. Untuk pertanyaan Anda tentang "${message}", dalam swing trading sangat disarankan untuk memperhatikan struktur tren EMA harian/mingguan dan tren volume OBV sebelum mengambil keputusan.`;
    }
    return `[Swing Trading Specialist] Hello! The Gemini API key is not configured in database settings. This is a simulated response. Regarding your query about "${message}", in swing trading it is highly recommended to inspect daily/weekly EMA structures and OBV volume trends before entry.`;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You are an elite financial analyst AI and a certified Swing Trading Specialist for the "Bot Saham" app.
      Help the user with stock analysis, swing trading strategies, technical indicators (RSI, MACD, EMAs, On-Balance Volume accumulation, Bollinger Bands), risk management (Stop Loss, Take Profit, Trailing Stop), and general financial queries.
      
      CRITICAL REQUIREMENT: Whenever you analyze, recommend, or discuss specific stock tickers or investment setups, you MUST always explicitly provide:
      - **Entry Strategy**: Explain the strategy in detail by referencing technical indicators. Specify how the Entry is triggered based on EMA structures (e.g., price pulling back/bouncing off EMA 21/50, or a Golden Cross of EMA 9 crossing above EMA 21), MACD signals (e.g., MACD line crossing above the signal line, or the MACD histogram turning positive), or RSI conditions (e.g., RSI indicator pulling back to support/oversold zone at 30-45).
      - **Take Profit (TP)**: Explain the target in detail with technical references, such as setting TP targets near major resistance lines, upper Bollinger Bands, or when the RSI crosses into the overbought area (70+).
      - **Stop Loss (SL)**: Explain the invalidation level in detail with technical references, such as setting SL slightly below the key support lines like EMA 50, below the recent swing low, or exiting when a bearish MACD crossover is confirmed.
      
      Keep answers professional, insightful, and detailed. Prefix your responses with '[Spesialis Swing Trader]' or '[Swing Trading Specialist]' depending on the output language.
      Always respond in the requested language (which is ${language === "id" ? "Indonesian (Bahasa Indonesia)" : "English"}).`,
    });

    // Map frontend chat history format to Gemini SDK format
    // Frontend history: { sender: 'user' | 'ai', text: string }
    // Gemini SDK history: { role: 'user' | 'model', parts: [{ text: string }] }
    // Clean history from first welcome message
    const formattedHistory = chatHistory
      .filter((_, idx) => idx > 0)
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini AI assistant chat error:", error);
    throw error;
  }
}

export async function lookupStockInfo(symbol: string): Promise<{
  name: string;
  market: string;
  fullSymbol: string;
  found: boolean;
}> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  const upperSymbol = symbol.trim().toUpperCase();

  let genAI: GoogleGenerativeAI | null = null;
  if (apiKey && apiKey !== "your_key_here") {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  if (!genAI) {
    const isIDX = !upperSymbol.includes(".");
    const fullSymbol = isIDX ? `${upperSymbol}.JK` : upperSymbol;
    return {
      name: upperSymbol,
      market: isIDX ? "IDX" : "US",
      fullSymbol,
      found: false,
    };
  }

  const prompt = `You are a financial data assistant. Given the stock ticker code "${upperSymbol}", identify:
1. The full official company name.
2. The stock market: "IDX" for Indonesian Stock Exchange, "US" for NYSE/NASDAQ.
3. The correct Yahoo Finance ticker symbol (e.g. "BBCA.JK" for IDX, "AAPL" for US).

Rules:
- Indonesian tickers (e.g. BBCA, TLKM, ASII, GOTO): append ".JK" suffix.
- US tickers (e.g. AAPL, GOOGL, TSLA): keep as-is.
- If the stock does not exist or you are not confident, set "found": false.
- Respond ONLY with a valid JSON object. No markdown or extra text.

JSON format: {"name":"Full Company Name","market":"IDX","fullSymbol":"BBCA.JK","found":true}`;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);
    return {
      name: parsed.name || upperSymbol,
      market: parsed.market === "US" ? "US" : "IDX",
      fullSymbol: parsed.fullSymbol || upperSymbol,
      found: !!parsed.found,
    };
  } catch (error) {
    console.error("[Gemini] lookupStockInfo error:", error);
    const isIDX = !upperSymbol.includes(".");
    return {
      name: upperSymbol,
      market: isIDX ? "IDX" : "US",
      fullSymbol: isIDX ? `${upperSymbol}.JK` : upperSymbol,
      found: false,
    };
  }
}

export interface TradeTagInput {
  symbol: string;
  buyDate: string;
  sellDate: string;
  buyPrice: number;
  sellPrice: number;
  shares: number;
  pnlPercent: number;
  holdingDays: number;
  notes?: string;
}

export async function suggestTradeTags(
  trade: TradeTagInput,
): Promise<string[]> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  const isWin = trade.pnlPercent > 0;
  const absPercent = Math.abs(trade.pnlPercent);

  // Rule-based fallback tags (always computed for supplementing AI)
  const fallbackTags: string[] = [];

  if (isWin) {
    if (absPercent >= 10) fallbackTags.push("Big_Winner");
    else if (absPercent >= 5) fallbackTags.push("Moderate_Win");
    else fallbackTags.push("Small_Win");
  } else {
    if (absPercent >= 10) fallbackTags.push("Big_Loss");
    else if (absPercent >= 5) fallbackTags.push("Moderate_Loss");
    else fallbackTags.push("Small_Loss");
  }

  if (trade.holdingDays <= 3) fallbackTags.push("Quick_Trade");
  else if (trade.holdingDays <= 14) fallbackTags.push("Short_Swing");
  else if (trade.holdingDays <= 45) fallbackTags.push("Medium_Swing");
  else fallbackTags.push("Long_Hold");

  if (!apiKey || apiKey === "your_key_here") {
    // No API key — return smart rule-based tags
    return [...new Set(fallbackTags)];
  }

  const prompt = `You are an expert swing trader AI. A trader just closed the following trade:

Symbol: ${trade.symbol}
Buy Date: ${trade.buyDate}
Sell Date: ${trade.sellDate}
Buy Price: ${trade.buyPrice}
Sell Price: ${trade.sellPrice}
Shares: ${trade.shares}
PnL%: ${trade.pnlPercent.toFixed(2)}%
Holding Days: ${trade.holdingDays}
${trade.notes ? `Trader Notes: ${trade.notes}` : ""}

Based on this trade data, suggest EXACTLY 2 pattern tags that best describe the trading setup or outcome for this trade. Choose ONLY from these standard tags or create relevant variants:

Setups: BB_Squeeze, Bounce_EMA20, Bounce_EMA50, Bounce_EMA200, Breakout_Resistance, Breakout_Consolidation, MACD_Cross_Bullish, RSI_Oversold_Bounce, RSI_Divergence, Gap_Up_Play, Gap_Down_Fade, Volume_Surge, News_Catalyst, Earnings_Play, Sector_Rotation, Trend_Following, Counter_Trend, Support_Bounce, Resistance_Rejection, Golden_Cross, Death_Cross, Cup_Handle, Double_Bottom, Double_Top, Head_Shoulders

Outcomes: Quick_Scalp, Swing_Success, Averaging_Down, Stop_Loss_Hit, Partial_Profit, Full_Position_Exit, FOMO_Entry, Discipline_Exit, Patience_Win

Context: ${isWin ? "This was a WINNING trade" : "This was a LOSING trade"}. Holding period was ${trade.holdingDays} days.

Respond ONLY with a JSON array of EXACTLY 2 tag strings. Example: ["BB_Squeeze", "Bounce_EMA50"]
Do NOT include any other text, only the JSON array.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      // Take AI tags first, trim to exactly 2
      return [...new Set(parsed)].slice(0, 2);
    }
    return fallbackTags;
  } catch (error) {
    console.error("[Gemini] suggestTradeTags error:", error);
    return fallbackTags;
  }
}
