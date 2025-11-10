import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiClient from '../services/apiClient';
import type { Socket } from 'socket.io-client';
import type {
  StockSnapshot,
  ManualSalePayload,
  ManualPurchasePayload,
  ManualWastagePayload,
  Ingredient,
  Dish,
  SaleRecord,
  PurchaseRecord,
  WastageRecord,
  ManualLogFilters,
  WastagePreset,
  WastagePresetPayload
} from '../types';

type InventoryState = {
  snapshot?: StockSnapshot;
  ingredients: Ingredient[];
  dishes: Dish[];
  loading: boolean;
  logsLoading: boolean;
  error?: string;
  manualFilters: ManualLogFilters;
  salesLog: SaleRecord[];
  purchasesLog: PurchaseRecord[];
  wastageLog: WastageRecord[];
  wastagePresets: WastagePreset[];
  fetchSnapshot: () => Promise<void>;
  fetchIngredients: () => Promise<void>;
  fetchDishes: () => Promise<void>;
  createSale: (payload: ManualSalePayload) => Promise<void>;
  createPurchase: (payload: ManualPurchasePayload) => Promise<void>;
  createWastage: (payload: ManualWastagePayload) => Promise<void>;
  deleteWastage: (id: string) => Promise<void>;
  registerSocketListeners: (socket: Socket) => () => void;
  fetchManualLogs: (filters?: ManualLogFilters) => Promise<void>;
  setManualFilters: (filters: ManualLogFilters) => void;
  fetchWastagePresets: () => Promise<void>;
  createWastagePreset: (payload: WastagePresetPayload) => Promise<void>;
  deleteWastagePreset: (presetId: string) => Promise<void>;
};

export const useInventoryStore = create<InventoryState>()(
  devtools((set, get) => ({
    snapshot: undefined,
    ingredients: [],
    dishes: [],
    loading: false,
    logsLoading: false,
    error: undefined,
    manualFilters: {},
    salesLog: [],
    purchasesLog: [],
    wastageLog: [],
    wastagePresets: [],
    fetchSnapshot: async () => {
      set({ loading: true, error: undefined });
      try {
        const { data } = await apiClient.get<StockSnapshot>('/dashboard/snapshot');
        set({ snapshot: data, loading: false });
      } catch (error) {
        set({ error: 'Error cargando dashboard', loading: false });
      }
    },
    fetchIngredients: async () => {
      try {
        const { data } = await apiClient.get<Ingredient[]>('/ingredients');
        set({ ingredients: data });
      } catch {
        set({ error: 'Error cargando ingredientes' });
      }
    },
    fetchDishes: async () => {
      try {
        const { data } = await apiClient.get<Dish[]>('/dishes');
        set({ dishes: data });
      } catch {
        set({ error: 'Error cargando recetas' });
      }
    },
    createSale: async (payload) => {
      await apiClient.post('/manual/sales', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    createPurchase: async (payload) => {
      await apiClient.post('/manual/purchases', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    createWastage: async (payload) => {
      await apiClient.post('/manual/wastage', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    deleteWastage: async (id) => {
      await apiClient.delete(`/manual/wastage/${id}`);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    registerSocketListeners: (socket) => {
      const handleSale = () => {
        void get().fetchSnapshot();
        void get().fetchManualLogs();
      };
      const handlePurchase = () => {
        void get().fetchSnapshot();
        void get().fetchManualLogs();
      };
      const handleWastage = () => {
        void get().fetchSnapshot();
        void get().fetchManualLogs();
      };

      socket.on('inventory:sale', handleSale);
      socket.on('inventory:purchase', handlePurchase);
      socket.on('inventory:wastage', handleWastage);

      return () => {
        socket.off('inventory:sale', handleSale);
        socket.off('inventory:purchase', handlePurchase);
        socket.off('inventory:wastage', handleWastage);
      };
    },
    fetchManualLogs: async (filters) => {
      const currentFilters = filters ?? get().manualFilters ?? {};
      if (filters) {
        set({ manualFilters: filters });
      }

      set({ logsLoading: true });

      try {
        const params = new URLSearchParams();

        const appendDateParam = (key: 'from' | 'to', value?: string) => {
          if (!value) return;
          const date = new Date(value);
          if (!Number.isNaN(date.getTime())) {
            const normalizedDate = new Date(date);
            if (key === 'from') {
              normalizedDate.setHours(0, 0, 0, 0);
            } else {
              normalizedDate.setHours(23, 59, 59, 999);
            }
            params.append(key, normalizedDate.toISOString());
          }
        };

        appendDateParam('from', currentFilters.from);
        appendDateParam('to', currentFilters.to);

        const query = params.toString() ? `?${params.toString()}` : '';

        const [salesRes, purchasesRes, wastageRes] = await Promise.all([
          apiClient.get<SaleRecord[]>(`/manual/sales${query}`),
          apiClient.get<PurchaseRecord[]>(`/manual/purchases${query}`),
          apiClient.get<WastageRecord[]>(`/manual/wastage${query}`)
        ]);

        set({
          salesLog: salesRes.data,
          purchasesLog: purchasesRes.data,
          wastageLog: wastageRes.data,
          logsLoading: false,
          error: undefined,
          manualFilters: currentFilters
        });
      } catch (error) {
        set({ error: 'Error cargando registros manuales', logsLoading: false });
      }
    },
    setManualFilters: (filters) => {
      set({ manualFilters: filters });
    },
    fetchWastagePresets: async () => {
      try {
        const { data } = await apiClient.get<WastagePreset[]>('/manual/wastage/presets');
        set({ wastagePresets: data });
      } catch {
        set({ error: 'Error cargando botones rápidos de merma' });
      }
    },
    createWastagePreset: async (payload) => {
      const { data } = await apiClient.post<WastagePreset>('/manual/wastage/presets', payload);
      set((state) => ({
        wastagePresets: [...state.wastagePresets, data]
      }));
    },
    deleteWastagePreset: async (presetId) => {
      await apiClient.delete(`/manual/wastage/presets/${presetId}`);
      set((state) => ({
        wastagePresets: state.wastagePresets.filter((preset) => preset._id !== presetId)
      }));
    }
  }))
);

