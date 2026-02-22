import { Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import InventoryPage from '../pages/InventoryPage';
import StockActualPage from '../pages/inventory/StockActualPage';
import PurchasesPage from '../pages/inventory/PurchasesPage';
import SalesPage from '../pages/inventory/SalesPage';

/**
 * Rutas relacionadas con el inventario
 * Requieren roles: admin o manager
 */
export const inventoryRoutes = [
  <Route
    key="inventory"
    path="/inventory"
    element={
      <ProtectedRoute requiredRoles={['admin', 'manager']}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <InventoryPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
  <Route
    key="inventory-stock"
    path="/inventory/stock"
    element={
      <ProtectedRoute requiredRoles={['admin', 'manager']}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <StockActualPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
  <Route
    key="inventory-purchases"
    path="/inventory/purchases"
    element={
      <ProtectedRoute requiredRoles={['admin', 'manager']}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <PurchasesPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
  <Route
    key="inventory-sales"
    path="/inventory/sales"
    element={
      <ProtectedRoute requiredRoles={['admin', 'manager']}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <SalesPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
];
