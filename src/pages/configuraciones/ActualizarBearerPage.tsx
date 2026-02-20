import { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';

// Función para decodificar JWT sin verificar la firma
const decodeJWT = (token: string): { iat?: number; exp?: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    return null;
  }
};

// Función para formatear fecha a DD-MM-YYYY
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // JWT usa segundos, JS usa milisegundos
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

interface BearerInfo {
  createdAt: string | null;
  expiresAt: string | null;
}

const ActualizarBearerPage = () => {
  const navigate = useNavigate();
  const [bearerValue, setBearerValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentBearerInfo, setCurrentBearerInfo] = useState<BearerInfo | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  // Limpiar el input cada vez que se entra a la página
  useEffect(() => {
    setBearerValue('');
    setError(null);
    setSuccess(null);
    setConfirmDialogOpen(false);
    loadCurrentBearer();
  }, []);

  // Cargar información del bearer actual guardado
  const loadCurrentBearer = async () => {
    try {
      setLoadingCurrent(true);
      const { data } = await apiClient.get<{ success: boolean; value: string | null; createdAt?: string; expiresAt?: string }>('/config/bearer');
      if (data.value) {
        const decoded = decodeJWT(data.value);
        if (decoded && decoded.iat && decoded.exp) {
          setCurrentBearerInfo({
            createdAt: formatDate(decoded.iat),
            expiresAt: formatDate(decoded.exp)
          });
        } else {
          setCurrentBearerInfo(null);
        }
      } else {
        setCurrentBearerInfo(null);
      }
    } catch (err) {
      console.error('Error cargando bearer actual:', err);
      setCurrentBearerInfo(null);
    } finally {
      setLoadingCurrent(false);
    }
  };

  // Decodificar el bearer ingresado en el input
  const inputBearerInfo = useMemo((): BearerInfo | null => {
    if (!bearerValue.trim()) return null;
    
    const decoded = decodeJWT(bearerValue.trim());
    if (decoded && decoded.iat && decoded.exp) {
      return {
        createdAt: formatDate(decoded.iat),
        expiresAt: formatDate(decoded.exp)
      };
    }
    return null;
  }, [bearerValue]);

  const handleUpdate = () => {
    if (!bearerValue.trim()) {
      setError('El valor del bearer no puede estar vacío');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmUpdate = async () => {
    setConfirmDialogOpen(false);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put('/config/bearer', { value: bearerValue.trim() });
      setSuccess('Bearer actualizado exitosamente');
      // Limpiar el input después de actualizar exitosamente
      setBearerValue('');
      // Recargar información del bearer actual
      await loadCurrentBearer();
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar el bearer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmDialogOpen(false);
  };

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Button variant="text" onClick={() => navigate('/configuraciones')}>
            ← Volver
          </Button>
          <Typography variant="h4">Actualizar Bearer</Typography>
        </Stack>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h6">Configuración del Bearer Token</Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresa el nuevo valor del bearer token para la API de Qamarero. Este valor se guardará en la base de datos y reemplazará el valor anterior.
              </Typography>

              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" onClose={() => setSuccess(null)}>
                  {success}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Bearer Token"
                value={bearerValue}
                onChange={(e) => setBearerValue(e.target.value)}
                placeholder="Ingresa el bearer token"
                multiline
                rows={4}
                disabled={loading}
              />

              {/* Card con información del bearer ingresado */}
              {inputBearerInfo && (
                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Información del Bearer Ingresado
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Fecha de Creación:</strong> {inputBearerInfo.createdAt}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Fecha de Vencimiento:</strong> {inputBearerInfo.expiresAt}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/configuraciones')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdate}
                  disabled={loading || !bearerValue.trim()}
                >
                  {loading ? <CircularProgress size={24} /> : 'Actualizar'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Card con información del bearer actual guardado */}
      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bearer Actual en Base de Datos
            </Typography>
            {loadingCurrent ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : currentBearerInfo ? (
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Fecha de Creación:</strong> {currentBearerInfo.createdAt}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha de Vencimiento:</strong> {currentBearerInfo.expiresAt}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay bearer configurado o el bearer no contiene información de fechas válida.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Diálogo de confirmación */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar actualización</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de modificar el valor del bearer en la base de datos. El valor anterior será reemplazado por el nuevo valor.
            <br />
            <br />
            ¿Estás seguro de que deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmUpdate}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Aceptar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default ActualizarBearerPage;
