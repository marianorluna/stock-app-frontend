import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { registerServiceWorker } from './utils/registerServiceWorker';
import { AppRoutes } from './routes';

/**
 * Componente principal que envuelve la app con los providers necesarios
 */
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
