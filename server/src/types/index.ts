export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface Quote {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
  dp?: number; // Change percentage (optional)
}

export interface Candle {
  o: number[]; // Open prices
  h: number[]; // High prices
  l: number[]; // Low prices
  c: number[]; // Close prices
  v: number[]; // Volume
  t: number[]; // Timestamps
  s: string; // Status (ok / no_data)
}

export interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface Transaction {
  id: string;
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
  notes?: string;
}

export interface AlertRule {
  id: string;
  userId: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'btst_score_above' | 'rsi_overbought' | 'rsi_oversold' | 'macd_crossover' | 'volume_spike';
  targetValue?: number;
  isActive: boolean;
  createdAt: string;
}

export interface TriggeredAlert {
  id: string;
  userId: string;
  symbol: string;
  alertId: string;
  type: string;
  message: string;
  price: number;
  triggeredAt: string;
  isRead: boolean;
}

export interface PriorityGroup {
  id: string;
  userId: string;
  name: string;
  symbols: string[];
  createdAt: string;
}
