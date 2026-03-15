import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Configuración del SDK web de Firebase.
// Estas variables NO son secretos de servidor: son públicas por diseño y el
// navegador siempre puede verlas. La seguridad depende de:
//   1. Firebase Security Rules (Firestore/Storage)
//   2. Firebase Auth (solo usuarios autenticados acceden a datos)
//   3. Restricción de dominio en Google Cloud Console → Credentials → HTTP referrers
// Ref: https://firebase.google.com/docs/projects/api-keys
//
// Los valores se leen de .env (ignorado por Git). En producción (Vercel, etc.)
// definir las mismas variables VITE_FIREBASE_* en el panel del proyecto.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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

