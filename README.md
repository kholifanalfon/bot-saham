# Bot Saham 📈

Real-time monorepo web application for stock trading analysis prioritizing the Indonesian stock market (**IDX**) and US markets using a **Buy Today, Sell Tomorrow (BTST)** breakout strategy. Powered by **Google Gemini AI** for smart technical indicators and sentiment evaluation.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Zustand + React Query + TradingView Lightweight Charts
- **Backend**: Express.js + TypeScript + Node16 CommonJS
- **API Feeds**: Finnhub (US Stocks) + Yahoo Finance (Historical & Fallback) + Sectors.app (IDX Fundamentals)
- **AI Integrations**: Google Gemini Flash API (`gemini-1.5-flash`)
- **Theme**: Premium Dark Glassmorphism trading dashboard

---

## 📂 Project Structure

```
bot-saham/
├── client/              # React frontend workspace (Vite)
├── server/              # Express backend workspace (TypeScript)
├── .env.example         # Shared environment variables template
├── .gitignore           # Git ignore exclusions
└── package.json         # Monorepo workspaces definition
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later

### 2. Installation
Clone the repository and install all dependencies in a single step from the root workspace folder:
```bash
# Install all dependencies (root + workspaces)
npm install
```

### 3. API Keys Configuration
Copy `.env.example` to `.env` in the root workspace directory:
```bash
cp .env.example .env
```

Open `.env` and fill in your corresponding API keys:
```env
# Stock Data APIs
FINNHUB_API_KEY=your_finnhub_key_here
SECTORS_API_KEY=your_sectors_app_key_here

# Google Gemini AI
GEMINI_API_KEY=your_gemini_studio_key_here
```
> **💡 Note**: If the API keys are not provided, the application will automatically activate **dynamic mock fallbacks** to simulate live feeds and professional AI technical analysis offline.

---

## 💻 How to Run the App

### Running in Development Mode
You can spin up both the Express backend (port `3001`) and the Vite frontend (port `5173`) concurrently with a single command from the root folder:
```bash
npm run dev
```

### Building for Production
To compile clean production assets for deployment:
```bash
npm run build
```

---

## 🔒 Default Seed Accounts (Database Seeder)

At first startup, the server automatically seeds the persistent JSON database with two pre-configured accounts for testing:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@botsaham.com` | `Admin123!` | `admin` (Can access User Management) |
| **Demo Trader** | `trader@botsaham.com` | `Trader123!` | `user` |
