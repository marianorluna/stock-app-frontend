import { io } from 'socket.io-client';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim().length > 0
    ? import.meta.env.VITE_SOCKET_URL
    : '/';

const socketClient = io(socketUrl, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

export default socketClient;

