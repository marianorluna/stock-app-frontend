import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import apiClient from '../services/apiClient';

interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'operator' | 'guest';
  permissions: Array<{
    name: string;
    resource: string;
    action: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

//duración de la sesión: 1 día en milisegundos
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

//guarda la fecha de login
const saveLoginTime = () => {
  localStorage.setItem('stockearly_login_time', Date.now().toString());
};

//limpia todos los datos de sesión
const clearSession = () => {
  localStorage.removeItem('stockearly_user');
  localStorage.removeItem('stockearly_token');
  localStorage.removeItem('stockearly_login_time');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  //sincroniza usuario con backend después de autenticación
  const syncUser = async (idToken: string) => {
    try {
      const response = await apiClient.post('/auth/sync', { idToken });
      setUser(response.data.user);
      localStorage.setItem('stockearly_user', JSON.stringify(response.data.user));
    } catch (error: any) {
      console.error('Error syncing user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al sincronizar usuario';
      throw new Error(errorMessage);
    }
  };

  //función para forzar logout cuando la sesión expira
  const forceLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error during forced logout:', error);
    }
    setUser(null);
    setFirebaseUser(null);
    clearSession();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        //si no hay loginTime guardado, significa que Firebase restauró la sesión automáticamente
        //en ese caso, guardamos el tiempo actual para continuar la sesión
        const loginTime = localStorage.getItem('stockearly_login_time');
        if (!loginTime) {
          saveLoginTime();
        } else {
          //si hay loginTime, verificar si la sesión ha expirado
          if (isSessionExpired()) {
            console.log('Sesión expirada, cerrando sesión...');
            await forceLogout();
            setLoading(false);
            return;
          }
        }

        const idToken = await firebaseUser.getIdToken();
        await syncUser(idToken);
      } else {
        setUser(null);
        clearSession();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  //verificar expiración periódicamente (cada 5 minutos)
  useEffect(() => {
    if (!firebaseUser) return;

    const checkSessionInterval = setInterval(() => {
      if (isSessionExpired()) {
        console.log('Sesión expirada, cerrando sesión...');
        forceLogout();
      }
    }, 5 * 60 * 1000); //Verificar cada 5 minutos

    return () => clearInterval(checkSessionInterval);
  }, [firebaseUser]);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem('stockearly_token', idToken);
    saveLoginTime(); //guardar fecha de login
    await syncUser(idToken);
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      //actualizar el perfil del usuario en Firebase con el nombre
      await updateProfile(userCredential.user, { displayName: name });
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('stockearly_token', idToken);
      saveLoginTime(); //guardar fecha de login
      await syncUser(idToken);
    } catch (error: any) {
      //si el error es de Firebase, lanzarlo directamente
      if (error.code?.startsWith('auth/')) {
        throw error;
      }
      //si es error de sincronización, lanzarlo
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    clearSession();
  };

  //verifica si el usuario tiene un permiso específico
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.some(
      p => p.resource === resource && p.action === action
    );
  };

  //verifica si el usuario tiene un rol específico
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  //verifica si el usuario tiene alguno de los roles especificados
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        register,
        logout,
        hasPermission,
        hasRole,
        hasAnyRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

