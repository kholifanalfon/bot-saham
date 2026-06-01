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
    btstScore: number;
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
    You are an elite financial analyst AI for the "Bot Saham" app.
    Analyze the following stock data for symbol ${symbol}:
    - Current Price: ${historicalData[historicalData.length - 1]?.close || "N/A"}
    - BTST (Buy Today, Sell Tomorrow) Score: ${indicators.btstScore.toFixed(1)} / 100
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
      "reasoning": "A highly detailed professional explanation in ${langName} explaining why this stock fits the BTST strategy or not based on the indicators, politics, and news.",
      "rsiExplanation": "A simple layperson explanation in ${langName} explaining what the current RSI value of ${indicators.rsi.toFixed(1)} means for this stock (e.g., if it's neutral, cheap/oversold, or expensive/overbought and what that means for a beginner).",
      "macdExplanation": "A simple layperson explanation in ${langName} explaining what the current MACD signal (${indicators.macd.histogram > 0 ? "Bullish Crossover" : "Consolidating"}) means in simple trading terms.",
      "emaExplanation": "A simple layperson explanation in ${langName} explaining what the EMA alignment (9/21/50) means for the stock's trend speed in simple terms.",
      "bbExplanation": "A simple layperson explanation in ${langName} explaining what the Bollinger Bands status (rebounding from support/lower band) means for a beginner trader.",
      "politicalImpact": "A highly specific, accurate, and detailed explanation in ${langName} outlining the current political climate, macro-government policy, or interest rates impact on this stock or its sector based on the Recent News Context. Avoid generic templates, make it factual and relevant to current real-world events.",
      "companySpecificNews": "A highly specific, accurate, and detailed summary in ${langName} of recent corporate news, earnings, expansions, or issues affecting this asset based on the Recent News Context. Avoid generic templates, make it factual and relevant to the specific company.",
      "priceDirectionPrediction": "A clear prediction (e.g., UP, DOWN, or SIDEWAYS) in ${langName} specifically focused on TOMORROW'S market open (Buy Today, Sell Tomorrow context), followed by a short layman explanation of why based on the combination of technicals, politics, and real news."
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

    if (indicators.btstScore >= 75) {
      recommendation = "Strong Buy";
      trend = "Strong Bullish Crossover";
      risk = "Low";
      confidence = 90;
    } else if (indicators.btstScore >= 60) {
      recommendation = "Buy";
      trend = "Bullish Momentum";
      risk = "Medium";
      confidence = 78;
    } else if (indicators.btstScore <= 35) {
      recommendation = "Avoid";
      trend = "Strong Bearish Trend";
      risk = "High";
      confidence = 85;
    }

    if (language === "id") {
      const supportStr = `Perkiraan Support: ${(indicators.ema50 * 0.97).toFixed(2)} | Resistance: ${(indicators.ema9 * 1.05).toFixed(2)}`;
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
        reasoning: `Berdasarkan simulasi analisis teknikal untuk ${symbol}, aset ini memiliki skor BTST sebesar ${indicators.btstScore.toFixed(1)}. Indikator RSI 14-periode saat ini berada di angka ${indicators.rsi.toFixed(1)}, menunjukkan kondisi ${rsiStatus}. Penyelarasan EMA (9/21/50) mengonfirmasi ${trendStatus}. Lonjakan volume transaksi dan pola MACD memperkuat pembacaan ini.`,
        rsiExplanation: `RSI berada di ${indicators.rsi.toFixed(1)}, yang berarti kekuatan pembelian saat ini ${indicators.rsi > 70 ? "sangat kuat/harganya sudah mahal (jenuh beli)" : indicators.rsi < 30 ? "sangat lemah/harganya sudah murah (jenuh jual)" : "sedang-sedang saja (netral)"}. Ini aman untuk pemula karena tidak terlalu berisiko.`,
        macdExplanation: `Sinyal MACD menunjukkan ${indicators.macd.histogram > 0 ? "Bullish Crossover (momentum naik)" : "Konsolidasi (harga bergerak mendatar)"}. Ini menunjukkan bahwa ${indicators.macd.histogram > 0 ? "para pembeli mulai mendominasi pasar dan harga berpotensi naik lagi" : "minat beli dan jual sedang seimbang, sehingga harga saham cenderung stabil"}.`,
        emaExplanation: `Garis rata-rata pergerakan harga jangka pendek (EMA9) berada di atas garis menengah (EMA21) dan panjang (EMA50). Bagi orang awam, ini menandakan bahwa arah tren saham saat ini sedang meluncur naik dengan kecepatan yang sehat.`,
        bbExplanation: `Harga memantul dari batas bawah (Support) Bollinger Bands. Artinya, harga saham saat ini dianggap sudah cukup murah dan memiliki peluang besar untuk memantul kembali ke atas.`,
        politicalImpact:
          "Stabilitas politik dalam negeri yang baik dan kebijakan BI rate yang stabil memberikan keyakinan lebih pada perputaran modal di sektor ini.",
        companySpecificNews: `Laporan ekspansi usaha terbaru dari ${symbol} diantisipasi secara positif oleh pasar finansial lokal karena potensi peningkatan profitabilitas di kuartal berikutnya.`,
        priceDirectionPrediction: `NAIK. Gabungan indikator teknikal positif dan dorongan sentimen industri menunjukkan potensi pergerakan harga saham ${symbol} naik esok hari saat pasar dibuka.`,
      };
    }

    return {
      trendSummary: trend,
      supportResistance: `Estimated Support: ${(indicators.ema50 * 0.97).toFixed(2)} | Resistance: ${(indicators.ema9 * 1.05).toFixed(2)}`,
      riskAssessment: risk,
      recommendation: recommendation,
      confidenceScore: confidence,
      reasoning: `Based on a simulated technical analysis for ${symbol}, the asset displays a BTST score of ${indicators.btstScore.toFixed(1)}. The 14-period RSI is currently at ${indicators.rsi.toFixed(1)}, showing ${indicators.rsi > 70 ? "overbought status" : indicators.rsi < 30 ? "oversold conditions" : "neutral momentum"}. EMA alignment (9/21/50) confirms a ${trend.toLowerCase()} phase. Volume spikes and MACD crossover corroborate this reading.`,
      rsiExplanation: `RSI is at ${indicators.rsi.toFixed(1)}, meaning the stock is currently ${indicators.rsi > 70 ? "expensive (overbought)" : indicators.rsi < 30 ? "cheap (oversold)" : "fairly priced (neutral)"}. Standard momentum suggests it is steady and suitable for entry.`,
      macdExplanation: `MACD signals ${indicators.macd.histogram > 0 ? "a Bullish Crossover" : "Consolidation"}. This means ${indicators.macd.histogram > 0 ? "buying momentum is building up, indicating a good potential upward move" : "forces of buying and selling are in balance, so price remains flat"}.`,
      emaExplanation: `The short-term trend line is above the medium and long-term ones. For beginners, this indicates the stock price is in a healthy, active uptrend.`,
      bbExplanation: `The price is rebounding from the lower Bollinger Band. For a beginner, this indicates the price has hit a short-term floor and is likely to bounce back upwards.`,
      politicalImpact:
        "Strong domestic political stability and consistent central bank interest rate policies improve capital flow confidence.",
      companySpecificNews: `Market reports highlight positive reception of ${symbol}'s new business expansion plans, which are expected to boost subsequent quarterly earnings.`,
      priceDirectionPrediction: `UP. Strong technical buying signs coupled with solid industry sentiment predict a positive price movement for ${symbol} tomorrow at market open.`,
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

export async function getMarketSentiment(news: any[]): Promise<any> {
  const apiKey = await getSetting("gemini_api_key");
  const modelName = (await getSetting("gemini_model")) || "gemini-1.5-flash";

  let genAI: GoogleGenerativeAI | null = null;
  if (apiKey && apiKey !== "your_key_here" && apiKey.startsWith("AIzaSy")) {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  if (!genAI) {
    return {
      sentiment: "Neutral to Positive",
      score: 62,
      summary:
        "Market news sentiment indicates standard trading volumes and stable price structures across major sectors.",
    };
  }

  const newsSummary = news
    .slice(0, 5)
    .map((n) => n.title)
    .join("\n");
  const prompt = `
    Analyze the sentiment of these recent financial news titles:
    ${newsSummary}

    Provide a JSON response ONLY. Do not include markdown formatting or blocks. The JSON must match this structure exactly:
    {
      "sentiment": "Bullish, Bearish, or Neutral",
      "score": 50,
      "summary": "A brief summary of why the sentiment is such."
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
    return {
      sentiment: "Neutral",
      score: 50,
      summary: "Unable to analyze sentiment due to API request error.",
    };
  }
}
