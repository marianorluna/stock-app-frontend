import { Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import DashboardPage from '../pages/DashboardPage';
import ManualEntryPage from '../pages/ManualEntryPage';
import NotificationsPage from '../pages/NotificationsPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Rutas especiales: dashboard, manual, notificaciones, errores y redirecciones
 */
export const createOtherRoutes = (
  hasRole: (role: string) => boolean,
  hasPermission: (resource: string, action: string) => boolean,
  hasAnyRole: (roles: string[]) => boolean
) => [
  <Route
    key="unauthorized"
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
  />,
  <Route
    key="root"
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
  />,
  <Route
    key="dashboard"
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
  />,
  <Route
    key="manual"
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
  />,
  <Route
    key="notifications"
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
  />,
  <Route
    key="not-found"
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
  />,
];
