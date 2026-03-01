import { Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import ConfiguracionesPage from '../pages/ConfiguracionesPage';
import ActualizarBearerPage from '../pages/configuraciones/ActualizarBearerPage';
import NotificationEmailsPage from '../pages/configuraciones/NotificationEmailsPage';

/**
 * Rutas relacionadas con configuraciones
 * Requieren permiso: config:read
 */
export const configRoutes = [
  <Route
    key="configuraciones"
    path="/configuraciones"
    element={
      <ProtectedRoute requiredPermission={{ resource: 'config', action: 'read' }}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <ConfiguracionesPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
  <Route
    key="configuraciones-bearer"
    path="/configuraciones/bearer"
    element={
      <ProtectedRoute requiredPermission={{ resource: 'config', action: 'read' }}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <ActualizarBearerPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
  <Route
    key="configuraciones-notification-emails"
    path="/configuraciones/notification-emails"
    element={
      <ProtectedRoute requiredPermission={{ resource: 'config', action: 'read' }}>
        <AppShell>
          <Box component="main" sx={{ flex: 1, py: 1 }}>
            <Container maxWidth="lg" sx={{ py: 0 }}>
              <NotificationEmailsPage />
            </Container>
          </Box>
        </AppShell>
      </ProtectedRoute>
    }
  />,
];
