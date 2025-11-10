import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import apiClient from '../services/apiClient';
import type { Supplier } from '../types';

const formatDate = (value: string | null) => {
  if (!value) return 'Sin registros';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registros';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'duplicate'>('edit');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formValue, setFormValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Supplier[]>('/suppliers');
      setSuppliers(data);
      setError(null);
    } catch {
      setError('Error cargando proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return suppliers;
    return suppliers.filter((supplier) => supplier.name.toLowerCase().includes(normalizedTerm));
  }, [suppliers, searchTerm]);

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogMode('edit');
    setFormValue(supplier.name);
    setDialogOpen(true);
  };

  const handleDuplicate = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogMode('duplicate');
    setFormValue(`${supplier.name} (copia)`);
    setDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setConfirmDelete(supplier);
  };

  const confirmDeleteSupplier = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/suppliers/${encodeURIComponent(confirmDelete.name)}`);
    setConfirmDelete(null);
    await fetchSuppliers();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedSupplier(null);
    setFormValue('');
    setProcessing(false);
  };

  const handleDialogSubmit = async () => {
    if (!selectedSupplier) return;
    const trimmed = formValue.trim();
    if (!trimmed) return;
    setProcessing(true);
    const encodedName = encodeURIComponent(selectedSupplier.name);

    if (dialogMode === 'edit') {
      await apiClient.put(`/suppliers/${encodedName}`, { newName: trimmed });
    } else {
      await apiClient.post(`/suppliers/${encodedName}/duplicate`, { newName: trimmed });
    }

    handleDialogClose();
    await fetchSuppliers();
  };

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Proveedores</Typography>
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          placeholder="Buscar proveedores"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Grid>

      {loading && (
        <Grid item xs={12}>
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        </Grid>
      )}

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      {!loading && filteredSuppliers.length === 0 && (
        <Grid item xs={12}>
          <Alert severity="info">No se encontraron proveedores con el criterio ingresado.</Alert>
        </Grid>
      )}

      {filteredSuppliers.map((supplier) => (
        <Grid item xs={12} md={6} key={supplier.name}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{supplier.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total de compras: {supplier.totalPurchases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Última compra: {formatDate(supplier.lastPurchase)}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={() => handleEdit(supplier)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleDuplicate(supplier)}
                >
                  Duplicar
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={() => handleDelete(supplier)}
                >
                  Eliminar
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>{dialogMode === 'edit' ? 'Editar proveedor' : 'Duplicar proveedor'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del proveedor"
            fullWidth
            value={formValue}
            onChange={(event) => setFormValue(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleDialogSubmit} variant="contained" disabled={processing || !formValue.trim()}>
            {dialogMode === 'edit' ? 'Guardar cambios' : 'Duplicar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar al proveedor "{confirmDelete?.name}"? Esto eliminará la referencia de sus compras.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteSupplier}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default SuppliersPage;


