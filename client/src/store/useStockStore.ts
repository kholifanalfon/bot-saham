import { create } from "zustand";

export interface PriorityGroup {
  id: string;
  name: string;
  symbols: string[];
}

interface StockState {
  watchlist: string[];
  selectedSymbol: string | null;
  priorityGroups: PriorityGroup[];
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  setSelectedSymbol: (symbol: string) => void;
  addPriorityGroup: (group: PriorityGroup) => void;
  removePriorityGroup: (id: string) => void;
  addSymbolToGroup: (groupId: string, symbol: string) => void;
  removeSymbolFromGroup: (groupId: string, symbol: string) => void;
}

export const useStockStore = create<StockState>()((set, get) => ({
  watchlist: [],
  selectedSymbol: "BBRI.JK",
  priorityGroups: [
    {
      id: "1",
      name: "LQ45 Blue Chips",
      symbols: ["BBRI.JK", "BBCA.JK", "BMRI.JK", "TLKM.JK"],
    },
    { id: "2", name: "US Tech Leaders", symbols: ["AAPL", "TSLA", "NVDA"] },
  ],

  fetchWatchlist: async () => {
    try {
      const response = await fetch('http://localhost:3001/api/watchlist', {
        credentials: 'include'
      });
      if (response.ok) {
        const symbols = await response.json();
        set({ watchlist: symbols });
      }
    } catch (err) {
      console.error('Error loading watchlist from database:', err);
    }
  },

  addToWatchlist: async (symbol: string) => {
    const { watchlist } = get();
    if (watchlist.includes(symbol)) return;

    try {
      const response = await fetch('http://localhost:3001/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ symbol })
      });
      if (response.ok) {
        set({ watchlist: [...watchlist, symbol] });
      }
    } catch (err) {
      console.error('Error adding symbol to database watchlist:', err);
    }
  },

  removeFromWatchlist: async (symbol: string) => {
    const { watchlist } = get();
    try {
      const response = await fetch(`http://localhost:3001/api/watchlist/${symbol}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        set({ watchlist: watchlist.filter((s) => s !== symbol) });
      }
    } catch (err) {
      console.error('Error removing symbol from database watchlist:', err);
    }
  },

  setSelectedSymbol: (symbol: string) => set({ selectedSymbol: symbol }),
  addPriorityGroup: (group: PriorityGroup) =>
    set((state) => ({ priorityGroups: [...state.priorityGroups, group] })),
  removePriorityGroup: (id: string) =>
    set((state) => ({
      priorityGroups: state.priorityGroups.filter((g) => g.id !== id),
    })),
  addSymbolToGroup: (groupId: string, symbol: string) =>
    set((state) => ({
      priorityGroups: state.priorityGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              symbols: g.symbols.includes(symbol)
                ? g.symbols
                : [...g.symbols, symbol],
            }
          : g,
      ),
    })),
  removeSymbolFromGroup: (groupId: string, symbol: string) =>
    set((state) => ({
      priorityGroups: state.priorityGroups.map((g) =>
        g.id === groupId
          ? { ...g, symbols: g.symbols.filter((s) => s !== symbol) }
          : g,
      ),
    })),
}));
