import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import socketClient from '../services/socketClient';
import { useAuth } from './AuthContext';
import apiClient from '../services/apiClient';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  subscribeToPush: () => Promise<void>;
  isPushSupported: boolean;
  pushSubscription: PushSubscription | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Clave pública VAPID - debe coincidir con la del backend
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [isPushSupported, setIsPushSupported] = useState(false);

  // Verificar soporte de Push API
  useEffect(() => {
    setIsPushSupported(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  // Cargar notificaciones del localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('stockearly_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(
          parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        );
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  // Guardar notificaciones en localStorage
  useEffect(() => {
    localStorage.setItem('stockearly_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Agregar notificación
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Mostrar notificación del navegador si está permitido
      if (isPushSupported && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo-stockearly.png',
          badge: '/logo-stockearly.png',
          tag: newNotification.id,
          data: notification.data,
        });
      }

      // Limitar a 100 notificaciones
      setNotifications((prev) => prev.slice(0, 100));
    },
    [isPushSupported]
  );

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Eliminar notificación
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Limpiar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Suscribirse a notificaciones push
  const subscribeToPush = useCallback(async () => {
    if (!isPushSupported || !user) {
      throw new Error('Push notifications no están soportadas o el usuario no está autenticado');
    }

    try {
      // Solicitar permiso
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Permiso de notificaciones denegado');
        }
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Permiso de notificaciones no concedido');
      }

      // Registrar service worker
      const registration = await navigator.serviceWorker.ready;

      // Convertir clave VAPID de base64 a Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Suscribirse
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setPushSubscription(subscription);

      // Enviar suscripción al backend (el userId se obtiene del token de autenticación)
      await apiClient.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });

      console.log('Suscripción a push notifications exitosa');
    } catch (error) {
      console.error('Error suscribiéndose a push notifications:', error);
      throw error;
    }
  }, [isPushSupported, user]);

  // Suscribirse automáticamente a push notifications si el usuario es manager
  useEffect(() => {
    if (!user || !isPushSupported) return;

    // Solo suscribir automáticamente a usuarios con rol manager
    if (user.role === 'manager' && !pushSubscription) {
      // Esperar un poco para asegurar que el service worker esté listo
      const timer = setTimeout(async () => {
        try {
          // Verificar si ya hay permiso
          if (Notification.permission === 'granted') {
            await subscribeToPush();
            console.log('Suscripción automática a push notifications completada para manager');
          } else if (Notification.permission === 'default') {
            // Solicitar permiso automáticamente para managers
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              await subscribeToPush();
              console.log('Suscripción automática a push notifications completada para manager');
            } else {
              console.log('Permiso de notificaciones denegado por el usuario');
            }
          }
        } catch (error) {
          console.error('Error en suscripción automática a push notifications:', error);
        }
      }, 2000); // Esperar 2 segundos para que el service worker esté listo

      return () => clearTimeout(timer);
    }
  }, [user, isPushSupported, pushSubscription, subscribeToPush]);

  // Conectar WebSocket cuando el usuario esté autenticado
  useEffect(() => {
    if (!user) return;

    const socket: Socket = socketClient;

    // Verificar conexión del socket
    if (!socket.connected) {
      console.log('Socket no conectado, intentando conectar...');
      socket.connect();
    }

    console.log('Socket conectado:', socket.connected, 'Socket ID:', socket.id);

    // Escuchar notificaciones del servidor
    const handleNotification = (data: {
      title: string;
      message: string;
      type: Notification['type'];
      data?: Record<string, any>;
    }) => {
      console.log('Notificación recibida vía WebSocket:', data);
      addNotification(data);
    };

    // Escuchar eventos de inventario y convertirlos en notificaciones
    const handleInventorySale = (sale: any) => {
      console.log('Evento inventory:sale recibido:', sale);
      addNotification({
        title: 'Nueva Venta Registrada',
        message: `Se registró una venta de ${sale.lines?.length || 0} items`,
        type: 'success',
        data: { type: 'sale', sale },
      });
    };

    const handleInventoryPurchase = (purchase: any) => {
      console.log('Evento inventory:purchase recibido:', purchase);
      addNotification({
        title: 'Nueva Compra Registrada',
        message: `Se registró una compra de ${purchase.items?.length || 0} items`,
        type: 'info',
        data: { type: 'purchase', purchase },
      });
    };

    const handleInventoryWastage = (wastage: any) => {
      console.log('Evento inventory:wastage recibido:', wastage);
      addNotification({
        title: 'Merma Registrada',
        message: `Se registró una merma de ${wastage.items?.length || 0} items`,
        type: 'warning',
        data: { type: 'wastage', wastage },
      });
    };

    // Escuchar eventos de conexión/desconexión
    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket desconectado');
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión del socket:', error);
    });

    // Registrar listeners
    socket.on('notification', handleNotification);
    socket.on('inventory:sale', handleInventorySale);
    socket.on('inventory:purchase', handleInventoryPurchase);
    socket.on('inventory:wastage', handleInventoryWastage);

    // Unirse a la sala del usuario para recibir notificaciones personalizadas
    socket.emit('join:user', { userId: user.id });
    console.log('Solicitado unirse a sala de usuario:', user.id);

    return () => {
      console.log('Limpiando listeners de socket');
      socket.off('notification', handleNotification);
      socket.off('inventory:sale', handleInventorySale);
      socket.off('inventory:purchase', handleInventoryPurchase);
      socket.off('inventory:wastage', handleInventoryWastage);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [user, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        subscribeToPush,
        isPushSupported,
        pushSubscription,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Helper para convertir clave VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
