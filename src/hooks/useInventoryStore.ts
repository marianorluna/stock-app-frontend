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
  WastagePresetPayload,
  Supplier
} from '../types';

type InventoryState = {
  snapshot?: StockSnapshot;
  ingredients: Ingredient[];
  dishes: Dish[];
  suppliers: Supplier[];
  loading: boolean;
  loadingMessage?: string;
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
  fetchSuppliers: () => Promise<void>;
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

let snapshotLongLoadTimer: number | undefined;

export const useInventoryStore = create<InventoryState>()(
  devtools((set, get) => ({
    snapshot: undefined,
    ingredients: [],
    dishes: [],
    suppliers: [],
    loading: false,
    loadingMessage: undefined,
    logsLoading: false,
    error: undefined,
    manualFilters: {},
    salesLog: [],
    purchasesLog: [],
    wastageLog: [],
    wastagePresets: [],
    //obtiene el snapshot actual del inventario desde el endpoint de inventario
    fetchSnapshot: async () => {
      if (snapshotLongLoadTimer) {
        clearTimeout(snapshotLongLoadTimer);
      }

      set({
        loading: true,
        loadingMessage: 'Cargando datos iniciales...',
        error: undefined
      });

      snapshotLongLoadTimer = window.setTimeout(() => {
        set((state) =>
          state.loading
            ? {
                loadingMessage:
                  'El servidor está iniciando, esto puede tardar un poco más de lo normal...'
              }
            : state
        );
      }, 10000);

      try {
        //usar el endpoint de inventory (accesible para usuarios con inventory:read)
        const { data } = await apiClient.get<StockSnapshot>('/inventory/snapshot');
        if (snapshotLongLoadTimer) {
          clearTimeout(snapshotLongLoadTimer);
          snapshotLongLoadTimer = undefined;
        }

        set({
          snapshot: data,
          loading: false,
          loadingMessage: undefined
        });
      } catch (error) {
        if (snapshotLongLoadTimer) {
          clearTimeout(snapshotLongLoadTimer);
          snapshotLongLoadTimer = undefined;
        }

        set({
          error: 'Error cargando inventario',
          loading: false,
          loadingMessage: undefined
        });
      }
    },
    //obtiene la lista de ingredientes desde la api
    fetchIngredients: async () => {
      try {
        const { data } = await apiClient.get<Ingredient[]>('/ingredients');
        set({ ingredients: data });
      } catch {
        set({ error: 'Error cargando ingredientes' });
      }
    },
    //obtiene la lista de platos/recetas desde la api
    fetchDishes: async () => {
      try {
        const { data } = await apiClient.get<Dish[]>('/dishes');
        set({ dishes: data });
      } catch {
        set({ error: 'Error cargando recetas' });
      }
    },
    fetchSuppliers: async () => {
      try {
        const { data } = await apiClient.get<Supplier[]>('/suppliers');
        set({ suppliers: data });
      } catch {
        set({ error: 'Error cargando proveedores' });
      }
    },
    //registra una venta manual y actualiza el inventario
    createSale: async (payload) => {
      await apiClient.post('/manual/sales', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    //registra una compra manual y actualiza el inventario
    createPurchase: async (payload) => {
      await apiClient.post('/manual/purchases', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    //registra una merma manual y actualiza el inventario
    createWastage: async (payload) => {
      await apiClient.post('/manual/wastage', payload);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    //elimina un registro de merma y revierte el cambio en el inventario
    deleteWastage: async (id) => {
      await apiClient.delete(`/manual/wastage/${id}`);
      await Promise.all([get().fetchSnapshot(), get().fetchManualLogs()]);
    },
    //registra listeners de websocket para actualizar el inventario en tiempo real
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
    //obtiene los registros manuales de ventas, compras y mermas con filtros opcionales
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

