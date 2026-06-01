import { create } from 'zustand';

export interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
  notes?: string;
}

interface PortfolioState {
  holdings: Holding[];
  transactions: Transaction[];
  totalValue: number;
  totalPnl: number;
  winRate: number;
  setPortfolio: (data: { holdings: Holding[]; totalValue: number; totalPnl: number; winRate: number }) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  holdings: [],
  transactions: [],
  totalValue: 0,
  totalPnl: 0,
  winRate: 0,
  setPortfolio: (data: { holdings: Holding[]; totalValue: number; totalPnl: number; winRate: number }) =>
    set({
      holdings: data.holdings,
      totalValue: data.totalValue,
      totalPnl: data.totalPnl,
      winRate: data.winRate
    }),
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  addTransaction: (tx: Transaction) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),
  deleteTransaction: (id: string) =>
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }))
}));
