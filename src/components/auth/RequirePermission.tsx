import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RequirePermissionProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
  hide?: boolean; //si es true, oculta el elemento en lugar de mostrar fallback
}

//componente que muestra contenido solo si el usuario tiene el permiso requerido
export const RequirePermission = ({ 
  resource, 
  action, 
  children, 
  fallback = null,
  hide = false 
}: RequirePermissionProps) => {
  const { hasPermission } = useAuth();

  if (hasPermission(resource, action)) {
    return <>{children}</>;
  }

  if (hide) {
    return null;
  }

  return <>{fallback}</>;
};

