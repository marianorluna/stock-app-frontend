import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TagIcon from '@mui/icons-material/Tag';
import { useForm, Controller, useWatch } from 'react-hook-form';
import apiClient from '../services/apiClient';
import { RequirePermission } from '../components/auth/RequirePermission';
import type { Supplier } from '../types';

// Mapeo categoryName → elemento SKU (según SKU_ELEMENTS.md, sección Proveedores)
const CATEGORY_ELEMENT_MAP: Record<string, string> = {
  'All/General':     'GN',
  'Drinks':          'BB',
  'Salads/Fresh':    'FR'
};

const SUPPLIER_CATEGORIES = Object.keys(CATEGORY_ELEMENT_MAP);

// Genera un código de 3 letras a partir del nombre
const nameToCode = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.substring(0, 3).padEnd(3, 'X');
};

// Genera un SKU único y correlativo para un proveedor
const generateSupplierSku = (
  categoryName: string,
  name: string,
  existingSkus: string[]
): string => {
  const element = CATEGORY_ELEMENT_MAP[categoryName];
  if (!element || !name.trim()) return '';

  const prefix = `S${element}`;

  // Extraer números existentes para este elemento (formato: S[EL][4 dígitos][3 letras])
  const existingNumbers = existingSkus
    .filter((sku) => sku.startsWith(prefix) && sku.length === 10)
    .map((sku) => parseInt(sku.substring(3, 7), 10))
    .filter((n) => !isNaN(n) && n % 10 === 0) // Solo números válidos (múltiplos de 10)
    .filter((n) => {
      // Excluir rango reservado 0011-0019
      const lastTwoDigits = n % 100;
      return !(lastTwoDigits >= 11 && lastTwoDigits <= 19);
    });

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 10;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  const code = nameToCode(name);

  const candidate = `${prefix}${paddedNumber}${code}`;

  // Si el candidato ya existe, usar el reservado +1
  if (existingSkus.includes(candidate)) {
    const fallbackNumber = nextNumber + 1;
    return `${prefix}${String(fallbackNumber).padStart(4, '0')}${code}`;
  }

  return candidate;
};

type SupplierFormValues = {
  categoryName: string;
  name: string;
  nif: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  tel: string;
  contact: string;
  email: string;
};

const defaultValues: SupplierFormValues = {
  categoryName: '',
  name: '',
  nif: '',
  address: '',
  city: '',
  zip: '',
  country: '',
  tel: '',
  contact: '',
  email: ''
};

// Sub-componente para preview del SKU (se actualiza reactivamente)
const SkuPreview = ({
  control,
  existingSkus,
  editSku
}: {
  control: ReturnType<typeof useForm<SupplierFormValues>>['control'];
  existingSkus: string[];
  editSku?: string;
}) => {
  const name = useWatch({ control, name: 'name' });
  const categoryName = useWatch({ control, name: 'categoryName' });

  const sku = editSku ?? generateSupplierSku(categoryName, name, existingSkus);

  if (!sku) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <TagIcon fontSize="small" color="primary" />
      <Typography variant="body2" color="text.secondary">
        SKU generado:
      </Typography>
      <Typography variant="body2" fontWeight={700} fontFamily="monospace">
        {sku}
      </Typography>
    </Box>
  );
};

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
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('edit');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);
  const [processing, setProcessing] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting }
  } = useForm<SupplierFormValues>({ defaultValues });

  const existingSkus = useMemo(() => suppliers.map((s) => s.sku).filter(Boolean), [suppliers]);

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
    reset(defaultValues);
    setDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogMode('edit');
    reset({
      categoryName: '', // Las categorías existentes no están almacenadas, se deriva del SKU
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
    reset(defaultValues);
    setProcessing(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    setProcessing(true);
    try {
      if (dialogMode === 'create') {
        const sku = generateSupplierSku(values.categoryName, values.name, existingSkus);
        if (!sku) {
          setProcessing(false);
          return;
        }
        await apiClient.post('/suppliers', {
          sku,
          name: values.name.trim(),
          nif: values.nif,
          address: values.address,
          city: values.city,
          zip: values.zip,
          country: values.country,
          tel: values.tel,
          contact: values.contact,
          email: values.email
        });
      } else if (dialogMode === 'edit') {
        if (!selectedSupplier) {
          setProcessing(false);
          return;
        }
        const encodedSku = encodeURIComponent(selectedSupplier.sku);
        await apiClient.put(`/suppliers/${encodedSku}`, {
          name: values.name.trim(),
          nif: values.nif,
          address: values.address,
          city: values.city,
          zip: values.zip,
          country: values.country,
          tel: values.tel,
          contact: values.contact,
          email: values.email
        });
      }

      handleDialogClose();
      await fetchSuppliers();
    } catch (error) {
      setError('Error al procesar la solicitud');
      setProcessing(false);
    }
  });

  const isEditMode = dialogMode === 'edit';

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
      {!loading && (
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'proveedor' : 'proveedores'}
          </Typography>
        </Grid>
      )}

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
                <Typography component="span" variant="body2" fontFamily="monospace">{supplier.sku}</Typography>
                {' · Total de compras: '}{supplier.totalPurchases}
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
          {dialogMode === 'create' ? 'Crear nuevo proveedor' : 'Editar proveedor'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
              {isEditMode ? (
                // En edición: mostrar SKU como solo lectura
                <TextField
                  label="SKU"
                  value={selectedSupplier?.sku ?? ''}
                  InputProps={{ readOnly: true }}
                  helperText="El SKU es inmutable"
                />
              ) : (
                // En creación / duplicación: selector de categoría + preview SKU
                <Stack spacing={2}>
                  <Controller
                    control={control}
                    name="categoryName"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <TextField
                        select
                        label="Categoría *"
                        {...field}
                        helperText="La categoría determina el elemento del SKU"
                      >
                        {SUPPLIER_CATEGORIES.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({CATEGORY_ELEMENT_MAP[cat]})</Typography>
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <SkuPreview
                    control={control}
                    existingSkus={existingSkus}
                  />
                </Stack>
              )}
              <Controller
                control={control}
                name="name"
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    autoFocus={isEditMode}
                    label="Nombre del proveedor *"
                    {...field}
                  />
                )}
              />
              <Controller
                control={control}
                name="nif"
                render={({ field }) => <TextField label="NIF" {...field} />}
              />
              <Controller
                control={control}
                name="address"
                render={({ field }) => <TextField label="Dirección" {...field} />}
              />
              <Stack direction="row" spacing={2}>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => <TextField label="Ciudad" fullWidth {...field} />}
                />
                <Controller
                  control={control}
                  name="zip"
                  render={({ field }) => <TextField label="Código Postal" fullWidth {...field} />}
                />
              </Stack>
              <Controller
                control={control}
                name="country"
                render={({ field }) => <TextField label="País" {...field} />}
              />
              <Controller
                control={control}
                name="tel"
                render={({ field }) => <TextField label="Teléfono" {...field} />}
              />
              <Controller
                control={control}
                name="contact"
                render={({ field }) => <TextField label="Contacto" {...field} />}
              />
              <Controller
                control={control}
                name="email"
                render={({ field }) => <TextField label="Email" type="email" {...field} />}
              />
            </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={processing || isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            disabled={processing || isSubmitting}
          >
            {dialogMode === 'create' ? 'Crear' : 'Guardar cambios'}
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
