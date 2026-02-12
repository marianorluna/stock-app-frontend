import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

//configuración de Firebase desde variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBL-eefBi23wFPcwMzfLjTuOtljHJmhjhU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'stockearly-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'stockearly-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'stockearly-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '586677957810',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:586677957810:web:c331befe10c240c43a05ab'
};

let app: FirebaseApp;
let auth: Auth;

//inicializar Firebase solo si no está ya inicializado
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
}

export { app, auth };
export default app;

