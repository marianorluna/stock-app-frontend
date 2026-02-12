import axios from 'axios';
import { auth } from '../config/firebase';

const apiBaseUrl =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim().length > 0
    ? import.meta.env.VITE_API_URL
    : '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl
});

//duración de la sesión: 2 días en milisegundos
const SESSION_DURATION_MS = 1 * 24 * 60 * 60 * 1000; //1 día

//verifica si la sesión ha expirado
const isSessionExpired = (): boolean => {
  const loginTime = localStorage.getItem('stockearly_login_time');
  if (!loginTime) {
    return true;
  }
  const loginTimestamp = parseInt(loginTime, 10);
  const now = Date.now();
  return (now - loginTimestamp) > SESSION_DURATION_MS;
};

//interceptor que agrega el token de Firebase a todas las peticiones
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    //si no hay loginTime guardado pero hay usuario, significa que Firebase restauró la sesión
    //guardamos el tiempo actual para continuar la sesión
    const loginTime = localStorage.getItem('stockearly_login_time');
    if (!loginTime) {
      localStorage.setItem('stockearly_login_time', Date.now().toString());
    } else {
      //si hay loginTime, verificar si la sesión ha expirado
      if (isSessionExpired()) {
        //forzar logout si la sesión expiró
        await auth.signOut();
        localStorage.removeItem('stockearly_user');
        localStorage.removeItem('stockearly_token');
        localStorage.removeItem('stockearly_login_time');
        //rechazar la petición con un error 401
        return Promise.reject({
          response: {
            status: 401,
            data: { message: 'Sesión expirada. Por favor, inicia sesión nuevamente.' }
          }
        });
      }
    }

    const token = await user.getIdToken();
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

//interceptor que maneja errores 401 y refresca el token si es necesario
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const user = auth.currentUser;
      if (user) {
        //verificar si es por expiración de sesión (1 día)
        const loginTime = localStorage.getItem('stockearly_login_time');
        if (loginTime && isSessionExpired()) {
          await auth.signOut();
          localStorage.removeItem('stockearly_user');
          localStorage.removeItem('stockearly_token');
          localStorage.removeItem('stockearly_login_time');
          return Promise.reject({
            response: {
              status: 401,
              data: { message: 'Sesión expirada. Por favor, inicia sesión nuevamente.' }
            }
          });
        }

        //token expirado (1 hora), intentar refrescar
        const token = await user.getIdToken(true); //forzar refresh
        error.config.headers.Authorization = `Bearer ${token}`;
        return apiClient.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

