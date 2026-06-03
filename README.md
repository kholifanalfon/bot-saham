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
To compile production assets for manual custom deployments:
```bash
npm run build
```

---

## 🚢 Deployment Guide

The application supports two main ways to deploy in production: **Docker Compose (Recommended)** and **Automated Shell Script (PM2 + Nginx)**.

### Option A: Docker Compose Deployment (Recommended)

Make sure you have Docker and Docker Compose installed on your server.

1. Configure production keys in `.env` or pass them directly to the `environment` section of `docker-compose.yml`.
2. Start all services in detached mode:
   ```bash
   docker-compose up -d --build
   ```
3. This will spin up:
   - **PostgreSQL Database** (`db`) on port `5432` with persistent storage.
   - **Express API Backend** (`server`) on port `3001`. Runs migrations and database seeder automatically.
   - **React Client Frontend** (`client`) on port `8080`, served via Nginx.

---

### Option B: Automated Script Deployment (PM2 + Nginx)

If you are deploying directly to a Virtual Private Server (VPS) without Docker (e.g. Ubuntu + Nginx + PM2):

1. **Configure Environment Variables**:
   In your `.env` file, ensure the following target variables are defined:
   ```env
   # Path where Nginx serves static files (e.g., public folder)
   DEPLOY_PATH=/var/www/bot-saham
   PORT=3001
   
   # Enable/disable automatic migration and seeding during deploy
   RUN_MIGRATE=true
   RUN_SEED=false
   ```
2. **Install PM2**:
   Make sure PM2 is installed globally on the system:
   ```bash
   npm install -g pm2
   ```
3. **Execute Deployment Script**:
   Run the deployment helper script from the root project directory:
   ```bash
   # Run directly (or with sudo if writing to restricted paths like /var/www/)
   sudo bash deploy.sh
   ```
4. **What the script does**:
   - Compiles server TypeScript and prunes developmental dependencies.
   - Runs database migrations.
   - Compiles Vite production client assets.
   - Copies static client builds (`client/dist`) to your configured `DEPLOY_PATH` directory.
   - Starts or restarts the server daemon process inside PM2 under the process name `bot-saham-server`.

---

## 🔒 Default Seed Accounts (Database Seeder)

At first startup, the server automatically seeds the persistent JSON database with two pre-configured accounts for testing:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@botsaham.com` | `Admin123!` | `admin` (Can access User Management) |
| **Demo Trader** | `trader@botsaham.com` | `Trader123!` | `user` |
