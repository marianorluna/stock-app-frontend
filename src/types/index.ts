export type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  reorderPoint: number;
  unit: string;
  category: 'ingredient' | 'beverage' | 'coffee';
};

export type StockSnapshot = {
  generatedAt: string;
  inventory: InventoryItem[];
  lowStock: InventoryItem[];
  categoryTotals: Record<
    'ingredient' | 'beverage' | 'coffee',
    {
      total: number;
      lowStock: number;
    }
  >;
};

export type Ingredient = {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  stockUnit: 'u' | 'g' | 'ml';
  purchaseUnit: string;
  conversionFactor: number;
  conversionUnit: 'u' | 'g' | 'ml';
  reorderPoint: number;
  category: 'bebida' | 'cafe' | 'condimentos' | 'frutas' | 'cereales' | 'lacteos' | 'otros' | 'proteinas' | 'vegetales';
  allergens: string[];
  codeArticlePurchase: string;
  // Campos de compatibilidad (virtuals del backend)
  productUnit?: string;
  conversionFactorToGrams?: number;
};

export type RecipeIngredient = {
  ingredient: string | Ingredient;
  quantityInGrams: number;
};

export type Dish = {
  _id: string;
  name: string;
  description?: string;
  recipe: RecipeIngredient[];
  type?: 'dish' | 'drink' | 'dessert';
};

export type ManualSalePayload = {
  lines: Array<{
    dish: string;
    quantity: number;
  }>;
};

export type ManualPurchasePayload = {
  supplier?: string;
  invoiceNumber?: string;
  items: Array<{
    ingredient: string;
    quantityInGrams: number;
    unitPrice: number;
  }>;
};

export type ManualWastagePayload = {
  items: Array<{
    ingredient: string;
    quantityInGrams: number;
    reason?: string;
  }>;
};

export type WastagePresetPayload = {
  name: string;
  ingredient: string;
  quantityInGrams: number;
  reason?: string;
};

export type WastagePreset = {
  _id: string;
  name: string;
  ingredient: IngredientReference;
  quantityInGrams: number;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Supplier = {
  sku: string;
  name: string;
  nif?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  tel?: string;
  contact?: string;
  email?: string;
  totalPurchases: number;
  lastPurchase: string | null;
};

export type ManualLogFilters = {
  from?: string;
  to?: string;
};

type DishReference = string | { _id: string; name: string; type?: string };
type IngredientReference = string | { _id: string; name: string; purchaseUnit?: string; productUnit?: string };

export type SaleRecord = {
  _id: string;
  timestamp: string;
  source: string;
  lines: Array<{
    dish: DishReference;
    quantity: number;
  }>;
  metadata?: Record<string, unknown>;
};

export type PurchaseRecord = {
  _id: string;
  timestamp: string;
  supplier?: string;
  invoiceNumber?: string;
  items: Array<{
    ingredient: IngredientReference;
    quantityInGrams: number;
    unitPrice: number;
  }>;
  metadata?: Record<string, unknown>;
};

export type WastageRecord = {
  _id: string;
  timestamp: string;
  items: Array<{
    ingredient: IngredientReference;
    quantityInGrams: number;
    reason?: string;
  }>;
  metadata?: Record<string, unknown>;
};

