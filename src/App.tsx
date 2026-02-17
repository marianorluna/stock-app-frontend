import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { registerServiceWorker } from './utils/registerServiceWorker';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import StockActualPage from './pages/inventory/StockActualPage';
import PurchasesPage from './pages/inventory/PurchasesPage';
import SalesPage from './pages/inventory/SalesPage';
import ProductsPage from './pages/ProductsPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import DrinksPage from './pages/DrinksPage';
import ManualEntryPage from './pages/ManualEntryPage';
import SuppliersPage from './pages/SuppliersPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import { useInventoryStore } from './hooks/useInventoryStore';
import socketClient from './services/socketClient';
import AppShell from './components/layout/AppShell';

//componente interno que maneja las rutas protegidas
const AppRoutes = () => {
  const { user, hasPermission, hasRole, hasAnyRole } = useAuth();
  const { fetchSnapshot, registerSocketListeners } = useInventoryStore();

  //inicializa el snapshot del inventario y registra listeners de websocket cuando el usuario está autenticado
  useEffect(() => {
    if (user) {
      fetchSnapshot();
      const cleanup = registerSocketListeners(socketClient);
      return () => {
        cleanup();
      };
    }
  }, [user, fetchSnapshot, registerSocketListeners]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={
          <ProtectedRoute>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <UnauthorizedPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  {hasRole('operator') ? (
                    <Navigate to="/manual" replace />
                  ) : hasPermission('dashboard', 'read') ? (
                    <Navigate to="/dashboard" replace />
                  ) : hasAnyRole(['admin', 'manager']) ? (
                    <Navigate to="/inventory" replace />
                  ) : hasPermission('ingredients', 'read') ? (
                    <Navigate to="/products" replace />
                  ) : (
                    <Navigate to="/unauthorized" replace />
                  )}
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <DashboardPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
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
      />
      <Route
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
      />
      <Route
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
      />
      <Route
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
      />
      
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <ProductsPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/ingredients"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'ingredients', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <IngredientsPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'suppliers', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <SuppliersPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/notifications"
        element={
          <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <NotificationsPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/recipes"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'recipes', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <RecipesPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/drinks"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'recipes', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <DrinksPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/manual"
        element={
          <ProtectedRoute requiredPermission={{ resource: 'manual', action: 'read' }}>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <ManualEntryPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
      
      {/* Ruta catch-all para páginas no encontradas (404) */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Box component="main" sx={{ flex: 1, py: 1 }}>
                <Container maxWidth="lg" sx={{ py: 0 }}>
                  <NotFoundPage />
                </Container>
              </Box>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

//componente principal que envuelve la app con el AuthProvider
const App = () => {
  // Registrar service worker al cargar la app
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
