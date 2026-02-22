import { Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import ProductsPage from '../pages/ProductsPage';
import IngredientsPage from '../pages/IngredientsPage';
import RecipesPage from '../pages/RecipesPage';
import DrinksPage from '../pages/DrinksPage';
import SuppliersPage from '../pages/SuppliersPage';

/**
 * Rutas relacionadas con productos, ingredientes, recetas y proveedores
 */
export const productRoutes = [
  <Route
    key="products"
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
  />,
  <Route
    key="ingredients"
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
  />,
  <Route
    key="recipes"
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
  />,
  <Route
    key="drinks"
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
  />,
  <Route
    key="suppliers"
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
  />,
];
