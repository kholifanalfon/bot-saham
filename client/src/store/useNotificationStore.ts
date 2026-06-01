import { create } from 'zustand';

export interface AlertRule {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'btst_score_above';
  targetValue?: number;
  isActive: boolean;
  createdAt: string;
}

export interface TriggeredAlert {
  id: string;
  symbol: string;
  type: string;
  message: string;
  price: number;
  triggeredAt: string;
  isRead: boolean;
}

interface NotificationState {
  alerts: AlertRule[];
  triggeredAlerts: TriggeredAlert[];
  unreadCount: number;
  setAlerts: (alerts: AlertRule[]) => void;
  setTriggeredAlerts: (triggeredAlerts: TriggeredAlert[]) => void;
  addAlert: (rule: AlertRule) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (alert: TriggeredAlert) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  alerts: [],
  triggeredAlerts: [],
  unreadCount: 0,
  setAlerts: (alerts: AlertRule[]) => set({ alerts }),
  setTriggeredAlerts: (triggeredAlerts: TriggeredAlert[]) =>
    set({
      triggeredAlerts,
      unreadCount: triggeredAlerts.filter((a) => !a.isRead).length
    }),
  addAlert: (rule: AlertRule) => set((state) => ({ alerts: [...state.alerts, rule] })),
  removeAlert: (id: string) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  triggerAlert: (alert: TriggeredAlert) =>
    set((state) => {
      const updated = [alert, ...state.triggeredAlerts];
      return {
        triggeredAlerts: updated,
        unreadCount: state.unreadCount + 1
      };
    }),
  markAsRead: (id: string) =>
    set((state) => {
      const updated = state.triggeredAlerts.map((a) =>
        a.id === id ? { ...a, isRead: true } : a
      );
      return {
        triggeredAlerts: updated,
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    }),
  clearAll: () => set({ triggeredAlerts: [], unreadCount: 0 })
}));
