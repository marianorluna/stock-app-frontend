export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no están soportados');
    return null;
  }

  try {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
    
    if (!vapidKey) {
      console.warn('⚠️ VAPID_PUBLIC_KEY no configurada. Las notificaciones push no funcionarán.');
      console.warn('   Configura VITE_VAPID_PUBLIC_KEY en tu archivo .env');
    }

    // Registrar el service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker registrado:', registration);

    // Esperar a que el service worker esté activo
    if (registration.installing) {
      console.log('Service Worker instalando...');
    } else if (registration.waiting) {
      console.log('Service Worker esperando...');
    } else if (registration.active) {
      console.log('Service Worker activo');
    }

    return registration;
  } catch (error) {
    console.error('❌ Error registrando Service Worker:', error);
    return null;
  }
};
