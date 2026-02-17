import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import apiClient from '../services/apiClient';
import socketClient from '../services/socketClient';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'stock' | 'sale' | 'purchase' | 'wastage';
  read: boolean;
  createdAt: string;
  updatedAt: string;
  data?: {
    reportedBy?: {
      name: string;
    };
    [key: string]: any;
  };
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'success':
    case 'sale':
      return <CheckCircleIcon color="success" />;
    case 'warning':
    case 'stock':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'purchase':
    case 'wastage':
    case 'info':
    default:
      return <InfoIcon color="info" />;
  }
};

const getTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (type) {
    case 'success':
    case 'sale':
      return 'success';
    case 'warning':
    case 'stock':
      return 'warning';
    case 'error':
      return 'error';
    case 'purchase':
    case 'wastage':
    case 'info':
    default:
      return 'info';
  }
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteReadDialogOpen, setDeleteReadDialogOpen] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const { data } = await apiClient.get<{ notifications: Notification[] }>(
        `/notifications/all${params.toString() ? `?${params.toString()}` : ''}`
      );
      // Filtrar solo las notificaciones del usuario activo
      const userNotifications = user
        ? data.notifications.filter(notif =>
          notif.userId && notif.userId._id === user.id
        )
        : [];
      setNotifications(userNotifications);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error cargando notificaciones');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo, user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Escuchar notificaciones en tiempo real vía WebSocket
  useEffect(() => {
    let debounceTimer: number | null = null;
    let isRefreshing = false;

    // Función para recargar notificaciones con debounce
    const refreshNotifications = () => {
      // Si ya se está refrescando, ignorar
      if (isRefreshing) {
        return;
      }

      // Limpiar timer anterior si existe
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Esperar 500ms antes de recargar para evitar múltiples recargas
      debounceTimer = setTimeout(async () => {
        isRefreshing = true;
        try {
          await fetchNotifications();
        } finally {
          isRefreshing = false;
        }
      }, 500);
    };

    // Escuchar solo el evento 'notification' que viene después de guardar en BD
    // No escuchar los eventos de inventario porque causan recargas duplicadas
    const handleNotification = (data: {
      title: string;
      message: string;
      type: string;
      data?: Record<string, any>;
    }) => {
      console.log('Nueva notificación recibida en NotificationsPage:', data);
      refreshNotifications();
    };

    // Registrar listener solo para 'notification'
    socketClient.on('notification', handleNotification);

    return () => {
      // Limpiar timer y listener al desmontar
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      socketClient.off('notification', handleNotification);
    };
  }, [fetchNotifications]);

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/notifications/${notificationToDelete._id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationToDelete._id));
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error eliminando notificación');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setNotificationToDelete(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = searchTerm || dateFrom || dateTo;

  const readNotificationsCount = notifications.filter(n => n.read).length;

  const handleDeleteReadClick = () => {
    setDeleteReadDialogOpen(true);
  };

  const handleDeleteReadConfirm = async () => {
    setDeletingRead(true);
    try {
      await apiClient.delete('/notifications/read');
      setNotifications((prev) => prev.filter((n) => !n.read));
      setDeleteReadDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error eliminando notificaciones leídas');
    } finally {
      setDeletingRead(false);
    }
  };

  const handleDeleteReadCancel = () => {
    setDeleteReadDialogOpen(false);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Notificaciones
        </Typography>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Buscar por palabra en título o mensaje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="date"
                label="Fecha desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                fullWidth
                type="date"
                label="Fecha hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon />
                    </InputAdornment>
                  )
                }}
              />
              {hasFilters && (
                <Button variant="outlined" onClick={clearFilters} sx={{ minWidth: 120 }}>
                  Limpiar
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {readNotificationsCount > 0 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleDeleteReadClick}
            fullWidth
            sx={{
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Eliminar Notificaciones Leídas ({readNotificationsCount})
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              {hasFilters ? 'No se encontraron notificaciones con los filtros aplicados' : 'No hay notificaciones'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {notifications.map((notification) => (
            <Paper key={notification._id} elevation={1} sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ pt: 0.5 }}>{getTypeIcon(notification.type)}</Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" component="h3">
                      {notification.title}
                    </Typography>
                    <Chip
                      label={notification.type}
                      color={getTypeColor(notification.type)}
                      size="small"
                    />
                    {notification.read && (
                      <Chip label="Leída" size="small" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {notification.message}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(notification.createdAt)}
                    </Typography>
                    {notification.type === 'wastage' && notification.data?.reportedBy ? (
                      <Typography variant="caption" color="text.secondary">
                        Registrada por: {notification.data.reportedBy.name}
                      </Typography>
                    ) : notification.type !== 'stock' && notification.userId ? (
                      <Typography variant="caption" color="text.secondary">
                        Usuario: {notification.userId.name} ({notification.userId.email})
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteClick(notification)}
                  size="small"
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Eliminar Notificación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar esta notificación?
          </Typography>
          {notificationToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {notificationToDelete.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {notificationToDelete.message}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteReadDialogOpen} onClose={handleDeleteReadCancel}>
        <DialogTitle>Eliminar Notificaciones Leídas</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar todas las notificaciones leídas?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Se eliminarán {readNotificationsCount} notificación{readNotificationsCount !== 1 ? 'es' : ''} leída{readNotificationsCount !== 1 ? 's' : ''}. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteReadCancel} disabled={deletingRead}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteReadConfirm}
            color="error"
            variant="contained"
            disabled={deletingRead}
          >
            {deletingRead ? <CircularProgress size={20} /> : 'Eliminar todas'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationsPage;
