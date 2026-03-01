import { io } from 'socket.io-client';

// En desarrollo, usar '/' para que Vite proxy funcione correctamente
// En producción, usar VITE_SOCKET_URL si está definida, o el mismo origen
const socketUrl =
  import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim().length > 0
    ? import.meta.env.VITE_SOCKET_URL
    : import.meta.env.DEV
      ? '/' // En desarrollo, usar el proxy de Vite
      : window.location.origin; // En producción, usar el mismo origen

const socketClient = io(socketUrl, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  path: '/socket.io', // Asegurar que use el path correcto para el proxy
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default socketClient;

