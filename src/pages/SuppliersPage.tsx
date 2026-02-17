import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
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

const validateSupplierSku = (sku: string): { valid: boolean; error?: string } => {
  const trimmedSku = sku.trim().toUpperCase();

  // Verificar longitud exacta de 10 caracteres
  if (trimmedSku.length !== 10) {
    return { valid: false, error: 'El SKU debe tener exactamente 10 caracteres' };
  }

  // Verificar que empiece con S (Supplier)
  if (trimmedSku[0] !== 'S') {
    return { valid: false, error: 'El SKU debe empezar con "S" (Supplier)' };
  }

  // Verificar elemento (posiciones 1-2): AL, DK o SL
  const element = trimmedSku.substring(1, 3);
  const validElements = ['AL', 'DK', 'SL'];
  if (!validElements.includes(element)) {
    return {
      valid: false,
      error: `El elemento debe ser AL (General), DK (Drinks) o SL (Salads/Fresh). Actual: ${element}`
    };
  }

  // Verificar número (posiciones 3-6): debe ser 0010, 0020, 0030, etc.
  const numberPart = trimmedSku.substring(3, 7);
  const numberValue = parseInt(numberPart, 10);
  if (Number.isNaN(numberValue)) {
    return { valid: false, error: 'La parte numérica debe ser un número válido' };
  }
  if (numberValue % 10 !== 0) {
    return {
      valid: false,
      error: 'El número debe terminar en 0 (0010, 0020, 0030, etc.)'
    };
  }
  if (numberValue < 10) {
    return { valid: false, error: 'El número debe ser al menos 0010' };
  }
  // Verificar que no esté en el rango reservado 0011-0019
  const lastTwoDigits = numberValue % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return {
      valid: false,
      error: 'El número no puede estar en el rango 0011-0019 (reservado para colisiones)'
    };
  }

  // Verificar código (posiciones 7-9): debe ser 3 letras
  const codePart = trimmedSku.substring(7, 10);
  if (!/^[A-Z]{3}$/.test(codePart)) {
    return { valid: false, error: 'El código final debe ser 3 letras' };
  }

  return { valid: true };
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('edit');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formValues, setFormValues] = useState({
    sku: '',
    name: '',
    nif: '',
    address: '',
    city: '',
    zip: '',
    country: '',
    tel: '',
    contact: '',
    email: ''
  });
  const [duplicateTargetSku, setDuplicateTargetSku] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);

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

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedSupplier(null);
    setFormValues({
      sku: '',
      name: '',
      nif: '',
      address: '',
      city: '',
      zip: '',
      country: '',
      tel: '',
      contact: '',
      email: ''
    });
    setDuplicateTargetSku('');
    setSkuError(null);
    setDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogMode('edit');
    setFormValues({
      sku: supplier.sku || '',
      name: supplier.name || '',
      nif: supplier.nif || '',
      address: supplier.address || '',
      city: supplier.city || '',
      zip: supplier.zip || '',
      country: supplier.country || '',
      tel: supplier.tel || '',
      contact: supplier.contact || '',
      email: supplier.email || ''
    });
    setDuplicateTargetSku('');
    setDialogOpen(true);
  };

  const handleDuplicate = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogMode('duplicate');
    setFormValues({
      sku: '',
      name: '',
      nif: '',
      address: '',
      city: '',
      zip: '',
      country: '',
      tel: '',
      contact: '',
      email: ''
    });
    setDuplicateTargetSku('');
    setDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setConfirmDelete(supplier);
  };

  const confirmDeleteSupplier = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/suppliers/${encodeURIComponent(confirmDelete.sku)}`);
    setConfirmDelete(null);
    await fetchSuppliers();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedSupplier(null);
    setFormValues({
      sku: '',
      name: '',
      nif: '',
      address: '',
      city: '',
      zip: '',
      country: '',
      tel: '',
      contact: '',
      email: ''
    });
    setDuplicateTargetSku('');
    setSkuError(null);
    setProcessing(false);
  };

  const handleDialogSubmit = async () => {
    setProcessing(true);
    try {
      if (dialogMode === 'create') {
        const trimmedSku = formValues.sku.trim();
        const trimmedName = formValues.name.trim();
        if (!trimmedSku || !trimmedName) return;
        await apiClient.post('/suppliers', {
          sku: trimmedSku,
          name: trimmedName,
          nif: formValues.nif,
          address: formValues.address,
          city: formValues.city,
          zip: formValues.zip,
          country: formValues.country,
          tel: formValues.tel,
          contact: formValues.contact,
          email: formValues.email
        });
      } else if (dialogMode === 'edit') {
        if (!selectedSupplier) return;
        const trimmedName = formValues.name.trim();
        if (!trimmedName) return;
        const encodedSku = encodeURIComponent(selectedSupplier.sku);
        await apiClient.put(`/suppliers/${encodedSku}`, {
          name: trimmedName,
          nif: formValues.nif,
          address: formValues.address,
          city: formValues.city,
          zip: formValues.zip,
          country: formValues.country,
          tel: formValues.tel,
          contact: formValues.contact,
          email: formValues.email
        });
      } else {
        if (!selectedSupplier) return;
        if (!duplicateTargetSku.trim()) return;
        const encodedSku = encodeURIComponent(selectedSupplier.sku);
        await apiClient.post(`/suppliers/${encodedSku}/duplicate`, { newSku: duplicateTargetSku.trim() });
      }

      handleDialogClose();
      await fetchSuppliers();
    } catch (error) {
      setError('Error al procesar la solicitud');
      setProcessing(false);
    }
  };

  const duplicateTargetOptions = suppliers.filter((s) => s.sku !== selectedSupplier?.sku);

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Proveedores</Typography>
          <RequirePermission resource="suppliers" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Crear Nuevo
            </Button>
          </RequirePermission>
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
        <Grid item xs={12} md={6} key={supplier.sku}>
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
                <RequirePermission resource="suppliers" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(supplier)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="suppliers" action="create" hide>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleDuplicate(supplier)}
                  >
                    Duplicar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="suppliers" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(supplier)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogMode === 'create'
            ? 'Nuevo proveedor'
            : dialogMode === 'edit'
              ? 'Editar proveedor'
              : 'Duplicar compras a proveedor'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'create' || dialogMode === 'edit' ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {dialogMode === 'create' && (
                <TextField
                  autoFocus
                  margin="dense"
                  label="SKU *"
                  fullWidth
                  required
                  value={formValues.sku}
                  onChange={(event) => {
                    const newSku = event.target.value.toUpperCase();
                    setFormValues({ ...formValues, sku: newSku });
                    if (newSku.trim()) {
                      const validation = validateSupplierSku(newSku);
                      setSkuError(validation.valid ? null : validation.error || null);
                    } else {
                      setSkuError(null);
                    }
                  }}
                  error={!!skuError}
                  helperText={
                    skuError || 'Formato: S[AL|DK|SL][0010|0020|0030...][ABC] (10 caracteres)'
                  }
                  inputProps={{ maxLength: 10 }}
                />
              )}
              <TextField
                autoFocus={dialogMode === 'edit'}
                margin="dense"
                label="Nombre del proveedor *"
                fullWidth
                required
                value={formValues.name}
                onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
              />
              <TextField
                margin="dense"
                label="NIF"
                fullWidth
                value={formValues.nif}
                onChange={(event) => setFormValues({ ...formValues, nif: event.target.value })}
              />
              <TextField
                margin="dense"
                label="Dirección"
                fullWidth
                value={formValues.address}
                onChange={(event) => setFormValues({ ...formValues, address: event.target.value })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  margin="dense"
                  label="Ciudad"
                  fullWidth
                  value={formValues.city}
                  onChange={(event) => setFormValues({ ...formValues, city: event.target.value })}
                />
                <TextField
                  margin="dense"
                  label="Código Postal"
                  fullWidth
                  value={formValues.zip}
                  onChange={(event) => setFormValues({ ...formValues, zip: event.target.value })}
                />
              </Stack>
              <TextField
                margin="dense"
                label="País"
                fullWidth
                value={formValues.country}
                onChange={(event) => setFormValues({ ...formValues, country: event.target.value })}
              />
              <TextField
                margin="dense"
                label="Teléfono"
                fullWidth
                value={formValues.tel}
                onChange={(event) => setFormValues({ ...formValues, tel: event.target.value })}
              />
              <TextField
                margin="dense"
                label="Contacto"
                fullWidth
                value={formValues.contact}
                onChange={(event) => setFormValues({ ...formValues, contact: event.target.value })}
              />
              <TextField
                margin="dense"
                label="Email"
                fullWidth
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues({ ...formValues, email: event.target.value })}
              />
            </Stack>
          ) : (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel id="duplicate-target">Proveedor destino</InputLabel>
                <Select
                  labelId="duplicate-target"
                  label="Proveedor destino"
                  value={duplicateTargetSku}
                  onChange={(event) => setDuplicateTargetSku(event.target.value)}
                >
                  {duplicateTargetOptions.map((s) => (
                    <MenuItem key={s.sku} value={s.sku}>
                      {s.name} ({s.sku})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {duplicateTargetOptions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No hay otros proveedores para copiar las compras.
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Se copiarán las compras de &quot;{selectedSupplier?.name}&quot; al proveedor seleccionado.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleDialogSubmit}
            variant="contained"
            disabled={
              processing ||
              (dialogMode === 'create'
                ? !formValues.sku.trim() ||
                !formValues.name.trim() ||
                !!skuError ||
                !validateSupplierSku(formValues.sku.trim()).valid
                : dialogMode === 'edit'
                  ? !formValues.name.trim()
                  : !duplicateTargetSku.trim() || duplicateTargetOptions.length === 0)
            }
          >
            {dialogMode === 'create' ? 'Crear' : dialogMode === 'edit' ? 'Guardar cambios' : 'Duplicar'}
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


