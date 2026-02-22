import { Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

/**
 * Rutas públicas que no requieren autenticación
 */
export const publicRoutes = [
  <Route key="login" path="/login" element={<LoginPage />} />,
];
