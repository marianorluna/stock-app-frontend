// Service Worker para Web Push Notifications
// Este es un template. El archivo sw.js se genera automáticamente con la clave VAPID.
const CACHE_NAME = 'stockearly-v1';
const VAPID_PUBLIC_KEY = '%VITE_VAPID_PUBLIC_KEY%';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(self.clients.claim());
});

// Manejar mensajes push
self.addEventListener('push', (event) => {
  console.log('Push recibido:', event);

  let notificationData = {
    title: 'Stockearly',
    body: 'Tienes una nueva notificación',
    icon: '/logo-stockearly.png',
    badge: '/logo-stockearly.png',
    tag: 'stockearly-notification',
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || data.id || notificationData.tag,
        data: data.data || {},
      };
    } catch (error) {
      console.error('Error parseando datos push:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Abrir',
        },
        {
          action: 'close',
          title: 'Cerrar',
        },
      ],
    })
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Manejar notificaciones cerradas
self.addEventListener('notificationclose', (event) => {
  console.log('Notificación cerrada:', event);
});
