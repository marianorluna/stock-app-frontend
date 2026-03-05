import { Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useInventoryStore } from '../hooks/useInventoryStore';
import socketClient from '../services/socketClient';
import { useEffect } from 'react';
import { publicRoutes } from './publicRoutes';
import { inventoryRoutes } from './inventoryRoutes';
import { productRoutes } from './productRoutes';
import { configRoutes } from './configRoutes';
import { createOtherRoutes } from './otherRoutes';

/**
 * Componente principal que maneja todas las rutas de la aplicación
 * Inicializa el snapshot del inventario y registra listeners de websocket
 */
export const AppRoutes = () => {
  const { user, hasPermission, hasRole, hasAnyRole } = useAuth();
  const { fetchSnapshot, registerSocketListeners } = useInventoryStore();

  // Inicializa el snapshot del inventario y registra listeners de websocket cuando el usuario está autenticado
  useEffect(() => {
    if (user) {
      // Solo intentar cargar el snapshot si el usuario tiene el permiso necesario
      if (hasPermission('inventory', 'read')) {
        fetchSnapshot();
      }
      const cleanup = registerSocketListeners(socketClient);
      return () => {
        cleanup();
      };
    }
  }, [user, fetchSnapshot, registerSocketListeners, hasPermission]);

  const otherRoutes = createOtherRoutes(hasRole, hasPermission, hasAnyRole);

  return (
    <Routes>
      {publicRoutes}
      {otherRoutes}
      {inventoryRoutes}
      {productRoutes}
      {configRoutes}
    </Routes>
  );
};
