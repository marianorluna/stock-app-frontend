import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import type { Beverage } from '../types';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TagIcon from '@mui/icons-material/Tag';

// Mapeo categoryName → elemento SKU (según SKU_ELEMENTS.md, sección Bebidas)
const CATEGORY_ELEMENT_MAP: Record<string, string> = {
  'Bebidas': 'BD',
  'Copa de vino': 'CV',
  'Bebida premium': 'BP',
  'Botella': 'BT'
};

const BEVERAGE_CATEGORIES = Object.keys(CATEGORY_ELEMENT_MAP);

// Genera un código de 3 letras a partir del nombre
const nameToCode = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.substring(0, 3).padEnd(3, 'X');
};

// Genera un SKU único y correlativo para una bebida
const generateBeverageSku = (
  categoryName: string,
  name: string,
  existingSkus: string[]
): string => {
  const element = CATEGORY_ELEMENT_MAP[categoryName];
  if (!element || !name.trim()) return '';

  const prefix = `B${element}`;

  // Extraer números existentes para este elemento (formato: B[EL][4 dígitos][3 letras])
  const existingNumbers = existingSkus
    .filter((sku) => sku.startsWith(prefix) && sku.length === 10)
    .map((sku) => parseInt(sku.substring(3, 7), 10))
    .filter((n) => !isNaN(n));

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

type BeverageFormValues = {
  name: string;
  categoryName: string;
  stock: number;
  reorderPoint: number;
  allergens: string[];
  codeArticlePurchase: string;
};

const defaultValues: BeverageFormValues = {
  name: '',
  categoryName: '',
  stock: 0,
  reorderPoint: 0,
  allergens: [],
  codeArticlePurchase: ''
};

// Alérgenos comunes
const commonAllergens = ['huevo', 'lacteos', 'gluten', 'frutos secos', 'pescado', 'sulfitos'];

// Sub-componente para preview del SKU (se actualiza reactivamente)
const SkuPreview = ({
  control,
  existingSkus,
  editSku
}: {
  control: ReturnType<typeof useForm<BeverageFormValues>>['control'];
  existingSkus: string[];
  editSku?: string;
}) => {
  const name = useWatch({ control, name: 'name' });
  const categoryName = useWatch({ control, name: 'categoryName' });

  const sku = editSku ?? generateBeverageSku(categoryName, name, existingSkus);

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

const DrinksPage = () => {
  const { beverages, fetchBeverages, error } = useInventoryStore((state) => ({
    beverages: state.beverages,
    fetchBeverages: state.fetchBeverages,
    error: state.error
  }));

  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedDrink, setSelectedDrink] = useState<Beverage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Beverage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { isSubmitting }
  } = useForm<BeverageFormValues>({ defaultValues });

  useEffect(() => {
    void fetchBeverages();
  }, [fetchBeverages]);

  const existingSkus = useMemo(() => beverages.map((b) => b.sku).filter(Boolean), [beverages]);

  const filteredDrinks = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return beverages;
    return beverages.filter((drink) => drink.name.toLowerCase().includes(normalizedTerm));
  }, [beverages, searchTerm]);

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedDrink(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDrink(null);
  };

  const handleEdit = (drink: Beverage) => {
    setDialogMode('edit');
    setSelectedDrink(drink);
    reset({
      name: drink.name,
      categoryName: drink.categoryName ?? '',
      stock: drink.stock,
      reorderPoint: drink.reorderPoint ?? 0,
      allergens: drink.allergens ?? [],
      codeArticlePurchase: drink.codeArticlePurchase ?? ''
    });
    setOpen(true);
  };

  const handleDelete = (drink: Beverage) => {
    setConfirmDelete(drink);
  };

  const confirmDeleteDrink = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/beverages/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchBeverages();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (dialogMode === 'edit' && selectedDrink) {
      // En edición: no cambiar el SKU
      await apiClient.put<Beverage>(`/beverages/${selectedDrink._id}`, {
        name: values.name,
        stock: values.stock,
        reorderPoint: values.reorderPoint,
        allergens: values.allergens,
        codeArticlePurchase: values.codeArticlePurchase
      });
    } else {
      // En creación: generar SKU automáticamente
      const sku = generateBeverageSku(values.categoryName, values.name, existingSkus);
      if (!sku) return;
      await apiClient.post<Beverage>('/beverages', { ...values, sku });
    }
    setOpen(false);
    setSelectedDrink(null);
    await fetchBeverages();
  });

  const dialogTitle = dialogMode === 'edit' ? 'Editar bebida' : 'Crear nueva bebida';

  const isEditMode = dialogMode === 'edit';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Bebidas</Typography>
          <RequirePermission resource="ingredients" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Crear Nuevo
            </Button>
          </RequirePermission>
        </Stack>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          placeholder="Buscar bebidas"
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
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredDrinks.length} {filteredDrinks.length === 1 ? 'bebida' : 'bebidas'}
        </Typography>
      </Grid>

      {filteredDrinks.map((drink) => (
        <Grid item xs={12} md={6} key={drink._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{drink.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {drink.categoryName ?? '—'} · <Typography component="span" variant="body2" fontFamily="monospace">{drink.sku}</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Punto de pedido: {drink.reorderPoint} u
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <RequirePermission resource="ingredients" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(drink)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="ingredients" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(drink)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              {...register('name', { required: true })}
            />
            {isEditMode ? (
              // En edición: mostrar SKU y categoría como solo lectura
              <Stack spacing={2}>
                <TextField
                  label="Categoría"
                  value={getValues('categoryName')}
                  InputProps={{ readOnly: true }}
                  helperText="La categoría no se puede cambiar sin modificar el SKU"
                />
                <TextField
                  label="SKU"
                  value={selectedDrink?.sku ?? ''}
                  InputProps={{ readOnly: true }}
                  helperText="El SKU es inmutable"
                />
              </Stack>
            ) : (
              // En creación / duplicación: selector de categoría + preview SKU
              <Stack spacing={2}>
                <TextField
                  select
                  label="Categoría *"
                  defaultValue=""
                  {...register('categoryName', { required: true })}
                  helperText="La categoría determina el elemento del SKU"
                >
                  {BEVERAGE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({CATEGORY_ELEMENT_MAP[cat]})</Typography>
                    </MenuItem>
                  ))}
                </TextField>
                <SkuPreview
                  control={control}
                  existingSkus={existingSkus}
                />
              </Stack>
            )}
            <TextField
              label="Stock inicial (u)"
              type="number"
              {...register('stock', { valueAsNumber: true })}
            />
            <TextField
              label="Punto de pedido (u)"
              type="number"
              {...register('reorderPoint', { valueAsNumber: true })}
            />
            <Controller
              control={control}
              name="allergens"
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={commonAllergens}
                  value={value || []}
                  onChange={(_, newValue) => onChange(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={index}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Alérgenos"
                      placeholder="Seleccionar o escribir alérgenos"
                    />
                  )}
                />
              )}
            />
            <TextField label="Código artículo compra" {...register('codeArticlePurchase')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar la bebida "{confirmDelete?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDrink}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default DrinksPage;
